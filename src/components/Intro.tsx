"use client";

import Image from "next/image";

export type Status = "idle" | "loading" | "running" | "denied";

/** The four gestures, mirroring the brand key art. */
const FEATURES = [
  {
    key: "pinch",
    accent: "#3df0ff",
    label: "PINCH TO DRAW",
    sub: "Pinch to ink, release to lift.",
  },
  {
    key: "two",
    accent: "#ff5db4",
    label: "TWO FINGERS",
    sub: "Hold up two to erase.",
  },
  {
    key: "wheel",
    accent: "rainbow",
    label: "PICK COLOUR",
    sub: "Dip into the wheel.",
  },
  {
    key: "glow",
    accent: "#9b8cff",
    label: "LIVE GLOW",
    sub: "Neon trails, real time.",
  },
] as const;

function FeatureIcon({ kind, accent }: { kind: string; accent: string }) {
  if (kind === "wheel") {
    return (
      <span
        aria-hidden
        className="h-5 w-5 shrink-0"
        style={{
          borderRadius: "9999px",
          background:
            "conic-gradient(from 90deg, #ff3d6e, #ffd93d, #3dff8e, #3df0ff, #6e6bff, #ff3df0, #ff3d6e)",
          WebkitMask: "radial-gradient(circle, transparent 38%, #000 43%)",
          mask: "radial-gradient(circle, transparent 38%, #000 43%)",
          filter: "saturate(1.2) drop-shadow(0 0 6px rgba(255,255,255,0.25))",
        }}
      />
    );
  }

  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: accent,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5 shrink-0",
    style: { filter: `drop-shadow(0 0 5px ${accent}aa)` },
  };

  if (kind === "pinch") {
    return (
      <svg aria-hidden {...common}>
        <path d="M8.5 4.2c1.7 2.2 1.7 4.3 0 6.6" />
        <path d="M15.5 4.2c-1.7 2.2-1.7 4.3 0 6.6" />
        <circle cx="12" cy="12.4" r="1.7" fill={accent} stroke="none" />
        <path d="M12 14.4v4.4" strokeDasharray="0.1 3" />
      </svg>
    );
  }
  if (kind === "two") {
    return (
      <svg aria-hidden {...common}>
        <path d="M9.3 4v8" />
        <path d="M14.7 4v8" />
        <path d="M6.5 11.5c0 4 2.2 7.5 5.5 7.5s5.5-3.5 5.5-7.5" />
      </svg>
    );
  }
  // glow squiggle
  return (
    <svg aria-hidden {...common}>
      <path d="M2.5 14c2.6-6 5.2-6 7.8 0s5.2 6 7.8 0 2.6-2 3.4-1" />
    </svg>
  );
}

