"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HandTracker } from "@/lib/handTracker";
import { HandSmoother } from "@/lib/oneEuro";
import { StrokeStore, type RGB } from "@/lib/strokes";
import { Renderer, type Cursor } from "@/lib/renderer";
import { Palette } from "@/lib/palette";
import { AirAudio } from "@/lib/audio";
import { fingerStates, isTwoFinger, INDEX_TIP } from "@/lib/gestures";
import type { HandFrame, Vec2 } from "@/lib/types";
import { Intro, type Status } from "./Intro";
import { SocialLinks } from "./SocialLinks";
import { Toolbar } from "./Toolbar";

const START_COLOR: RGB = [61, 240, 255];
// Rigid absolute pinch gate, normalised by INDEX-FINGER LENGTH — not the roaming
// thumb-to-palm span, which makes an open/pointing hand look "pinched". A real
// pinch (thumb at the index tip) reads well under PINCH_ON; any open, pointing
// or relaxed hand reads above PINCH_OFF. The gap is hysteresis against flicker.
const PINCH_ON = 0.26; // thumb within 0.26 index-lengths of the tip → pen down
const PINCH_OFF = 0.36; // beyond 0.36 → pen up (your open hand reads ~0.42)
const ERASE_R = 28;
const UI_DWELL = 600; // ms a fingertip must rest on a button to fire it
const GRACE = 5; // frames a stroke survives a tracking dropout

const THUMB_TIP = 4;
const INDEX_MCP = 5;

function makeHand(): HandFrame {
  return {
    present: false,
    points: Array.from({ length: 21 }, () => ({ x: 0, y: 0 })),
  };
}

interface HandState {
  pinching: boolean;
  lost: number;
}

interface Engine {
  tracker: HandTracker;
  smoother: HandSmoother;
  store: StrokeStore;
  renderer: Renderer;
  palette: Palette;
  audio: AirAudio;
  hands: HandFrame[];
  handState: HandState[];
  pinchEMA: number[];
  wheelOpen: boolean;
  ctx: CanvasRenderingContext2D | null;
  sizing: { cw: number; ch: number };
  currentColor: RGB;
  lastTip: (Vec2 | null)[];
  ui: { action: string | null; ms: number };
  lastFrameTime: number;
  stream: MediaStream | null;
  raf: number;
  lastVideoTime: number;
}

