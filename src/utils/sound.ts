/**
 * Web Audio API synthesizer for authentic Korean Janggi sound effects
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('janggi_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('janggi_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Crisp Korean wooden piece placement ('탁!')
   */
  public playPlacePiece() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);

    // Add wooden click noise
    this.playNoiseClick(t, 0.04, 0.4);
  }

  /**
   * Capture sound (heavier wooden impact)
   */
  public playCapture() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.16);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);

    this.playNoiseClick(t, 0.08, 0.7);
  }

  /**
   * Check sound ('장군!' - resonant traditional brass bell gong)
   */
  public playCheck() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [440, 660, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.8);
    });
  }

  /**
   * Victory sound ('외통!' / 승리 - triumphant traditional chord)
   */
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392, 440, 523.25, 659.25, 783.99]; // Sol, La, Do, Mi, Sol (Pentatonic)
    notes.forEach((freq, i) => {
      const delay = i * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.3, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + delay);
      osc.stop(t + delay + 0.6);
    });
  }

  /**
   * Pass turn ('한수쉼')
   */
  public playPass() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Countdown warning tick
   */
  public playTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  private playNoiseClick(startTime: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }
}

export const soundManager = new SoundManager();
