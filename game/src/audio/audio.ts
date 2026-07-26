import { clamp } from '../core/math';
import { save } from '../core/save';

/**
 * Everything is synthesised — the build ships zero audio files. The drone is a
 * pair of detuned saws through a lowpass; Dread opens the filter, raises the
 * dissonance and fades a heartbeat in underneath. Silence is used deliberately:
 * a Hunter spawn cuts everything for a beat before the low end returns.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private droneGain!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private oscA!: OscillatorNode;
  private oscB!: OscillatorNode;
  private beatGain!: GainNode;
  private started = false;
  private beatTimer = 0;
  private beatPeriod = 1.2;
  private duckUntil = 0;
  /** Throttles the per-hit blip so 400 hits a second do not turn into a buzzsaw. */
  private lastBlip = 0;

  get muted() {
    return save.muted;
  }

  /** Must be called from inside a real user gesture or iOS refuses to start. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    } catch {
      return;
    }

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = save.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 3;

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneFilter.connect(this.droneGain).connect(this.master);

    this.oscA = ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscA.frequency.value = 46;
    this.oscB = ctx.createOscillator();
    this.oscB.type = 'sawtooth';
    this.oscB.frequency.value = 46.7;
    this.oscA.connect(this.droneFilter);
    this.oscB.connect(this.droneFilter);
    this.oscA.start();
    this.oscB.start();

    this.beatGain = ctx.createGain();
    this.beatGain.gain.value = 0;
    this.beatGain.connect(this.master);
  }

  setMuted(m: boolean) {
    save.muted = m;
    if (this.ctx) this.master.gain.value = m ? 0 : 0.9;
  }

  private get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Short envelope helper — every sfx in the game is one of these. */
  private blip(
    type: OscillatorType,
    freq: number,
    endFreq: number,
    dur: number,
    vol: number,
    delay = 0,
  ) {
    const ctx = this.ctx;
    if (!ctx || save.muted) return;
    const t = this.now + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || save.muted) return;
    const t = this.now + delay;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  // ── Run-level ambience ─────────────────────────────────────────────

  startRun() {
    this.started = true;
    if (!this.ctx) return;
    this.droneGain.gain.setTargetAtTime(0.06, this.now, 1.4);
  }

  stopRun() {
    this.started = false;
    if (!this.ctx) return;
    this.droneGain.gain.setTargetAtTime(0, this.now, 0.5);
    this.beatGain.gain.setTargetAtTime(0, this.now, 0.4);
  }

  /** Called every frame with current Dread so the bed tracks the meter. */
  update(dread: number, dt: number) {
    if (!this.ctx || !this.started) return;
    const d = clamp(dread / 100, 0, 1);
    const t = this.now;

    if (t < this.duckUntil) return;

    this.droneFilter.frequency.setTargetAtTime(200 + d * 900, t, 0.6);
    this.droneGain.gain.setTargetAtTime(0.055 + d * 0.075, t, 0.8);
    // The two saws drift apart as Dread climbs — the bed literally sours.
    this.oscB.frequency.setTargetAtTime(46.7 + d * 4.2, t, 1.0);

    // Heartbeat fades in from the halfway band and accelerates.
    if (d > 0.45) {
      this.beatPeriod = 1.15 - (d - 0.45) * 0.95;
      this.beatTimer -= dt;
      if (this.beatTimer <= 0) {
        this.beatTimer = this.beatPeriod;
        const vol = (d - 0.45) * 0.5;
        this.blip('sine', 62, 30, 0.15, vol);
        this.blip('sine', 55, 26, 0.19, vol * 0.72, 0.19);
      }
    }
  }

  // ── One-shots ──────────────────────────────────────────────────────

  zap() {
    this.noise(0.07, 0.05, 2600);
  }
  shot() {
    this.blip('square', 420, 180, 0.05, 0.035);
  }
  swipe() {
    this.noise(0.13, 0.06, 900);
  }
  thunder() {
    this.noise(0.34, 0.13, 320);
    this.blip('sine', 90, 34, 0.32, 0.1);
  }

  hit() {
    const t = this.now;
    if (t - this.lastBlip < 0.045) return;
    this.lastBlip = t;
    this.blip('triangle', 200 + Math.random() * 90, 90, 0.045, 0.03);
  }

  kill() {
    this.noise(0.09, 0.045, 1500);
  }

  hurt() {
    this.blip('sawtooth', 180, 48, 0.26, 0.16);
    this.noise(0.16, 0.1, 420);
  }

  pickup() {
    this.blip('sine', 780, 1180, 0.05, 0.022);
  }

  levelUp() {
    this.blip('sine', 520, 780, 0.16, 0.09);
    this.blip('sine', 780, 1170, 0.22, 0.07, 0.1);
  }

  /** The Pact sting: an ugly interval that resolves nowhere. */
  pact() {
    this.blip('sawtooth', 150, 138, 0.9, 0.09);
    this.blip('sawtooth', 212, 196, 0.9, 0.07);
    this.noise(0.5, 0.05, 240);
  }

  dreadBand() {
    this.blip('sine', 120, 58, 0.7, 0.07);
    this.noise(0.4, 0.035, 180);
  }

  /** Cuts the bed dead for a beat, then slams the low end back in. */
  hunterSpawn() {
    if (!this.ctx) return;
    const t = this.now;
    this.duckUntil = t + 1.6;
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
    this.droneGain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
    this.droneGain.gain.setValueAtTime(0.0001, t + 1.5);
    this.droneGain.gain.linearRampToValueAtTime(0.2, t + 1.85);
    this.blip('sawtooth', 240, 28, 1.5, 0.22, 1.5);
    this.noise(1.1, 0.14, 140, 1.5);
  }

  boss() {
    this.blip('sawtooth', 110, 40, 1.1, 0.16);
    this.noise(0.8, 0.1, 200);
  }

  death() {
    this.blip('sawtooth', 200, 22, 1.5, 0.2);
    this.noise(1.2, 0.12, 160);
  }

  extract() {
    this.blip('sine', 400, 600, 0.3, 0.11);
    this.blip('sine', 600, 900, 0.4, 0.09, 0.16);
    this.blip('sine', 800, 1200, 0.6, 0.08, 0.34);
  }

  ui() {
    this.blip('square', 300, 300, 0.03, 0.02);
  }
}

export const audio = new Audio();
