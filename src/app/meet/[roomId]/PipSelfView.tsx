"use client";

// Floating Picture-in-Picture for self-view.
// Drag to reposition. Click to show the larger self view again.
// Toggles via the PiP button in the meeting header or via the toolbar.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

export function PipSelfView({
  sourceSelector = "video[data-lk-local]",
}: {
  sourceSelector?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size] = useState<{ w: number; h: number }>({ w: 220, h: 140 });
  const dragRef = useRef<{ offX: number; offY: number } | null>(null);

  // Auto-position bottom-right when first opened
  useEffect(() => {
    if (open && !pos) {
      setPos({ x: window.innerWidth - size.w - 24, y: window.innerHeight - size.h - 130 });
    }
  }, [open, pos, size.h, size.w]);

  useEffect(() => {
    function onResize() {
      setPos((p) => {
        if (!p) return p;
        const x = Math.min(Math.max(p.x, 12), window.innerWidth - size.w - 12);
        const y = Math.min(Math.max(p.y, 12), window.innerHeight - size.h - 12);
        return { x, y };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [size.h, size.w]);

  function startDrag(e: React.MouseEvent) {
    if (!pos) return;
    dragRef.current = { offX: e.clientX - pos.x, offY: e.clientY - pos.y };
    function move(ev: MouseEvent) {
      if (!dragRef.current) return;
      setPos({ x: ev.clientX - dragRef.current.offX, y: ev.clientY - dragRef.current.offY });
    }
    function up() {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Picture-in-picture self view (P)"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/45 text-white/70 backdrop-blur-sm hover:bg-black/65 hover:text-white transition-colors"
      >
        <Icon.Picture size={11} />
      </button>
    );
  }

  if (!pos) return null;

  // Build a mirrored mini-tile out of the local video — clone the live video
  // element onto a <video> in our floating tile via captureStream.
  const clonedVideo = (
    <video
      autoPlay
      muted
      playsInline
      className="h-full w-full -scale-x-100 rounded-xl object-cover"
      ref={(el) => {
        if (!el) return;
        // Stream from the live tile
        const source = document.querySelector(sourceSelector) as HTMLVideoElement | null;
        const stream = (source as any)?.srcObject as MediaStream | undefined;
        if (stream) {
          try {
            (el as any).srcObject = stream;
            el.play().catch(() => {});
          } catch {}
        }
      }}
    />
  );

  return (
    <div
      role="dialog"
      aria-label="Picture-in-picture self view"
      className="fixed z-40 overflow-hidden rounded-xl border border-white/15 bg-black/90 shadow-2xl animate-scaleIn"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        onMouseDown={startDrag}
        className="absolute inset-x-0 top-0 z-10 flex h-7 cursor-grab items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 active:cursor-grabbing"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">You · PiP</span>
        <div className="flex items-center gap-0.5">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(false)}
            className="grid h-5 w-5 place-items-center rounded text-white/60 hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <Icon.Close size={10} />
          </button>
        </div>
      </div>
      {clonedVideo}
      <div className="pointer-events-none absolute bottom-1.5 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white/70">
        drag to reposition
      </div>
    </div>
  );
}
