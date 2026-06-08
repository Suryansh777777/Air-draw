// Fully synthesized audio — no asset files. Each pen gets a soft two-oscillator
// voice whose pitch tracks how high the hand is and whose volume tracks speed,
// so drawing "sings". A short feedback delay gives it air. Picking a colour
// plays a clean little tick.

const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic — always pleasant
const ROOT = 196; // G3

function quantize(t: number): number {
  // t in 0..1 (1 = top of frame) → a pentatonic note across ~2 octaves.
  const steps = SCALE.length * 2;
  const i = Math.min(steps - 1, Math.max(0, Math.round(t * (steps - 1))));
  const oct = Math.floor(i / SCALE.length);
  const semis = SCALE[i % SCALE.length] + 12 * oct;
  return ROOT * Math.pow(2, semis / 12);
}

interface Voice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  active: boolean;
}

export class AirAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: Voice[] = [];
  private muted = false;

  /** Must be called from a user gesture (the Begin click). */
  start() {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;

    // Subtle feedback delay for space.
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.26;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    delay.connect(fb);
    fb.connect(delay);

    master.connect(comp);
    comp.connect(ctx.destination);
    comp.connect(delay);
    delay.connect(wet);
    wet.connect(ctx.destination);

    this.master = master;

    for (let i = 0; i < 2; i++) {
      const osc1 = ctx.createOscillator();
      osc1.type = "triangle";
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.detune.value = 7;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc1.start();
      osc2.start();
      this.voices.push({ osc1, osc2, gain, active: false });
    }
  }

  resume() {
    this.ctx?.resume();
  }

  /** Drive a pen voice. `height` 0..1 (1 = top), `speed` in px/frame. */
  draw(slot: number, height: number, speed: number) {
    const v = this.voices[slot];
    if (!this.ctx || !v) return;
    const f = quantize(height);
    const t = this.ctx.currentTime;
    v.osc1.frequency.setTargetAtTime(f, t, 0.05);
    v.osc2.frequency.setTargetAtTime(f, t, 0.05);
    const vol = Math.min(0.13, 0.03 + Math.min(speed, 40) / 40 * 0.1);
    v.gain.gain.setTargetAtTime(vol, t, 0.04);
    v.active = true;
  }

  silence(slot: number) {
    const v = this.voices[slot];
    if (!this.ctx || !v || !v.active) return;
    v.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    v.active = false;
  }

  /** Short bright tick when a colour is committed. */
  tick() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.24);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  close() {
    this.ctx?.close();
    this.ctx = null;
    this.voices = [];
    this.master = null;
  }
}
