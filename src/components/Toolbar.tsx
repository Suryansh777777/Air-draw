"use client";

import { forwardRef } from "react";

function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  );
}

function IconSound({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

const shell =
  "font-mono-hud pointer-events-auto relative flex h-12 w-[150px] items-center justify-start gap-2.5 overflow-hidden rounded-full border border-white/10 bg-[#0a0d14]/70 px-5 text-[10px] tracking-[0.25em] text-[#eaf6ff]/80 backdrop-blur-md transition-colors";

/** The cyan "charge" fill driven by hand-hover dwell, plus the label on top. */
function ChargeButton({
  action,
  label,
  children,
  onClick,
  active = false,
}: {
  action: string;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      data-action={action}
      className={`${shell} ${active ? "border-[#3df0ff]/60 text-[#3df0ff]" : ""}`}
      onClick={onClick}
      aria-label={label}
    >
      <span
        data-fill
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-0 bg-[#3df0ff]/25"
        style={{ width: 0 }}
      />
      <span className="relative flex items-center gap-2">
        {children}
        {label}
      </span>
    </button>
  );
}

export const Toolbar = forwardRef<
  HTMLDivElement,
  {
    colorCss: string;
    muted: boolean;
    wheelOpen: boolean;
    onUndo: () => void;
    onClear: () => void;
    onToggleMute: () => void;
    onToggleWheel: () => void;
  }
>(function Toolbar(
  { colorCss, muted, wheelOpen, onUndo, onClear, onToggleMute, onToggleWheel },
  ref,
) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end gap-2.5"
    >
      <ChargeButton
        action="colour"
        label="COLOUR"
        onClick={onToggleWheel}
        active={wheelOpen}
      >
        <span
          className="h-4 w-4 rounded-full ring-1 ring-white/40"
          style={{ backgroundColor: colorCss, boxShadow: `0 0 12px ${colorCss}` }}
        />
      </ChargeButton>
      <ChargeButton action="undo" label="UNDO" onClick={onUndo}>
        <IconUndo />
      </ChargeButton>
      <ChargeButton action="clear" label="CLEAR" onClick={onClear}>
        <IconClear />
      </ChargeButton>
      <ChargeButton action="mute" label={muted ? "OFF" : "ON"} onClick={onToggleMute}>
        <IconSound muted={muted} />
      </ChargeButton>
    </div>
  );
});
