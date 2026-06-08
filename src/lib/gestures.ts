import type { Vec2 } from "./types";

// MediaPipe 21-landmark hand model:
//   wrist 0 · thumb 1-4 · index 5-8 · middle 9-12 · ring 13-16 · pinky 17-20
// Each finger's [MCP, PIP, DIP, TIP]:
const FINGERS = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
} as const;

export const INDEX_TIP = 8;
const THUMB_TIP = 4;

export interface FingerStates {
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Rough hand size in px — wrist→middle-MCP. Used to normalise thresholds. */
export function handSpan(p: Vec2[]): number {
  return Math.max(1, dist(p[0], p[9]));
}

/** Palm centre — averaged across wrist + the four MCP knuckles. */
export function palmCenter(p: Vec2[]): Vec2 {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const i of ids) {
    x += p[i].x;
    y += p[i].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

// A finger reads "extended" when its tip sits farther from the wrist than its
// PIP joint — curling pulls the tip back toward the palm, flipping the sign.
function extended(p: Vec2[], joints: readonly number[]): boolean {
  const wrist = p[0];
  return dist(p[joints[3]], wrist) > dist(p[joints[1]], wrist) * 1.05;
}

export function fingerStates(p: Vec2[]): FingerStates {
  return {
    index: extended(p, FINGERS.index),
    middle: extended(p, FINGERS.middle),
    ring: extended(p, FINGERS.ring),
    pinky: extended(p, FINGERS.pinky),
  };
}

/**
 * Pinch amount = thumb-tip → index-tip distance, normalised by hand size.
 * ~0.2 fully pinched, ~1.0 wide open. Drawing gates on this with hysteresis,
 * which is FAR steadier than reading a static finger pose.
 */
export function pinchRatio(p: Vec2[]): number {
  return dist(p[THUMB_TIP], p[INDEX_TIP]) / handSpan(p);
}

/** Open palm — all four fingers out (summons the colour wheel). */
export function isOpenPalm(fs: FingerStates): boolean {
  return fs.index && fs.middle && fs.ring && fs.pinky;
}

/** Two fingers (index + middle, ring + pinky down) — the eraser. */
export function isTwoFinger(fs: FingerStates): boolean {
  return fs.index && fs.middle && !fs.ring && !fs.pinky;
}
