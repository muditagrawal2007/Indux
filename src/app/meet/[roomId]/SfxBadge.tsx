"use client";

// Floating controls for sound effects and accessibility options.
// Toggleable, persists to localStorage.

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx, isSfxEnabled, setSfxEnabled, setSfxVolume, getSfxVolume } from "./sfx";

export function SfxBadge() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.4);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEnabled(isSfxEnabled());
    setVolume(getSfxVolume());
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSfxEnabled(next);
    if (next) sfx.toggle();
  }

  function setVol(v: number) {
    setVolume(v);
    setSfxVolume(v);
    if (enabled) sfx.click();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Sound effects"
        className={
          "flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-sm transition-colors " +
          (enabled
            ? "bg-black/45 text-white/70 hover:bg-black/65 hover:text-white"
            : "bg-red-500/15 text-red-300 hover:bg-red-500/25")
        }
      >
        {enabled ? <Icon.Volume size={11} /> : <Icon.VolumeOff size={11} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-40 mb-2 w-52 -translate-x-1/2 animate-scaleIn rounded-xl border border-white/10 bg-[#1c1d24]/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Sound effects
              </span>
              <button
                onClick={toggle}
                className={
                  "relative h-4 w-7 rounded-full transition-colors " +
                  (enabled ? "bg-[color:var(--accent)]" : "bg-white/15")
                }
                aria-label="Toggle sound"
              >
                <span
                  className={
                    "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all " +
                    (enabled ? "left-3.5" : "left-0.5")
                  }
                />
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVol(Number(e.target.value))}
              disabled={!enabled}
              className="w-full accent-[color:var(--accent)] disabled:opacity-40"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
              <span>Quiet</span>
              <span className="font-mono">{Math.round(volume * 100)}%</span>
              <span>Loud</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
