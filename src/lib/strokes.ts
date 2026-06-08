import type { Vec2 } from "./types";

export type RGB = [number, number, number];

export interface Stroke {
  pts: Vec2[];
  color: RGB;
  width: number; // CSS px, constant per stroke (neon light has even brightness)
  // bounding box, kept live for fast eraser hit-tests
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

// Capture a vertex every ~3.5px — fine enough for letters, coarse enough that
// hand tremor doesn't get baked in as zigzag. Long jumps are subdivided so the
// curve stays evenly fed.
const MIN_STEP = 3.5;
const MAX_STEP = 11;
const BASE_WIDTH = 3.6;

function newStroke(color: RGB, width: number): Stroke {
  return {
    pts: [],
    color: [...color] as RGB,
    width,
    minx: Infinity,
    miny: Infinity,
    maxx: -Infinity,
    maxy: -Infinity,
  };
}

function grow(s: Stroke, x: number, y: number) {
  s.pts.push({ x, y });
  if (x < s.minx) s.minx = x;
  if (y < s.miny) s.miny = y;
  if (x > s.maxx) s.maxx = x;
  if (y > s.maxy) s.maxy = y;
}

/**
 * Source of truth for everything drawn. Finished strokes live in `committed`
 * (the renderer bakes those once); each hand's in-progress stroke lives in
 * `live` and is redrawn every frame. `dirty` asks the renderer to rebuild its
 * bake layer after an undo / clear / erase.
 */
export class StrokeStore {
  committed: Stroke[] = [];
  live: (Stroke | null)[] = [null, null];
  dirty = false;

  begin(slot: number, color: RGB, width = BASE_WIDTH) {
    this.live[slot] = newStroke(color, width);
  }

  addPoint(slot: number, x: number, y: number) {
    const s = this.live[slot];
    if (!s) return;
    const last = s.pts[s.pts.length - 1];
    if (!last) {
      grow(s, x, y);
      return;
    }
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < MIN_STEP) return;
    // Subdivide long jumps so width + erase stay even and the spline is well fed.
    if (d > MAX_STEP) {
      const steps = Math.min(8, Math.floor(d / MAX_STEP));
      for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        grow(s, last.x + (x - last.x) * t, last.y + (y - last.y) * t);
      }
    }
    grow(s, x, y);
  }

  /** Finish the active stroke for a hand; tiny taps are dropped. */
  end(slot: number) {
    const s = this.live[slot];
    if (!s) return;
    this.live[slot] = null;
    if (s.pts.length >= 2) this.committed.push(s);
  }

  drawing(slot: number): boolean {
    return this.live[slot] !== null;
  }

  /** Remove any committed stroke passing within `r` of (x,y). Returns true if it changed. */
  eraseAt(x: number, y: number, r: number): boolean {
    let changed = false;
    this.committed = this.committed.filter((s) => {
      if (x < s.minx - r || x > s.maxx + r || y < s.miny - r || y > s.maxy + r) {
        return true;
      }
      for (const pt of s.pts) {
        if (Math.hypot(pt.x - x, pt.y - y) < r) {
          changed = true;
          return false;
        }
      }
      return true;
    });
    if (changed) this.dirty = true;
    return changed;
  }

  undo() {
    if (this.committed.length) {
      this.committed.pop();
      this.dirty = true;
    }
  }

  clear() {
    this.committed = [];
    this.live = [null, null];
    this.dirty = true;
  }
}
