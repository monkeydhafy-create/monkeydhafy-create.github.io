/**
 * Procedural Web Audio synthesizer for Hanoi Dungeon minigames & ticket booth.
 * Uses pure browser Web Audio API (zero external audio files, zero storage access).
 */
export class DungeonSfx {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(private readonly isEnabled: () => boolean) {}

  private getContext(): AudioContext | null {
    if (!this.isEnabled() || typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const win = window as Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext ?? win.webkitAudioContext;
        if (!AudioCtor) return null;
        this.ctx = new AudioCtor();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    options?: {
      type?: OscillatorType;
      gain?: number;
      delaySec?: number;
    },
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const startAt = ctx.currentTime + (options?.delaySec ?? 0);
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const peakGain = Math.max(0.005, options?.gain ?? 0.14);

      osc.type = options?.type ?? "triangle";
      osc.frequency.setValueAtTime(Math.max(20, freqStart), startAt);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startAt + durationSec);
      }

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.linearRampToValueAtTime(peakGain, startAt + Math.min(0.012, durationSec * 0.2));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + durationSec + 0.02);
    } catch {
      // Ignore AudioContext playback blocks prior to gesture
    }
  }

  private playFilteredNoise(
    durationSec: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    options?: {
      gain?: number;
      q?: number;
      delaySec?: number;
    },
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const startAt = ctx.currentTime + (options?.delaySec ?? 0);
      const src = ctx.createBufferSource();
      src.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.Q.setValueAtTime(options?.q ?? 1.6, startAt);
      filter.frequency.setValueAtTime(Math.max(40, freqStart), startAt);
      if (freqEnd !== freqStart) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startAt + durationSec);
      }

      const gainNode = ctx.createGain();
      const peakGain = Math.max(0.005, options?.gain ?? 0.14);
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.linearRampToValueAtTime(peakGain, startAt + Math.min(0.012, durationSec * 0.25));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

      src.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      src.start(startAt);
      src.stop(startAt + durationSec + 0.02);
    } catch {
      // Ignore AudioContext playback blocks
    }
  }

  // ===================== COIN SORT MINIGAME =====================

  public playCoinAccept(isGold: boolean): void {
    if (isGold) {
      this.playTone(1568, 1661, 0.08, { type: "sine", gain: 0.16 });
      this.playTone(2093, 2217, 0.09, { type: "sine", gain: 0.15, delaySec: 0.055 });
      this.playTone(2637, 2794, 0.14, { type: "triangle", gain: 0.14, delaySec: 0.11 });
      return;
    }
    this.playTone(1318, 1760, 0.085, { type: "triangle", gain: 0.14 });
    this.playTone(1975, 2093, 0.07, { type: "sine", gain: 0.09, delaySec: 0.045 });
  }

  public playJunkDiscard(): void {
    this.playFilteredNoise(0.095, "bandpass", 650, 240, { gain: 0.14, q: 1.4 });
    this.playTone(300, 170, 0.055, { type: "triangle", gain: 0.09 });
  }

  public playCoinDiscardWrong(): void {
    this.playTone(420, 210, 0.15, { type: "triangle", gain: 0.13 });
  }

  public playJunkWrongStreak(streak: number): void {
    if (streak <= 1) {
      this.playTone(185, 130, 0.18, { type: "sawtooth", gain: 0.15 });
      return;
    }
    if (streak === 2) {
      this.playTone(155, 118, 0.24, { type: "sawtooth", gain: 0.17 });
      this.playTone(163, 124, 0.24, { type: "square", gain: 0.1, delaySec: 0.02 });
      return;
    }
    this.playTone(118, 84, 0.3, { type: "sawtooth", gain: 0.2 });
    this.playTone(126, 90, 0.3, { type: "square", gain: 0.13, delaySec: 0.015 });
    this.playFilteredNoise(0.16, "bandpass", 1100, 380, { gain: 0.16, q: 2.2 });
  }

  public playTimerTick(critical: boolean): void {
    if (!critical) {
      this.playTone(660, 580, 0.045, { type: "sine", gain: 0.032 });
      return;
    }
    this.playTone(780, 700, 0.045, { type: "sine", gain: 0.045 });
    this.playTone(520, 460, 0.05, { type: "sine", gain: 0.028, delaySec: 0.12 });
  }

  // ===================== PEANUT STEAL MINIGAME =====================

  public playChopstickPick(handCount: number): void {
    const pitch = 420 + Math.min(10, Math.max(0, handCount)) * 36;
    this.playTone(pitch, pitch * 1.18, 0.045, { type: "triangle", gain: 0.13 });
    this.playFilteredNoise(0.032, "bandpass", 1800, 1100, { gain: 0.07, q: 2.5 });
  }

  public playPeanutCrunch(): void {
    this.playFilteredNoise(0.065, "bandpass", 1950, 1200, { gain: 0.15, q: 2.0 });
    this.playFilteredNoise(0.055, "bandpass", 2400, 1450, { gain: 0.12, q: 2.4, delaySec: 0.055 });
  }

  public playSwallowOk(): void {
    this.playTone(340, 480, 0.09, { type: "sine", gain: 0.12 });
    this.playTone(510, 660, 0.1, { type: "sine", gain: 0.1, delaySec: 0.06 });
  }

  public playPaperRustleWarning(): void {
    this.playFilteredNoise(0.09, "highpass", 2600, 3400, { gain: 0.15, q: 1.2 });
    this.playFilteredNoise(0.08, "highpass", 2800, 2100, { gain: 0.13, q: 1.4, delaySec: 0.1 });
    this.playTone(115, 132, 0.22, { type: "triangle", gain: 0.11 });
  }

  public playBossPeekSnap(): void {
    this.playFilteredNoise(0.11, "bandpass", 2200, 700, { gain: 0.2, q: 1.4 });
    this.playTone(587, 622, 0.17, { type: "sawtooth", gain: 0.11, delaySec: 0.02 });
    this.playTone(830, 880, 0.19, { type: "triangle", gain: 0.12, delaySec: 0.03 });
  }

  public playBossSafeRelax(): void {
    this.playFilteredNoise(0.075, "highpass", 1800, 2400, { gain: 0.08, q: 1.1 });
    this.playTone(392, 330, 0.1, { type: "sine", gain: 0.07, delaySec: 0.03 });
  }

  public playBossCaughtSlam(): void {
    this.playTone(120, 38, 0.28, { type: "sine", gain: 0.28 });
    this.playFilteredNoise(0.2, "lowpass", 900, 180, { gain: 0.25, q: 1.0 });
    this.playTone(440, 415, 0.14, { type: "sawtooth", gain: 0.14, delaySec: 0.12 });
    this.playTone(311, 294, 0.16, { type: "sawtooth", gain: 0.14, delaySec: 0.26 });
    this.playTone(220, 175, 0.34, { type: "sawtooth", gain: 0.16, delaySec: 0.42 });
  }

  // ===================== SHARED / TICKET =====================

  public playMinigameWin(): void {
    this.playTone(523.25, 523.25, 0.1, { type: "triangle", gain: 0.14 });
    this.playTone(587.33, 587.33, 0.1, { type: "triangle", gain: 0.14, delaySec: 0.09 });
    this.playTone(783.99, 783.99, 0.11, { type: "triangle", gain: 0.15, delaySec: 0.18 });
    this.playTone(1046.5, 1046.5, 0.26, { type: "sine", gain: 0.16, delaySec: 0.28 });
  }

  public playMinigameLose(): void {
    this.playTone(329.63, 311.13, 0.13, { type: "sawtooth", gain: 0.12 });
    this.playTone(293.66, 277.18, 0.13, { type: "sawtooth", gain: 0.12, delaySec: 0.12 });
    this.playTone(261.63, 246.94, 0.14, { type: "sawtooth", gain: 0.12, delaySec: 0.24 });
    this.playTone(196.0, 165.0, 0.3, { type: "sawtooth", gain: 0.13, delaySec: 0.36 });
  }

  public playTicketPurchase(): void {
    this.playFilteredNoise(0.06, "bandpass", 1500, 900, { gain: 0.12, q: 1.5 });
    this.playTone(987.77, 1318.51, 0.12, { type: "triangle", gain: 0.13, delaySec: 0.04 });
  }

  public playBeltStart(): void {
    this.playTone(130, 290, 0.22, { type: "triangle", gain: 0.075 });
    this.playFilteredNoise(0.16, "bandpass", 520, 980, { gain: 0.05, q: 1.5 });
  }

  public playMazeJumpscare(): void {
    this.playTone(95, 32, 0.34, { type: "sine", gain: 0.34 });
    this.playTone(740, 680, 0.28, { type: "sawtooth", gain: 0.17, delaySec: 0.01 });
    this.playTone(784, 715, 0.28, { type: "sawtooth", gain: 0.15, delaySec: 0.015 });
    this.playTone(1110, 920, 0.22, { type: "square", gain: 0.12, delaySec: 0.02 });
    this.playFilteredNoise(0.24, "bandpass", 2200, 520, { gain: 0.26, q: 1.8 });
  }

  // ===================== RED RIVER SAND BARGE MINIGAMES =====================

  public playBeerGulp(): void {
    this.playTone(170, 290, 0.065, { type: "sine", gain: 0.11 });
    this.playFilteredNoise(0.04, "bandpass", 720, 480, { gain: 0.05, q: 2.2, delaySec: 0.02 });
  }

  public playBeerMugClink(): void {
    this.playTone(1720, 1680, 0.09, { type: "sine", gain: 0.14 });
    this.playTone(2340, 2290, 0.12, { type: "triangle", gain: 0.1, delaySec: 0.01 });
  }

  public playBeerCough(): void {
    this.playFilteredNoise(0.085, "bandpass", 620, 260, { gain: 0.2, q: 1.1 });
    this.playTone(135, 85, 0.09, { type: "sawtooth", gain: 0.12 });
    this.playFilteredNoise(0.085, "bandpass", 680, 250, { gain: 0.18, q: 1.2, delaySec: 0.18 });
    this.playTone(125, 78, 0.09, { type: "sawtooth", gain: 0.11, delaySec: 0.18 });
    this.playFilteredNoise(0.11, "bandpass", 590, 210, { gain: 0.17, q: 1.0, delaySec: 0.36 });
  }

  public playPaddleSplash(side: "left" | "right"): void {
    const baseFreq = side === "left" ? 640 : 720;
    this.playFilteredNoise(0.12, "bandpass", baseFreq, 240, { gain: 0.14, q: 1.3 });
    this.playTone(side === "left" ? 190 : 215, 110, 0.09, { type: "sine", gain: 0.09 });
  }

  public playBoatYawSlip(): void {
    this.playTone(280, 145, 0.14, { type: "sawtooth", gain: 0.11 });
    this.playFilteredNoise(0.14, "lowpass", 520, 180, { gain: 0.12, q: 1.2, delaySec: 0.03 });
  }

  public playRaftSignFlip(): void {
    this.playTone(540, 810, 0.06, { type: "triangle", gain: 0.11 });
    this.playFilteredNoise(0.04, "highpass", 1800, 2600, { gain: 0.06, q: 1.2 });
  }

  public playRaftSinkSplash(): void {
    this.playTone(165, 55, 0.24, { type: "sine", gain: 0.22 });
    this.playFilteredNoise(0.32, "bandpass", 950, 260, { gain: 0.24, q: 0.9, delaySec: 0.02 });
  }

  public playRaftDriftSnap(): void {
    this.playTone(260, 130, 0.08, { type: "triangle", gain: 0.12 });
    this.playFilteredNoise(0.09, "bandpass", 1400, 480, { gain: 0.13, q: 1.4, delaySec: 0.03 });
  }

  public playRaftRoundClear(): void {
    this.playTone(523.25, 659.25, 0.09, { type: "triangle", gain: 0.13 });
    this.playTone(783.99, 783.99, 0.13, { type: "sine", gain: 0.14, delaySec: 0.08 });
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.noiseBuffer = null;
  }
}
