import { hsv2rgb, type Palette } from "./palette";
import type { RGB, Stroke, StrokeStore } from "./strokes";
import type { Vec2 } from "./types";

export type CursorMode = "hover" | "draw" | "erase";

export interface Cursor {
  pos: Vec2;
  color: RGB;
  mode: CursorMode;
  radius?: number;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// Quadratic through segment midpoints — C1-smooth and, crucially, it never
// overshoots the points (a Catmull-Rom spline loops on noisy hand data). Reads
// as a clean continuous line.
function buildPath(pts: Vec2[]): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n === 0) return p;
  p.moveTo(pts[0].x, pts[0].y);
  if (n === 1) {
    p.lineTo(pts[0].x + 0.01, pts[0].y);
    return p;
  }
  if (n === 2) {
    p.lineTo(pts[1].x, pts[1].y);
    return p;
  }
  for (let i = 1; i < n - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    p.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  p.lineTo(pts[n - 1].x, pts[n - 1].y);
  return p;
}

/** Lay a single neon stroke down in four passes: halo → glow → body → hot core. */
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const path = buildPath(s.pts);
  const w = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = rgba(s.color, 1);

  ctx.shadowBlur = w * 2.4;
  ctx.lineWidth = w * 2.6;
  ctx.strokeStyle = rgba(s.color, 0.16);
  ctx.stroke(path);

  ctx.shadowBlur = w * 1.1;
  ctx.lineWidth = w * 1.5;
  ctx.strokeStyle = rgba(s.color, 0.5);
  ctx.stroke(path);

  ctx.shadowBlur = 0;
  ctx.lineWidth = w;
  ctx.strokeStyle = rgba(s.color, 0.95);
  ctx.stroke(path);

  ctx.lineWidth = Math.max(1, w * 0.4);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke(path);
}

export class Renderer {
  private bake: HTMLCanvasElement | null = null;
  private bakeCtx: CanvasRenderingContext2D | null = null;
  private bakedCount = 0;
  private dpr = 1;
  private wheel: HTMLCanvasElement | null = null;

  resize(cw: number, ch: number, dpr: number) {
    this.dpr = dpr;
    const bake = this.bake ?? document.createElement("canvas");
    bake.width = Math.round(cw * dpr);
    bake.height = Math.round(ch * dpr);
    const bctx = bake.getContext("2d");
    if (bctx) {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.globalCompositeOperation = "lighter";
    }
    this.bake = bake;
    this.bakeCtx = bctx;
    this.bakedCount = 0;
  }

  private wheelSprite(): HTMLCanvasElement {
    if (this.wheel) return this.wheel;
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const cx = c.getContext("2d")!;
    const img = cx.createImageData(size, size);
    const r0 = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - r0;
        const dy = y - r0;
        const d = Math.hypot(dx, dy) / r0;
        const i = (y * size + x) * 4;
        if (d > 1) {
          img.data[i + 3] = 0;
          continue;
        }
        const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const [r, g, b] = hsv2rgb(hue, Math.min(1, d), 1);
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = d > 0.985 ? Math.round(((1 - d) / 0.015) * 255) : 255;
      }
    }
    cx.putImageData(img, 0, 0);
    this.wheel = c;
    return c;
  }

  private drawWheel(ctx: CanvasRenderingContext2D, pal: Palette) {
    const { center, radius, amount } = pal;
    if (amount <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = amount;

    ctx.shadowColor = "rgba(120,180,255,0.6)";
    ctx.shadowBlur = 28 * amount;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8,10,16,0.5)";
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = amount * 0.95;
    ctx.drawImage(
      this.wheelSprite(),
      center.x - radius,
      center.y - radius,
      radius * 2,
      radius * 2,
    );

    ctx.globalAlpha = amount;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (pal.hover) {
      const h = pal.hover.pos;
      // pulse ring inviting the pinch
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(h.x, h.y, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(h.x, h.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = rgba(pal.hover.color, 1);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCursor(ctx: CanvasRenderingContext2D, cur: Cursor) {
    const { pos, color, mode } = cur;
    ctx.save();
    if (mode === "erase") {
      const r = cur.radius ?? 26;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,120,150,0.95)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,120,150,0.1)";
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = rgba(color, 1);
    if (mode === "draw") {
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
    } else {
      // hover — a hollow ring so you can aim before you pinch
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.9);
      ctx.fill();
    }
    ctx.restore();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    store: StrokeStore,
    pal: Palette,
    cursors: Cursor[],
    cw: number,
    ch: number,
  ) {
    const bctx = this.bakeCtx;
    const bake = this.bake;
    if (!bctx || !bake) return;

    if (store.dirty) {
      bctx.clearRect(0, 0, cw, ch);
      this.bakedCount = 0;
      store.dirty = false;
    }
    while (this.bakedCount < store.committed.length) {
      drawStroke(bctx, store.committed[this.bakedCount]);
      this.bakedCount++;
    }

    ctx.clearRect(0, 0, cw, ch);

    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(bake, 0, 0, cw, ch);
    for (const s of store.live) {
      if (s && s.pts.length) drawStroke(ctx, s);
    }
    ctx.shadowBlur = 0;

    ctx.globalCompositeOperation = "source-over";
    for (const cur of cursors) this.drawCursor(ctx, cur);
    this.drawWheel(ctx, pal);
    ctx.globalCompositeOperation = "source-over";
  }
}
