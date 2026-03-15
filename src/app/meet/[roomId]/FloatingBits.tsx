"use client";

// Floating emoji reactions and Share modal — small components

import { useEffect, useState } from "react";

// Floating reactions
export function FloatingReactions({ roomId }: { roomId: string }) {
  const [reactions, setReactions] = useState<any[]>([]);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${roomId}/reactions`);
        if (r.ok) {
          const data = await r.json();
          const now = Date.now();
          setReactions((prev) => {
            const fresh = prev.filter((x) => now - x.ts < 4000);
            return [...fresh, ...(data.reactions ?? []).filter((x: any) => now - x.ts < 4000)];
          });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [roomId]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r, i) => (
        <div
          key={i}
          className="absolute bottom-20 text-3xl"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            animation: `float-up 3s ease-out forwards`,
          }}
        >
          {r.emoji}
        </div>
      ))}
      <style jsx>{`
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-200px); }
        }
      `}</style>
    </div>
  );
}

// Share modal
export function ShareModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/${roomId}` : "";

  const copy = async (text: string, which: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur animate-fadeIn" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn w-[28rem] max-w-[92vw] rounded-2xl border border-white/10 bg-[#0f0f14] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Share meeting</h2>
            <p className="mt-1 text-xs text-white/50">Anyone with the code or link can join</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white">✕</button>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Code</div>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <code className="font-mono text-sm font-semibold tracking-wider">{roomId}</code>
              <button
                onClick={() => copy(roomId, "code")}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
              >
                {copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Link</div>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="truncate font-mono text-xs text-white/80">{link}</span>
              <button
                onClick={() => copy(link, "link")}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
              >
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
            <span className="font-medium text-white/70">Tip:</span> Lock the room from Manage → Lock room to require admin approval.
          </div>
        </div>
      </div>
    </div>
  );
}