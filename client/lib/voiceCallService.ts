import { Platform } from "react-native";
import { getSocket } from "./socket";
import VoiceScrambler from "./voiceScrambler";

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface CallState {
  status: CallStatus;
  callerId?: string;
  calleeId?: string;
  isIncoming?: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVoiceScramblerEnabled: boolean;
}

class VoiceCallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private voiceScrambler: VoiceScrambler | null = null;
  private scrambledStream: MediaStream | null = null;
  
  private callState: CallState = {
    status: "idle",
    isVideoEnabled: false,
    isAudioEnabled: true,
    isVoiceScramblerEnabled: true,
  };

  private onStateChangeCallback?: (state: CallState) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;

  // ICE servers for WebRTC connection
  private iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  constructor() {
    this.setupSocketListeners();
  }

  /**
   * Setup Socket.IO listeners for call signaling
   */
  private setupSocketListeners(): void {
    const socket = getSocket();

    socket.on("call:incoming", this.handleIncomingCall.bind(this));
    socket.on("call:answer", this.handleCallAnswer.bind(this));
    socket.on("call:ice-candidate", this.handleIceCandidate.bind(this));
    socket.on("call:ended", this.handleCallEnded.bind(this));
    socket.on("call:rejected", this.handleCallRejected.bind(this));
  }

  /**
   * Set callback for state changes
   */
  public onStateChange(callback: (state: CallState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Set callback for remote stream
   */
  public onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Update call state
   */
  private updateState(updates: Partial<CallState>): void {
    this.callState = { ...this.callState, ...updates };
    this.onStateChangeCallback?.(this.callState);
  }

  /**
   * Initiate a call to another user
   */
  public async initiateCall(userId: string, contactId: string): Promise<void> {
    try {
      this.updateState({ status: "calling", callerId: userId, calleeId: contactId });

      // Get local media stream
      await this.getLocalStream();

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream) {
        const streamToAdd = this.callState.isVoiceScramblerEnabled && this.scrambledStream
          ? this.scrambledStream
          : this.localStream;

        streamToAdd.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, streamToAdd);
        });
      }

      // Create offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callState.isVideoEnabled,
      });

      await this.peerConnection!.setLocalDescription(offer);

      // Send offer to callee via Socket.IO
      const socket = getSocket();
      socket.emit("call:offer", {
        from: userId,
        to: contactId,
        offer: offer,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      this.endCall();
    }
  }

  /**
   * Handle incoming call
   */
  private async handleIncomingCall(data: { from: string; offer: RTCSessionDescriptionInit }): Promise<void> {
    this.updateState({
      status: "ringing",
      callerId: data.from,
      isIncoming: true,
    });
  }

  /**
   * Answer incoming call
   */
  public async answerCall(userId: string): Promise<void> {
    try {
      this.updateState({ status: "connecting" } as any);

      // Get local media stream
      await this.getLocalStream();

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream) {
        const streamToAdd = this.callState.isVoiceScramblerEnabled && this.scrambledStream
          ? this.scrambledStream
          : this.localStream;

        streamToAdd.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, streamToAdd);
        });
      }

      // Set remote description (offer from caller)
      const socket = getSocket();
      socket.once("call:get-offer", async (offer: RTCSessionDescriptionInit) => {
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

        // Create answer
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);

        // Send answer to caller
        socket.emit("call:answer", {
          from: userId,
          to: this.callState.callerId,
          answer: answer,
        });

        this.updateState({ status: "connected" });
      });

      socket.emit("call:request-offer", { to: this.callState.callerId });
    } catch (error) {
      console.error("Error answering call:", error);
      this.endCall();
    }
  }

  /**
   * Handle call answer from callee
   */
  private async handleCallAnswer(data: { from: string; answer: RTCSessionDescriptionInit }): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(data.answer));
      this.updateState({ status: "connected" });
    } catch (error) {
      console.error("Error handling call answer:", error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(data: { candidate: RTCIceCandidateInit }): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  /**
   * Reject incoming call
   */
  public rejectCall(userId: string): void {
    const socket = getSocket();
    socket.emit("call:reject", {
      from: userId,
      to: this.callState.callerId,
    });

    this.cleanup();
  }

  /**
   * Handle call rejection
   */
  private handleCallRejected(): void {
    this.updateState({ status: "ended" });
    this.cleanup();
  }

  /**
   * End active call
   */
  public endCall(): void {
    const socket = getSocket();
    
    if (this.callState.callerId && this.callState.calleeId) {
      socket.emit("call:end", {
        from: this.callState.callerId,
        to: this.callState.calleeId,
      });
    }

    this.cleanup();
  }

  /**
   * Handle call ended by remote peer
   */
  private handleCallEnded(): void {
    this.updateState({ status: "ended" });
    this.cleanup();
  }

  /**
   * Get local media stream
   */
  private async getLocalStream(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: this.callState.isVideoEnabled,
        });

        // Apply voice scrambler if enabled
        if (this.callState.isVoiceScramblerEnabled && VoiceScrambler.isSupported()) {
          this.voiceScrambler = new VoiceScrambler();
          this.scrambledStream = this.voiceScrambler.scrambleVoice(this.localStream);
        }
      } else {
        // For React Native, use react-native-webrtc
        const { mediaDevices } = require("react-native-webrtc");
        this.localStream = await mediaDevices.getUserMedia({
          audio: true,
          video: this.callState.isVideoEnabled,
        });
        // Note: Voice scrambling on mobile would require native audio processing
      }
    } catch (error) {
      console.error("Error getting local stream:", error);
      throw error;
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private createPeerConnection(): void {
    if (Platform.OS === "web") {
      this.peerConnection = new RTCPeerConnection(this.iceServers);
    } else {
      const { RTCPeerConnection } = require("react-native-webrtc");
      this.peerConnection = new RTCPeerConnection(this.iceServers);
    }

    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket.emit("call:ice-candidate", {
          to: this.callState.isIncoming ? this.callState.callerId : this.callState.calleeId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStreamCallback?.(this.remoteStream);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === "connected") {
        this.updateState({ status: "connected" });
      } else if (
        this.peerConnection?.connectionState === "failed" ||
        this.peerConnection?.connectionState === "disconnected"
      ) {
        this.endCall();
      }
    };
  }

  /**
   * Toggle voice scrambler
   */
  public toggleVoiceScrambler(): void {
    const newState = !this.callState.isVoiceScramblerEnabled;
    this.updateState({ isVoiceScramblerEnabled: newState });

    if (Platform.OS === "web" && this.peerConnection && this.localStream) {
      // Re-add tracks with/without scrambling
      const senders = this.peerConnection.getSenders();
      senders.forEach((sender) => {
        if (sender.track?.kind === "audio") {
          const newStream = newState && this.scrambledStream ? this.scrambledStream : this.localStream;
          const audioTrack = newStream?.getAudioTracks()[0];
          if (audioTrack) {
            sender.replaceTrack(audioTrack);
          }
        }
      });
    }
  }

  /**
   * Toggle microphone
   */
  public toggleMicrophone(): void {
    const newState = !this.callState.isAudioEnabled;
    this.updateState({ isAudioEnabled: newState });

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = newState;
      });
    }
  }

  /**
   * Get current call state
   */
  public getState(): CallState {
    return this.callState;
  }

  /**
   * Get remote stream
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop scrambled stream
    if (this.scrambledStream) {
      this.scrambledStream.getTracks().forEach((track) => track.stop());
      this.scrambledStream = null;
    }

    // Cleanup voice scrambler
    if (this.voiceScrambler) {
      this.voiceScrambler.cleanup();
      this.voiceScrambler = null;
    }

    // Reset remote stream
    this.remoteStream = null;

    this.updateState({
      status: "idle",
      callerId: undefined,
      calleeId: undefined,
      isIncoming: undefined,
    });
  }
}

// Singleton instance
export const voiceCallService = new VoiceCallService();

export default voiceCallService;
