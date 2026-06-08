// 1€ filter — smooths noisy landmark coordinates while staying responsive.

class LowPass {
  private s = 0;
  private started = false;

  filter(x: number, alpha: number): number {
    if (!this.started) {
      this.s = x;
      this.started = true;
      return x;
    }
    this.s = alpha * x + (1 - alpha) * this.s;
    return this.s;
  }

  reset() {
    this.started = false;
  }
}

export class OneEuro {
  private xf = new LowPass();
  private dxf = new LowPass();
  private lastTime = -1;
  private lastX = 0;

  constructor(
    private minCutoff = 1.4,
    private beta = 0.012,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, t: number): number {
    if (this.lastTime < 0) {
      this.lastTime = t;
      this.lastX = x;
      return this.xf.filter(x, 1);
    }
    const dt = Math.max(1e-3, (t - this.lastTime) / 1000);
    this.lastTime = t;
    const dx = (x - this.lastX) / dt;
    this.lastX = x;
    const edx = this.dxf.filter(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xf.filter(x, this.alpha(cutoff, dt));
  }

  reset() {
    this.xf.reset();
    this.dxf.reset();
    this.lastTime = -1;
  }
}

/** Smooths every coordinate of two 21-point hands. */
export class HandSmoother {
  private filters: OneEuro[][][];

  constructor() {
    // Heavy smoothing for clean lines. Air-writing has no surface to steady
    // your hand, so the fingertip trembles — a low cutoff irons that out. This
    // does NOT bring back the "keeps writing" lag, because pen up/down is read
    // from the raw fingertips elsewhere, fully decoupled from this position
    // smoothing. Low speed (writing) → very smooth; fast flicks raise the cutoff
    // via beta so it doesn't feel sluggish.
    this.filters = [0, 1].map(() =>
      Array.from({ length: 21 }, () => [
        new OneEuro(1.0, 0.007),
        new OneEuro(1.0, 0.007),
      ]),
    );
  }

  filterX(hand: number, lm: number, x: number, t: number): number {
    return this.filters[hand][lm][0].filter(x, t);
  }

  filterY(hand: number, lm: number, y: number, t: number): number {
    return this.filters[hand][lm][1].filter(y, t);
  }

  resetHand(hand: number) {
    for (const lm of this.filters[hand]) {
      lm[0].reset();
      lm[1].reset();
    }
  }
}