export function Intro({
  status,
  onBegin,
}: {
  status: Status;
  onBegin: () => void;
}) {
  if (status === "running") return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-[#07070b]">
      {/* drifting aurora */}
      <div
        aria-hidden
        className="anim-aurora pointer-events-none absolute inset-0 will-change-transform"
        style={{
          background:
            "radial-gradient(ellipse 46% 38% at 28% 26%, rgba(61,240,255,0.18), transparent 62%), radial-gradient(ellipse 42% 44% at 74% 70%, rgba(255,61,200,0.16), transparent 62%), radial-gradient(ellipse 38% 40% at 60% 18%, rgba(120,90,255,0.10), transparent 60%)",
        }}
      />
      {/* central darkening so the logo reads */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(7,7,11,0) 30%, rgba(7,7,11,0.55) 100%)",
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(234,246,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(234,246,255,0.7) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 80%)",
        }}
      />
      {/* floating neon specks */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SPECKS.map((p, i) => (
          <span
            key={i}
            className="intro-particle absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              animation: `driftUp ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

     

      {/* top viewfinder tag */}
      <div className="font-mono-hud anim-rise absolute left-8 top-8 hidden items-center gap-2 text-[9px] tracking-[0.42em] text-[#eaf6ff]/40 sm:flex">
        <span
          className="anim-breathe inline-block h-1.5 w-1.5 rounded-full bg-[#3df0ff]"
          style={{ boxShadow: "0 0 8px 2px rgba(61,240,255,0.8)" }}
        />
        AIR-DRAW&nbsp;/&nbsp;VISION&nbsp;SYSTEM
      </div>

      {/* hero */}
      <div className="relative flex flex-col items-center px-6 text-center">
        <p
          className="font-mono-hud anim-rise text-[10px] tracking-[0.5em] text-[#3df0ff]/70 sm:text-[11px]"
          style={{ animationDelay: "0.05s" }}
        >
          YOUR&nbsp;HAND&nbsp;·&nbsp;YOUR&nbsp;PEN&nbsp;·&nbsp;YOUR&nbsp;CANVAS
        </p>

        <div
          className="anim-rise mt-4"
          style={{ animationDelay: "0.12s" }}
        >
          <div className="anim-float relative will-change-transform">
            {/* glow bed behind the logo */}
            <div
              aria-hidden
              className="anim-breathe pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(ellipse 55% 60% at 42% 50%, rgba(61,240,255,0.22), transparent 70%), radial-gradient(ellipse 45% 55% at 70% 55%, rgba(255,61,200,0.18), transparent 72%)",
                transform: "scale(1.35)",
              }}
            />
            <Image
              src="/logo.png"
              alt="Air Draw — turn your hand into a glowing pen"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 640px) 86vw, 560px"
              className="h-auto w-[min(86vw,560px)] select-none"
              style={{ filter: "drop-shadow(0 8px 40px rgba(61,240,255,0.18))" }}
              draggable={false}
            />
          </div>
        </div>

        <p
          className="anim-rise mt-1 max-w-sm text-sm leading-relaxed text-[#eaf6ff]/55"
          style={{ animationDelay: "0.2s" }}
        >
          A hand-tracked light-painting studio that runs entirely on your webcam.
        </p>

        {/* gesture legend */}
        <div
          className="anim-rise mt-8 grid grid-cols-2 gap-x-7 gap-y-5 sm:flex sm:gap-9"
          style={{ animationDelay: "0.28s" }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.key}
              className="flex items-start gap-2.5 text-left sm:max-w-[150px]"
            >
              <FeatureIcon kind={f.key} accent={f.accent === "rainbow" ? "#fff" : f.accent} />
              <div className="leading-tight">
                <div className="font-mono-hud text-[10px] tracking-[0.22em] text-[#eaf6ff]/85">
                  {f.label}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-[#eaf6ff]/45">
                  {f.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* action */}
        <div className="mt-10 flex h-16 items-center justify-center">
          {status === "idle" && (
            <button
              onClick={onBegin}
              className="anim-rise font-mono-hud group relative cursor-pointer overflow-hidden rounded-full bg-[#3df0ff] px-11 py-4 text-sm tracking-[0.32em] text-[#04121a] shadow-[0_0_44px_rgba(61,240,255,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#eaf6ff] hover:shadow-[0_0_64px_rgba(234,246,255,0.5)]"
              style={{ animationDelay: "0.36s" }}
            >
              <span
                aria-hidden
                className="intro-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-md"
                style={{ animation: "sheen 4.5s ease-in-out 1.2s infinite" }}
              />
              <span className="relative flex items-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                START&nbsp;DRAWING
              </span>
            </button>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-7 w-7 animate-[spin_1s_linear_infinite] rounded-full border-2 border-[#3df0ff]/20 border-t-[#3df0ff]" />
              <p className="font-mono-hud animate-[pulseSoft_1.6s_ease-in-out_infinite] text-[11px] tracking-[0.4em] text-[#eaf6ff]/70">
                WARMING&nbsp;UP&nbsp;THE&nbsp;LIGHT
              </p>
            </div>
          )}

          {status === "denied" && (
            <div className="flex flex-col items-center gap-4">
              <p className="max-w-xs text-sm text-[#ff5d8f]">
                Camera access denied. Air Draw needs your hands — enable the
                camera and try again.
              </p>
              <button
                onClick={onBegin}
                className="font-mono-hud cursor-pointer rounded-full border border-[#3df0ff]/50 px-8 py-3 text-xs tracking-[0.35em] text-[#eaf6ff] transition-colors hover:bg-[#3df0ff]/10"
              >
                TRY&nbsp;AGAIN
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="font-mono-hud anim-rise absolute bottom-7 flex items-center gap-3 text-[9px] tracking-[0.35em] text-[#eaf6ff]/35" style={{ animationDelay: "0.5s" }}>
        <span>BEST&nbsp;IN&nbsp;GOOD&nbsp;LIGHT&nbsp;·&nbsp;CHROME&nbsp;RECOMMENDED</span>
      </div>
    </div>
  );
}

/** Static neon specks (deterministic so SSR/CSR match). */
const SPECKS = [
  { left: "12%", top: "30%", size: 3, color: "rgba(61,240,255,0.8)", dur: 9, delay: 0 },
  { left: "22%", top: "68%", size: 2, color: "rgba(255,61,200,0.7)", dur: 11, delay: 1.5 },
  { left: "38%", top: "22%", size: 2, color: "rgba(155,140,255,0.7)", dur: 10, delay: 0.8 },
  { left: "47%", top: "78%", size: 3, color: "rgba(61,240,255,0.6)", dur: 12, delay: 2.2 },
  { left: "63%", top: "32%", size: 2, color: "rgba(255,61,200,0.7)", dur: 9.5, delay: 0.4 },
  { left: "72%", top: "64%", size: 3, color: "rgba(61,240,255,0.7)", dur: 11.5, delay: 1.1 },
  { left: "84%", top: "40%", size: 2, color: "rgba(155,140,255,0.7)", dur: 10.5, delay: 2.6 },
  { left: "90%", top: "72%", size: 2, color: "rgba(255,217,61,0.55)", dur: 13, delay: 0.6 },
] as const;
