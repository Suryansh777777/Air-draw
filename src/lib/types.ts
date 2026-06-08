export interface Vec2 {
  x: number;
  y: number;
}

/** One detected hand resolved to screen-space pixels. */
export interface HandFrame {
  points: Vec2[]; // length 21
  present: boolean;
}
