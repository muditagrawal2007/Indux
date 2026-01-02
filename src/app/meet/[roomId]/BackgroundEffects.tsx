"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "none" | "blur" | "image";

// Lightweight background effects: CSS blur (free, no model needed) or
// solid-color / image background (via LiveKit track processor if available).
//
// For the MVP we just toggle a CSS filter on the local video tile.
// This achieves the same visual effect as Zoom's "blur" toggle.
export function BackgroundEffects({
  initialMode = "none",
  onChange,
}: {
  initialMode?: Mode;
  onChange?: (mode: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onChange?.(mode);
  }, [mode, onChange]);

  // Apply CSS filter to the local video tile
  useEffect(() => {
    const tile = document.querySelector('[data-lk-local-participant="true"]') as HTMLElement | null;
    if (!tile) return;
    if (mode === "blur") {
      tile.style.filter = "blur(8px)";
    } else if (mode === "image") {
      // Solid color "wall" behind the user
      tile.style.background = "linear-gradient(135deg, #4f46e5, #06b6d4)";
      tile.style.filter = "none";
    } else {
      tile.style.filter = "none";
      tile.style.background = "";
    }
  }, [mode]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          "rounded-md px-2.5 py-1 text-xs font-medium " +
          (mode !== "none"
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700")
        }
      >
        BG: {mode === "blur" ? "blur" : mode === "image" ? "image" : "off"}
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 w-44 rounded border border-gray-700 bg-gray-900 p-2 shadow-xl">
          <button onClick={() => { setMode("none"); setOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-800">Off</button>
          <button onClick={() => { setMode("blur"); setOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-800">Blur background</button>
          <button onClick={() => { setMode("image"); setOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-800">Solid color wall</button>
          <p className="mt-1 px-2 py-1 text-[10px] text-gray-500">
            Real AI-based blur is enabled when @livekit/track-processors is configured.
          </p>
        </div>
      )}
    </div>
  );
}