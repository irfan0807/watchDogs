import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import voiceCallService, { CallState } from "../lib/voiceCallService";
import { useAuth } from "../context/AuthContext";

type VoiceCallScreenRouteProp = RouteProp<
  { VoiceCall: { contactId: string; contactName: string; isIncoming?: boolean } },
  "VoiceCall"
>;

export default function VoiceCallScreen() {
  const navigation = useNavigation();
  const route = useRoute<VoiceCallScreenRouteProp>();
  const { user } = useAuth();
  
  const { contactId, contactName, isIncoming } = route.params;

  const [callState, setCallState] = useState<CallState>(voiceCallService.getState());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callStartTime = useRef<number | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Setup call service listeners
    voiceCallService.onStateChange(setCallState);
    voiceCallService.onRemoteStream(setRemoteStream);

    // Start call if outgoing
    if (!isIncoming && user) {
      voiceCallService.initiateCall(user.id, contactId);
    }

    // Pulse animation for ringing state
    if (callState.status === "ringing" || callState.status === "calling") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // Start call duration timer when connected
    if (callState.status === "connected" && !callStartTime.current) {
      callStartTime.current = Date.now();
      durationInterval.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.current!) / 1000));
      }, 1000);
    }

    // Cleanup
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callState.status, isIncoming, user, contactId]);

  // Handle call state changes
  useEffect(() => {
    if (callState.status === "ended") {
      // Navigate back after call ends
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  }, [callState.status, navigation]);

  const handleAnswer = () => {
    if (user) {
      voiceCallService.answerCall(user.id);
    }
  };

  const handleReject = () => {
    if (user) {
      voiceCallService.rejectCall(user.id);
    }
    navigation.goBack();
  };

  const handleEndCall = () => {
    voiceCallService.endCall();
  };

  const toggleMicrophone = () => {
    voiceCallService.toggleMicrophone();
  };

  const toggleVoiceScrambler = () => {
    voiceCallService.toggleVoiceScrambler();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = (): string => {
    switch (callState.status) {
      case "calling":
        return "Calling...";
      case "ringing":
        return "Incoming call...";
      case "connected":
        return formatDuration(callDuration);
      case "ended":
        return "Call ended";
      default:
        return "";
    }
  };

  return (
    <View style={styles.container}>
      {/* Contact Info */}
      <View style={styles.contactInfo}>
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contactName.charAt(0).toUpperCase()}</Text>
          </View>
        </Animated.View>

        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {callState.isVoiceScramblerEnabled && callState.status === "connected" && (
          <View style={styles.scramblerBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#00ff00" />
            <Text style={styles.scramblerText}>Voice Scrambled</Text>
          </View>
        )}
      </View>

      {/* Call Controls */}
      <View style={styles.controls}>
        {callState.status === "ringing" && isIncoming ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleReject}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAnswer}>
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {callState.status === "connected" && (
              <View style={styles.activeControls}>
                <TouchableOpacity
                  style={[styles.controlButton, !callState.isAudioEnabled && styles.controlButtonMuted]}
                  onPress={toggleMicrophone}
                >
                  <Ionicons
                    name={callState.isAudioEnabled ? "mic" : "mic-off"}
                    size={28}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    callState.isVoiceScramblerEnabled && styles.controlButtonActive,
                  ]}
                  onPress={toggleVoiceScrambler}
                >
                  <Ionicons name="shield-checkmark" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {(callState.status === "calling" || callState.status === "connected") && (
              <TouchableOpacity style={[styles.button, styles.endButton]} onPress={handleEndCall}>
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Audio Elements (Web only) */}
      {Platform.OS === "web" && remoteStream && (
        <audio
          ref={(audio) => {
            if (audio && remoteStream) {
              audio.srcObject = remoteStream;
              audio.play().catch((err) => console.error("Error playing audio:", err));
            }
          }}
          autoPlay
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "space-between",
    padding: 32,
  },
  contactInfo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
  },
  contactName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    color: "#9ca3af",
    marginBottom: 16,
  },
  scramblerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00ff00",
    marginTop: 8,
  },
  scramblerText: {
    color: "#00ff00",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  controls: {
    alignItems: "center",
    marginBottom: 32,
  },
  incomingControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 32,
  },
  activeControls: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    gap: 24,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  acceptButton: {
    backgroundColor: "#10b981",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  endButton: {
    backgroundColor: "#ef4444",
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonMuted: {
    backgroundColor: "#ef4444",
  },
  controlButtonActive: {
    backgroundColor: "#10b981",
  },
});
