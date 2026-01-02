"use client";

import { useEffect, useState } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function WhiteboardPanel({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute right-4 top-12 z-40 flex h-[28rem] w-[40rem] max-w-[90vw] flex-col rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
          <h3 className="text-sm font-medium">Whiteboard</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white">✕</button>
        </div>
        <div className="flex-1 grid place-items-center text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <h3 className="text-sm font-medium text-gray-900">Whiteboard</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Room: {roomId}</span>
          <button onClick={onClose} className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white">Close</button>
        </div>
      </div>
      <div className="flex-1">
        <Tldraw />
      </div>
    </div>
  );
}