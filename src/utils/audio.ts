import { SCANNER_BEEP_DATA_URL } from './scannerSoundData';

// High-performance audio synthesizer & retail scanner audio engine using Web Audio API
class SoundFx {
  private ctx: AudioContext | null = null;
  private scannerBuffer: AudioBuffer | null = null;
  private isDecodingScannerBuffer = false;
  private scannerHtmlAudio: HTMLAudioElement | null = null;
  public isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('sokopos_sound_muted');
        if (savedMute === 'true') {
          this.isMuted = true;
        }
        this.scannerHtmlAudio = new Audio(SCANNER_BEEP_DATA_URL);
        this.scannerHtmlAudio.preload = 'auto';
      } catch {
        // Audio element not permitted yet
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sokopos_sound_muted', muted ? 'true' : 'false');
      }
    } catch {
      // ignore storage error
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initScannerBuffer(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Pre-decode scanner sound into Web Audio RAM for zero-latency instant playback
  private async initScannerBuffer(ctx: AudioContext) {
    if (this.scannerBuffer || this.isDecodingScannerBuffer) return;
    this.isDecodingScannerBuffer = true;

    try {
      // Decode base64 into ArrayBuffer
      const base64Data = SCANNER_BEEP_DATA_URL.split(',')[1];
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      this.scannerBuffer = await ctx.decodeAudioData(bytes.buffer);
    } catch {
      // Fallback: Generate piezo buffer mathematically if decodeAudioData fails
      try {
        const sampleRate = ctx.sampleRate || 44100;
        const duration = 0.085;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        const freq1 = 2850;
        const freq2 = 5700;
        const freq3 = 8550;
        const attackSamples = Math.floor(sampleRate * 0.003);
        const decaySamples = Math.floor(sampleRate * 0.015);
        const sustainSamples = numSamples - attackSamples - decaySamples;

        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          let envelope = 1.0;
          if (i < attackSamples) {
            envelope = i / attackSamples;
          } else if (i >= attackSamples + sustainSamples) {
            const decayIdx = i - (attackSamples + sustainSamples);
            envelope = Math.max(0, 1.0 - decayIdx / decaySamples);
            envelope = Math.pow(envelope, 1.5);
          }
          const val1 = Math.sin(2 * Math.PI * freq1 * t);
          const val2 = Math.sin(2 * Math.PI * freq2 * t);
          const val3 = Math.sin(2 * Math.PI * freq3 * t);
          data[i] = (val1 * 0.82 + val2 * 0.14 + val3 * 0.04) * envelope * 0.7;
        }
        this.scannerBuffer = buffer;
      } catch {
        // Ignore fallback errors
      }
    } finally {
      this.isDecodingScannerBuffer = false;
    }
  }

  // Laser barcode scanner sound (replaces old generic beep with authentic attached scanner sound)
  playBarcodeBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();

      // Primary zero-latency method: Web Audio AudioBufferSourceNode
      if (ctx && this.scannerBuffer) {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = this.scannerBuffer;
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }

      // Secondary method: Pre-loaded HTMLAudioElement
      if (this.scannerHtmlAudio) {
        try {
          this.scannerHtmlAudio.currentTime = 0;
          const playPromise = this.scannerHtmlAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              this.playSynthesizedScannerBeep(ctx);
            });
          }
          return;
        } catch {
          // Fall through to synthesized beep
        }
      }

      // Fallback method: Live harmonic synthesis matching 2850Hz retail scanner pitch
      this.playSynthesizedScannerBeep(ctx);
    } catch {
      // Audio playback restrictions handled gracefully
    }
  }

  // Live multi-harmonic piezo synthesizer replicating authentic Zebra/Honeywell barcode scanner tone
  private playSynthesizedScannerBeep(ctx: AudioContext | null) {
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const duration = 0.085;

      // Primary tone (2850 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2850, now);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + duration);

      // Piezo acoustic overtone (5700 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(5700, now);
      gain2.gain.setValueAtTime(0.06, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + duration);
    } catch {
      // Ignore
    }
  }

  // Alias for explicit scanner sound calls
  playScannerSound() {
    this.playBarcodeBeep();
  }

  // Neutral UI Feedback (Barcode scan / button tap) - crisp wood tick (<70ms)
  playBeep(frequency = 680, duration = 0.065) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio restriction errors
    }
  }

  // Transaction Success Chime (Sale completed / cash drawer release) - warm major third harmony (<180ms)
  playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [520, 784]; // Warm fundamental + major fifth interval
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.16);
      });
    } catch {
      // Ignore
    }
  }

  // Error / Rejection Tone (Invalid action / blocked tender) - tactile low thud (<140ms)
  playErrorTone() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.13);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }

  // Attention / Alert Tone (Low stock / warning) - gentle dual pulse (<220ms)
  playAlertTone() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [0, 0.1].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now + delay);
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
    } catch {
      // Ignore
    }
  }

  playSuccess() {
    this.playSuccessChime();
  }

  playChime() {
    this.playSuccessChime();
  }

  playPaymentSuccess() {
    this.playSuccessChime();
  }

  playError() {
    this.playErrorTone();
  }
}

export const soundFx = new SoundFx();

