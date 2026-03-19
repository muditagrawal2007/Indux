"use client";

// Zoom-style reactions — SVG icons float up from the bottom,
// mini celebration animations for applause/thumbs etc.
// All emoji-free — uses standard SVG icons

import { useEffect, useState, useRef } from "react";
import { Reaction } from "../../components/Icons";

export type ReactionKind = "thumbs" | "clap" | "heart" | "laugh" | "raise" | "wave" | "fire" | "party";

const REACTIONS: { kind: ReactionKind; label: string; color: string }[] = [
  { kind: "thumbs", label: "Thumbs up", color: "#3b82f6" },
  { kind: "clap", label: "Clap", color: "#10b981" },
  { kind: "heart", label: "Love", color: "#ef4444" },
  { kind: "laugh", label: "Laugh", color: "#f59e0b" },
  { kind: "fire", label: "Fire", color: "#f97316" },
  { kind: "party", label: "Celebrate", color: "#a855f7" },
];

export function ReactionsMenu({ onPick, side = "top" }: { onPick: (kind: ReactionKind) => void; side?: "top" | "bottom" }) {
  return (
    <div
      className={
        "absolute left-1/2 -translate-x-1/2 z-30 " +
        (side === "top" ? "bottom-full mb-2" : "top-full mt-2")
      }
    >
      <div className="rounded-2xl border border-white/10 bg-[#1a1a25] p-1.5 shadow-2xl backdrop-blur">
        <div className="flex gap-0.5">
          {REACTIONS.map((r) => (
            <button
              key={r.kind}
              onClick={() => onPick(r.kind)}
              title={r.label}
              className="group flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-all hover:scale-125 hover:bg-white/10 hover:text-white"
            >
              <Reaction kind={r.kind as "thumbs" | "clap" | "heart" | "laugh" | "fire" | "party"} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Floating reaction particles
export function FloatingReactions({ roomId, identity }: { roomId: string; identity: string }) {
  const [reactions, setReactions] = useState<{ id: string; kind: string; label: string; color: string; ts: number; x: number }[]>([]);
  const idRef = useRef(0);

  // Poll for reactions
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${roomId}/reactions`);
        if (r.ok) {
          const data = await r.json();
          const now = Date.now();
          // Keep only recent reactions (last 4 seconds)
          setReactions((prev) => {
            const fresh = prev.filter((x) => now - x.ts < 4000);
            const newOnes = (data.reactions ?? [])
              .filter((x: any) => now - x.ts < 2000 && x.identity !== identity)
              .map((x: any) => {
                const match = REACTIONS.find((r) => r.kind === x.emoji);
                return {
                  id: `r${idRef.current++}`,
                  kind: x.emoji,
                  label: match?.label ?? x.emoji,
                  color: match?.color ?? "#6b7280",
                  ts: x.ts,
                  x: Math.random() * 60 + 20,
                };
              });
            return [...fresh, ...newOnes];
          });
        }
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [roomId, identity]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-16 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shadow-lg backdrop-blur"
          style={{
            left: `${r.x}%`,
            background: `${r.color}22`,
            color: r.color,
            border: `1px solid ${r.color}33`,
            animation: "reaction-float 3.5s ease-out forwards",
          }}
        >
          <Reaction kind={r.kind as "thumbs" | "clap" | "heart" | "laugh" | "fire" | "party"} />
          <span>{r.label}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes reaction-float {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          15% { opacity: 1; transform: translateY(-30px) scale(1.2); }
          30% { transform: translateY(-60px) scale(1); }
          100% { opacity: 0; transform: translateY(-300px) scale(0.6) rotate(20deg); }
        }
      `}</style>
    </div>
  );
}

// Inline message reactions (Zoom-style chat thumbs up)
export function MessageReactions({ messageId, roomId, identity, reactions }: { messageId: string; roomId: string; identity: string; reactions: Record<string, string[]> }) {
  const reactionList = reactions[messageId] ?? [];
  const myReaction = reactionList.find((r) => r.startsWith(identity + ":"));
  const summary = reactionList.reduce<Record<string, number>>((acc, r) => {
    const emoji = r.split(":")[1] ?? r;
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1 text-xs">
      {Object.entries(summary).map(([emoji, count]) => {
        const match = REACTIONS.find((r) => r.kind === emoji);
        return (
          <button
            key={emoji}
            onClick={async () => {
              await fetch(`/api/rooms/${roomId}/chat/${messageId}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity, emoji }),
              });
            }}
            className={
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] " +
              (myReaction?.endsWith(emoji)
                ? "border-blue-500 bg-blue-500/15 text-blue-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10")
            }
          >
            <span className="inline-flex">{match && <Reaction kind={emoji as "thumbs" | "clap" | "heart" | "laugh" | "fire" | "party"} />}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
