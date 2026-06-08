"use client";

export type Status = "idle" | "loading" | "running" | "denied";

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
      {/* aurora glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 30% 30%, rgba(61,240,255,0.16), transparent 60%), radial-gradient(ellipse 45% 45% at 72% 68%, rgba(255,61,240,0.14), transparent 60%)",
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(234,246,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(234,246,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-col items-center px-8 text-center">
        <h1 className="font-mono-hud flex items-center gap-1 text-[clamp(44px,11vw,108px)] font-bold leading-none tracking-[0.04em] text-[#eaf6ff]">
          <span className="drop-shadow-[0_0_28px_rgba(61,240,255,0.55)]">AIR</span>
          <span
            aria-hidden
            className="mx-2 inline-block h-3 w-3 rounded-full bg-[#3df0ff] align-middle shadow-[0_0_24px_8px_rgba(61,240,255,0.7)]"
          />
          <span className="drop-shadow-[0_0_28px_rgba(255,61,240,0.5)]">DRAW</span>
        </h1>

        <div className="font-mono-hud mt-4 text-[10px] tracking-[0.5em] text-[#eaf6ff]/55 sm:text-[11px]">
          PINCH&nbsp;TO&nbsp;DRAW&nbsp;·&nbsp;RELEASE&nbsp;TO&nbsp;LIFT
        </div>

        <p className="mt-7 max-w-md text-sm leading-relaxed text-[#eaf6ff]/65 sm:text-base">
          Raise a hand and <strong className="text-[#eaf6ff]/90">pinch</strong>{" "}
          your thumb and finger — ink flows while you pinch and lifts the instant
          you let go, so you can write letter by letter. Hold over a button to
          press it; two fingers erase; tap <span className="text-[#3df0ff]">COLOUR</span>{" "}
          for the wheel.
        </p>

        <div className="mt-9 flex h-16 items-center justify-center">
          {status === "idle" && (
            <button
              onClick={onBegin}
              className="font-mono-hud group relative cursor-pointer overflow-hidden rounded-full bg-[#3df0ff] px-12 py-4 text-sm tracking-[0.35em] text-[#04121a] shadow-[0_0_40px_rgba(61,240,255,0.4)] transition-all duration-300 hover:bg-[#eaf6ff] hover:shadow-[0_0_56px_rgba(234,246,255,0.45)]"
            >
              START&nbsp;DRAWING
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

      <div className="font-mono-hud absolute bottom-7 flex items-center gap-3 text-[9px] tracking-[0.35em] text-[#eaf6ff]/35">
        <span>BEST&nbsp;IN&nbsp;GOOD&nbsp;LIGHT&nbsp;·&nbsp;CHROME&nbsp;RECOMMENDED</span>
      </div>
    </div>
  );
}