export default function AirDrawExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [colorCss, setColorCss] = useState(
    `rgb(${START_COLOR[0]},${START_COLOR[1]},${START_COLOR[2]})`,
  );

  const sizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const e = engineRef.current;
    if (!container || !canvas || !e) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    e.sizing = { cw: rect.width, ch: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      e.ctx = ctx;
    }
    e.renderer.resize(rect.width, rect.height, dpr);
    e.store.dirty = true;
  }, []);

  const handleClear = useCallback(() => engineRef.current?.store.clear(), []);
  const handleUndo = useCallback(() => engineRef.current?.store.undo(), []);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      engineRef.current?.audio.setMuted(next);
      return next;
    });
  }, []);
  const setWheel = useCallback((open: boolean) => {
    const e = engineRef.current;
    if (e) e.wheelOpen = open;
    setWheelOpen(open);
  }, []);
  const toggleWheel = useCallback(() => {
    setWheel(!engineRef.current?.wheelOpen);
  }, [setWheel]);

  const begin = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("loading");

    if (!engineRef.current) {
      const onPick = (c: RGB) => {
        const en = engineRef.current;
        if (en) en.currentColor = c;
        setColorCss(`rgb(${c[0]},${c[1]},${c[2]})`);
        en?.audio.tick();
      };
      engineRef.current = {
        tracker: new HandTracker(),
        smoother: new HandSmoother(),
        store: new StrokeStore(),
        renderer: new Renderer(),
        palette: new Palette(onPick),
        audio: new AirAudio(),
        hands: [makeHand(), makeHand()],
        handState: [
          { pinching: false, lost: 0 },
          { pinching: false, lost: 0 },
        ],
        pinchEMA: [1, 1],
        wheelOpen: false,
        ctx: null,
        sizing: { cw: 0, ch: 0 },
        currentColor: [...START_COLOR] as RGB,
        lastTip: [null, null],
        ui: { action: null, ms: 0 },
        lastFrameTime: 0,
        stream: null,
        raf: 0,
        lastVideoTime: -1,
      };
    }
    const e = engineRef.current;

    const fire = (action: string) => {
      if (action === "undo") e.store.undo();
      else if (action === "clear") e.store.clear();
      else if (action === "mute") toggleMute();
      else if (action === "colour") {
        e.wheelOpen = !e.wheelOpen;
        setWheelOpen(e.wheelOpen);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      e.stream = stream;
      video.srcObject = stream;
      await video.play();

      sizeCanvas();
      await e.tracker.init();
      e.audio.start();
      e.audio.setMuted(muted);
      setStatus("running");

      const coverMap = (nx: number, ny: number) => {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const { cw, ch } = e.sizing;
        const s = Math.max(cw / vw, ch / vh);
        const dw = vw * s;
        const dh = vh * s;
        return { x: nx * dw + (cw - dw) / 2, y: ny * dh + (ch - dh) / 2 };
      };

      const readButtons = () => {
        const tb = toolbarRef.current;
        const container = containerRef.current;
        const out: { action: string; x: number; y: number; w: number; h: number; el: Element }[] = [];
        if (!tb || !container) return out;
        const cr = container.getBoundingClientRect();
        tb.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
          const r = el.getBoundingClientRect();
          out.push({
            action: el.dataset.action ?? "",
            x: r.left - cr.left - 14,
            y: r.top - cr.top - 14,
            w: r.width + 28,
            h: r.height + 28,
            el,
          });
        });
        return out;
      };

      const frame = (now: number) => {
        e.raf = requestAnimationFrame(frame);
        const dt = e.lastFrameTime ? Math.min(64, now - e.lastFrameTime) : 16;
        e.lastFrameTime = now;
        const { cw, ch } = e.sizing;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          if (video.currentTime !== e.lastVideoTime) {
            e.lastVideoTime = video.currentTime;
            const res = e.tracker.detect(video, now);
            e.hands[0].present = false;
            e.hands[1].present = false;
            if (res && res.landmarks.length) {
              const used = [false, false];
              res.landmarks.forEach((lm, idx) => {
                const label = res.handedness?.[idx]?.[0]?.categoryName;
                let slot = label === "Left" ? 0 : 1;
                if (used[slot]) slot = slot === 0 ? 1 : 0;
                if (used[slot]) return;
                used[slot] = true;
                const hand = e.hands[slot];

                // Pinch from RAW landmarks (no smoothing lag) → instant release.
                // Normalise by the index finger's own length (MCP→tip), which is
                // stable and local — unlike a thumb-to-palm span that explodes
                // when the thumb tucks (pointing) and falsely reads as "open".
                const t = coverMap(lm[THUMB_TIP].x, lm[THUMB_TIP].y);
                const ix = coverMap(lm[INDEX_TIP].x, lm[INDEX_TIP].y);
                const im = coverMap(lm[INDEX_MCP].x, lm[INDEX_MCP].y);
                const span = Math.max(1, Math.hypot(ix.x - im.x, ix.y - im.y));
                const raw = Math.hypot(t.x - ix.x, t.y - ix.y) / span;
                e.pinchEMA[slot] = e.pinchEMA[slot] * 0.3 + raw * 0.7;

                for (let k = 0; k < 21; k++) {
                  const m = coverMap(lm[k].x, lm[k].y);
                  hand.points[k].x = e.smoother.filterX(slot, k, m.x, now);
                  hand.points[k].y = e.smoother.filterY(slot, k, m.y, now);
                }
                hand.present = true;
              });
            }
            for (let s = 0; s < 2; s++) {
              if (!e.hands[s].present) {
                e.smoother.resetHand(s);
                e.pinchEMA[s] = 1;
              }
            }
          }
        }

        // Fixed, centred colour wheel (only when toggled open).
        const wr = Math.max(120, Math.min(230, Math.min(cw, ch) * 0.2));
        if (e.wheelOpen) e.palette.show({ x: cw * 0.5, y: ch * 0.42 }, wr);
        else e.palette.hide();

        const buttons = readButtons();
        const cursors: Cursor[] = [];
        let dwellAction: string | null = null;
        let dwellProgress = 0;
        let dbg = "";

        for (let s = 0; s < 2; s++) {
          const st = e.handState[s];
          const hand = e.hands[s];

          if (!hand.present) {
            st.lost++;
            if (!(e.store.drawing(s) && st.pinching && st.lost <= GRACE)) {
              e.store.end(s);
              e.audio.silence(s);
              st.pinching = false;
              e.lastTip[s] = null;
            }
            continue;
          }
          st.lost = 0;

          // Rigid absolute pinch gate with hysteresis.
          const pv = e.pinchEMA[s];
          const was = st.pinching;
          if (!st.pinching && pv < PINCH_ON) st.pinching = true;
          else if (st.pinching && pv > PINCH_OFF) st.pinching = false;
          const pinchDown = !was && st.pinching;
          dbg += `${s === 0 ? "L" : "R"} ${pv.toFixed(2)} ${st.pinching ? "■DRAW" : "·up"}   `;

          const nib = hand.points[INDEX_TIP];
          const fs = fingerStates(hand.points);

          // 1) Hand-only buttons — fingertip in DISPLAY space (canvas is mirrored).
          const dispX = cw - nib.x;
          const dispY = nib.y;
          const over = buttons.find(
            (b) => dispX >= b.x && dispX <= b.x + b.w && dispY >= b.y && dispY <= b.y + b.h,
          );
          if (over) {
            e.store.end(s);
            e.audio.silence(s);
            e.lastTip[s] = null;
            if (!st.pinching) {
              if (e.ui.action === over.action) e.ui.ms += dt;
              else {
                e.ui.action = over.action;
                e.ui.ms = 0;
              }
              dwellAction = over.action;
              dwellProgress = Math.min(1, e.ui.ms / UI_DWELL);
              if (e.ui.ms >= UI_DWELL) {
                fire(over.action);
                e.ui.ms = -1e9;
              }
            }
            cursors.push({ pos: nib, color: e.currentColor, mode: "hover" });
            continue;
          }

          // 2) Picking from the open wheel (same hand: point + pinch to grab).
          if (e.wheelOpen) {
            e.store.end(s);
            e.audio.silence(s);
            e.lastTip[s] = null;
            if (e.palette.inside(nib)) {
              e.palette.updateHover(nib);
              if (pinchDown) {
                e.palette.grab();
                e.wheelOpen = false;
                setWheelOpen(false);
              }
            }
            cursors.push({ pos: nib, color: e.currentColor, mode: "hover" });
            continue;
          }

          // 3) Eraser — two fingers, rub over strokes.
          if (isTwoFinger(fs)) {
            e.store.end(s);
            e.audio.silence(s);
            e.lastTip[s] = null;
            e.store.eraseAt(nib.x, nib.y, ERASE_R);
            cursors.push({ pos: nib, color: e.currentColor, mode: "erase", radius: ERASE_R });
            continue;
          }

          // 4) Pen — ink flows only while pinched.
          if (st.pinching) {
            if (!e.store.drawing(s)) e.store.begin(s, e.currentColor);
            e.store.addPoint(s, nib.x, nib.y);
            const prev = e.lastTip[s];
            const speed = prev ? Math.hypot(nib.x - prev.x, nib.y - prev.y) : 0;
            e.lastTip[s] = { x: nib.x, y: nib.y };
            e.audio.draw(s, 1 - nib.y / ch, speed);
            cursors.push({ pos: nib, color: e.currentColor, mode: "draw" });
          } else {
            e.store.end(s);
            e.audio.silence(s);
            e.lastTip[s] = null;
            cursors.push({ pos: nib, color: e.currentColor, mode: "hover" });
          }
        }

        if (dwellAction === null) {
          e.ui.action = null;
          e.ui.ms = 0;
        }
        for (const b of buttons) {
          const fill = b.el.querySelector<HTMLElement>("[data-fill]");
          if (fill) {
            fill.style.width =
              b.action === dwellAction ? `${dwellProgress * 100}%` : "0%";
          }
        }

        e.palette.tick();
        if (e.ctx) {
          e.renderer.draw(e.ctx, e.store, e.palette, cursors, cw, ch);
        }
        if (hintRef.current) {
          hintRef.current.style.opacity =
            e.store.committed.length === 0 && !e.wheelOpen ? "0.8" : "0";
        }
        if (debugRef.current) debugRef.current.textContent = dbg || "no hand";
      };
      e.raf = requestAnimationFrame(frame);
    } catch (err) {
      console.error("Air Draw failed to start:", err);
      setStatus("denied");
    }
  }, [sizeCanvas, muted, toggleMute]);

  useEffect(() => {
    window.addEventListener("resize", sizeCanvas);
    return () => {
      window.removeEventListener("resize", sizeCanvas);
      const e = engineRef.current;
      if (e) {
        cancelAnimationFrame(e.raf);
        e.stream?.getTracks().forEach((t) => t.stop());
        e.tracker.close();
        e.audio.close();
      }
    };
  }, [sizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative h-dvh w-screen overflow-hidden bg-[#07070b]"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)", filter: "brightness(0.5) saturate(1.05)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(4,5,10,0.6) 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* HUD — wordmark */}
      <div className="pointer-events-none absolute left-5 top-4 z-20 select-none">
        <div className="font-mono-hud flex items-center gap-1.5 text-lg font-bold tracking-[0.06em] text-[#eaf6ff] drop-shadow-[0_0_16px_rgba(61,240,255,0.4)]">
          AIR
          <span className="inline-block h-2 w-2 rounded-full bg-[#3df0ff] shadow-[0_0_12px_4px_rgba(61,240,255,0.7)]" />
          DRAW
        </div>
      </div>

      <a
        href="https://github.com/Suryansh777777/air-draw"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono-hud pointer-events-auto absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#eaf6ff]/15 bg-[#0a0d14]/60 px-4 py-2 text-[11px] tracking-[0.25em] text-[#eaf6ff]/80 backdrop-blur-md transition-all hover:border-[#3df0ff]/60 hover:bg-[#3df0ff]/10 hover:text-[#3df0ff]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#3df0ff]">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
        DROP&nbsp;A&nbsp;STAR&nbsp;ON&nbsp;GITHUB
      </a>

      <SocialLinks />

      {status === "running" && (
        <Toolbar
          ref={toolbarRef}
          colorCss={colorCss}
          muted={muted}
          wheelOpen={wheelOpen}
          onUndo={handleUndo}
          onClear={handleClear}
          onToggleMute={toggleMute}
          onToggleWheel={toggleWheel}
        />
      )}

      <div
        ref={hintRef}
        className="font-mono-hud pointer-events-none absolute left-1/2 top-[14%] z-20 -translate-x-1/2 select-none text-center text-xs leading-relaxed tracking-[0.35em] text-[#eaf6ff]/80 transition-opacity duration-500"
        style={{ opacity: 0 }}
      >
        PINCH&nbsp;TO&nbsp;DRAW&nbsp;·&nbsp;RELEASE&nbsp;TO&nbsp;LIFT
        <br />
        <span className="text-[10px] text-[#eaf6ff]/55">
          ✌&nbsp;TWO&nbsp;FINGERS&nbsp;ERASE&nbsp;·&nbsp;HOLD&nbsp;A&nbsp;BUTTON&nbsp;TO&nbsp;PRESS
        </span>
      </div>

      {/* TEMP pinch calibration readout — value/base + state per hand */}
      {status === "running" && (
        <div
          ref={debugRef}
          className="font-mono-hud pointer-events-none absolute bottom-6 right-4 z-40 select-none rounded-md bg-black/55 px-2.5 py-1 text-[11px] tracking-wider text-[#3df0ff]/90"
        />
      )}

      <Intro status={status} onBegin={begin} />
    </div>
  );
}
