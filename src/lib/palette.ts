import type { RGB } from "./strokes";
import type { Vec2 } from "./types";

export function hsv2rgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

const FADE = 0.22;
const TRACK = 0.28; // how fast the wheel follows the open hand (smoothed, steady)

/**
 * The floating colour wheel. It blooms on whichever hand is held open; the
 * *other* hand's index tip hovers over it (angle = hue, distance from centre =
 * saturation) and a pinch grabs the colour. Centre + radius are heavily
 * smoothed so the wheel sits calm even though the hand behind it shakes.
 */
export class Palette {
  open = false;
  amount = 0; // 0..1 fade
  center: Vec2 = { x: 0, y: 0 };
  radius = 130;
  hover: { color: RGB; pos: Vec2 } | null = null;

  private tCenter: Vec2 = { x: 0, y: 0 };
  private tRadius = 130;
  private placed = false;
  private onPick: (c: RGB) => void;

  constructor(onPick: (c: RGB) => void) {
    this.onPick = onPick;
  }

  /** Open the wheel at a fixed screen point with an explicit radius. */
  show(center: Vec2, radius: number) {
    this.open = true;
    this.tCenter = { x: center.x, y: center.y };
    this.tRadius = radius;
    if (!this.placed) {
      this.center = { x: center.x, y: center.y };
      this.radius = this.tRadius;
      this.placed = true;
    }
  }

  hide() {
    this.open = false;
    this.hover = null;
  }

  /** Is a point over the (faded-in) wheel? */
  inside(p: Vec2): boolean {
    if (this.amount < 0.4) return false;
    return Math.hypot(p.x - this.center.x, p.y - this.center.y) <= this.radius;
  }

  /** Update the hovered colour from the picker fingertip. */
  updateHover(tip: Vec2) {
    const dx = tip.x - this.center.x;
    const dy = tip.y - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d > this.radius) {
      this.hover = null;
      return;
    }
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° up, clockwise
    const hue = (angle + 360) % 360;
    const sat = Math.min(1, d / this.radius);
    this.hover = { color: hsv2rgb(hue, sat, 1), pos: { x: tip.x, y: tip.y } };
  }

  /** Commit the hovered colour (called on a pinch over the wheel). */
  grab(): boolean {
    if (!this.hover) return false;
    this.onPick(this.hover.color);
    return true;
  }

  /** Ease fade + position each frame. */
  tick() {
    const target = this.open ? 1 : 0;
    this.amount += (target - this.amount) * FADE;
    if (this.open) {
      this.center.x += (this.tCenter.x - this.center.x) * TRACK;
      this.center.y += (this.tCenter.y - this.center.y) * TRACK;
      this.radius += (this.tRadius - this.radius) * TRACK;
    } else if (this.amount < 0.01) {
      this.amount = 0;
      this.placed = false;
    }
  }
}
