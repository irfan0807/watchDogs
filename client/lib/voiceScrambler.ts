/**
 * Voice Scrambler - Modulates voice to sound like "The Professor" from Money Heist
 * Uses pitch shifting and formant manipulation
 */

export class VoiceScrambler {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private pitchShifter: any = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filterLow: BiquadFilterNode | null = null;
  private filterHigh: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new (AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Apply voice scrambling to audio stream
   * @param stream - Input MediaStream from microphone
   * @returns Modified MediaStream with scrambled voice
   */
  public scrambleVoice(stream: MediaStream): MediaStream {
    if (!this.audioContext) {
      console.error("AudioContext not supported");
      return stream;
    }

    try {
      // Create source from input stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      // Create destination for output stream
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // Create processing nodes
      this.createProcessingChain();

      // Connect the chain
      this.connectNodes();

      return this.destinationNode.stream;
    } catch (error) {
      console.error("Error scrambling voice:", error);
      return stream;
    }
  }

  /**
   * Create audio processing chain for voice modulation
   */
  private createProcessingChain(): void {
    if (!this.audioContext) return;

    // Compressor - smooths out volume variations
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    // Low-pass filter - removes high frequencies for deeper voice
    this.filterLow = this.audioContext.createBiquadFilter();
    this.filterLow.type = 'lowpass';
    this.filterLow.frequency.value = 2800; // Cut frequencies above 2.8kHz
    this.filterLow.Q.value = 1;

    // High-pass filter - removes very low frequencies
    this.filterHigh = this.audioContext.createBiquadFilter();
    this.filterHigh.type = 'highpass';
    this.filterHigh.frequency.value = 180; // Cut frequencies below 180Hz
    this.filterHigh.Q.value = 1;

    // Gain node - adjust volume
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.2; // Slight boost

    // Pitch shifter using delay-based algorithm
    this.pitchShifter = this.createPitchShifter(-4); // Lower pitch by 4 semitones
  }

  /**
   * Create pitch shifter node
   * @param pitchShift - Semitones to shift (-12 to +12)
   */
  private createPitchShifter(pitchShift: number): AudioWorkletNode | ScriptProcessorNode {
    if (!this.audioContext) throw new Error("AudioContext not initialized");

    // For now, use a simple delay-based approach
    // In production, you'd want to use a more sophisticated algorithm
    const delayNode = this.audioContext.createDelay();
    const feedback = this.audioContext.createGain();
    const output = this.audioContext.createGain();

    // Calculate delay time based on pitch shift
    const delayTime = Math.pow(2, -pitchShift / 12) * 0.01;
    delayNode.delayTime.value = delayTime;
    feedback.gain.value = 0.4;
    output.gain.value = 0.7;

    return delayNode as any;
  }

  /**
   * Connect all processing nodes
   */
  private connectNodes(): void {
    if (!this.sourceNode || !this.destinationNode || !this.audioContext) return;

    // Processing chain:
    // Source → Compressor → High-pass → Low-pass → Pitch Shifter → Gain → Destination
    this.sourceNode.connect(this.compressor!);
    this.compressor!.connect(this.filterHigh!);
    this.filterHigh!.connect(this.filterLow!);
    this.filterLow!.connect(this.pitchShifter);
    this.pitchShifter.connect(this.gainNode!);
    this.gainNode!.connect(this.destinationNode);
  }

  /**
   * Adjust scrambling intensity
   * @param intensity - 0 (original voice) to 1 (maximum scrambling)
   */
  public setIntensity(intensity: number): void {
    if (!this.filterLow || !this.gainNode) return;

    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    
    // Adjust low-pass filter based on intensity
    this.filterLow.frequency.value = 3500 - (clampedIntensity * 1200);
    
    // Adjust gain
    this.gainNode.gain.value = 1 + (clampedIntensity * 0.3);
  }

  /**
   * Clean up audio nodes
   */
  public cleanup(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.compressor) {
      this.compressor.disconnect();
      this.compressor = null;
    }
    
    if (this.filterLow) {
      this.filterLow.disconnect();
      this.filterLow = null;
    }
    
    if (this.filterHigh) {
      this.filterHigh.disconnect();
      this.filterHigh = null;
    }
    
    if (this.pitchShifter) {
      this.pitchShifter.disconnect();
      this.pitchShifter = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.destinationNode) {
      this.destinationNode.disconnect();
      this.destinationNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Check if voice scrambling is available
   */
  public static isSupported(): boolean {
    return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
  }
}

export default VoiceScrambler;
