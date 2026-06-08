# Air Draw

**Paint light in the air with your bare hands.** Raise a hand to your webcam and
point — your index fingertip becomes a pen and you draw glowing neon strokes that
hang in space. Open your other palm and a colour wheel blooms on it; dip your
finger in to choose any colour. Runs entirely in the browser, no install.

→ Built with Next.js, MediaPipe hand tracking, and Canvas2D.

## How to play

| Gesture | What it does |
| --- | --- |
| ☝️ **Point** (index finger out) | Draw — your fingertip is the pen |
| 🖐 **Open palm** | Summons the colour wheel on that hand |
| Other index inside the wheel | Pick a colour — angle = hue, distance from centre = saturation. Hold still ~0.35s to lock it in |
| ✊ Fist / hand down | Idle (pen up) |

Both hands can point at once to draw with two pens. The toolbar (bottom) has
**Undo**, **Clear**, and **Mute**.

## How it works

- **Hand tracking** — MediaPipe `HandLandmarker` (`@mediapipe/tasks-vision`),
  21 landmarks per hand, GPU delegate with a CPU fallback, dynamically imported
  so it never touches the server bundle. WASM + model load from CDN.
- **Smoothing** — every landmark runs through a 1€ filter (`oneEuro.ts`) so the
  line is steady without feeling laggy.
- **Gestures** (`gestures.ts`) — fingers read as extended/curled by comparing tip
  vs PIP distance from the wrist; that classifies each hand into point / open / idle.
- **Strokes** (`strokes.ts`) — append-only point lists, decimated by distance.
  Finished strokes are baked once onto an offscreen canvas; only the in-progress
  stroke redraws each frame, so long sessions stay at 60fps.
- **Neon look** (`renderer.ts`) — each stroke is drawn in four additive passes
  (halo → glow → body → hot white core) over a dimmed webcam feed, so crossings
  flare like real light.
- **Colour wheel** (`palette.ts`) — a precomputed HSV disc anchored to the open
  hand; the other fingertip's angle/radius selects hue/saturation, committed by
  dwell.
- **Audio** (`audio.ts`) — fully synthesized. Each pen has a soft two-oscillator
  voice whose pitch follows hand height (minor-pentatonic quantized) and volume
  follows speed, with a feedback-delay tail. No audio files.

## Develop

```bash
bun install
bun dev          # http://localhost:3000
bun run build    # production build
```

### Environment

Set your Google Analytics 4 Measurement ID to enable analytics:

```
# .env.local
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Leave it blank to skip loading GA (e.g. in development).

## Tech

Next.js · React · TypeScript · Tailwind CSS v4 · Turbopack · Bun ·
`@mediapipe/tasks-vision` · Web Audio API · Canvas2D.

---

Built by [Suryansh Chourasia](https://github.com/Suryansh777777).
Best in good light, Chrome recommended.
