"use client";

// Keyboard shortcuts overlay
// Press ? to open, then:
//   M = mute/unmute
//   V = video on/off
//   C = chat
//   P = people
//   S = settings
//   Q = leave (quit)
//   R = raise hand
//   B = background blur toggle
//   Space = push-to-talk (when held)

import { useEffect, useState } from "react";

export function ShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur animate-fadeIn" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn w-[36rem] max-w-[92vw] rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Keyboard shortcuts</h2>
            <p className="mt-1 text-xs text-white/50">Press <kbd>?</kbd> anytime to bring this up</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white">✕</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Shortcut k="M" label="Mute / unmute" />
          <Shortcut k="V" label="Camera on / off" />
          <Shortcut k="Space" label="Push to talk (hold)" />
          <Shortcut k="C" label="Toggle chat" />
          <Shortcut k="P" label="Toggle people" />
          <Shortcut k="Q" label="Question / Q&A" />
          <Shortcut k="R" label="Raise hand" />
          <Shortcut k="B" label="Toggle background blur" />
          <Shortcut k="S" label="Settings (admin)" />
          <Shortcut k="L" label="Lock room (admin)" />
          <Shortcut k="W" label="Whiteboard" />
          <Shortcut k="N" label="Notes" />
          <Shortcut k="Esc" label="Close dialog / leave" />
          <Shortcut k="⌘K" label="Command palette" />
        </div>
      </div>
    </div>
  );
}

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-white/70">{label}</span>
      <kbd className="font-mono">{k}</kbd>
    </div>
  );
}

// Hook for keyboard shortcuts
export function useShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't trigger when typing
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const k = e.key.toLowerCase();
      if (handlers[k]) {
        handlers[k]();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handlers]);
}