"use client";

// Activity ticker — a live feed of in-meeting events shown on screen.
// Polls hand raises, reactions, polls, and chat highlights, surfaces them
// as ephemeral toast cards. Auto-fades after a few seconds.

import { useEffect, useState, useRef } from "react";
import { Icon } from "../../components/Icons";

type TickerEvent = {
  id: string;
  kind: "hand" | "reaction" | "poll" | "join" | "chat" | "share";
  text: string;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  ts: number;
};

const KIND_COLORS: Record<string, string> = {
  hand: "#f59e0b",
  reaction: "#ec4899",
  poll: "#10b981",
  join: "#6366f1",
  chat: "#06b6d4",
  share: "#a855f7",
};

export function ActivityTicker({ roomId, identity }: { roomId: string; identity: string }) {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const idRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (document.hidden || cancelled) return;
      try {
        const [handR, reactR, chatR, partsR] = await Promise.all([
          fetch(`/api/rooms/${roomId}/hand`).then((r) => r.json()).catch(() => ({ hands: [] })),
          fetch(`/api/rooms/${roomId}/reactions?since=0`).then((r) => r.json()).catch(() => ({ reactions: [] })),
          fetch(`/api/rooms/${roomId}/chat?since=0`).then((r) => r.json()).catch(() => ({ messages: [] })),
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()).catch(() => ({ participants: [] })),
        ]);
        if (cancelled) return;

        const incoming: TickerEvent[] = [];

        // Hand raises
        for (const h of (handR.hands ?? []) as any[]) {
          if (h.identity === identity) continue;
          const key = `hand-${h.identity}-${h.raised_at}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);
          incoming.push({
            id: `t${idRef.current++}`,
            kind: "hand",
            text: `${h.name ?? h.identity}`,
            subtext: "raised their hand",
            icon: <Icon.Hand size={13} />,
            color: KIND_COLORS.hand,
            ts: h.raised_at,
          });
        }

        // Reactions
        for (const r of (reactR.reactions ?? []) as any[]) {
          if (r.identity === identity) continue;
          const key = `react-${r.id}-${r.emoji}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);
          incoming.push({
            id: `t${idRef.current++}`,
            kind: "reaction",
            text: `${r.name ?? r.identity}`,
            subtext: `reacted with ${r.emoji}`,
            icon: <span className="text-xs">{emojiFor(r.emoji)}</span>,
            color: KIND_COLORS.reaction,
            ts: r.ts,
          });
        }

        // Chat (only highlight messages with files or very recent)
        const chatList = (chatR.messages ?? []) as any[];
        if (chatList.length > 0) {
          const newest = chatList[chatList.length - 1];
          const key = `chat-${newest.id}`;
          if (!seenRef.current.has(key) && newest.identity !== identity && Date.now() - newest.created_at < 5000) {
            seenRef.current.add(key);
            incoming.push({
              id: `t${idRef.current++}`,
              kind: "chat",
              text: `${newest.name ?? newest.identity}`,
              subtext: newest.body.length > 40 ? newest.body.slice(0, 40) + "…" : newest.body,
              icon: <Icon.MessageSquare size={13} />,
              color: KIND_COLORS.chat,
              ts: newest.created_at,
            });
          }
        }

        // Sort by ts, dedupe, keep last 6
        incoming.sort((a, b) => b.ts - a.ts);
        setEvents((prev) => {
          const seen = new Set<string>();
          const merged = [...incoming, ...prev].filter((e) => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
          }).slice(0, 6);
          return merged;
        });
      } catch {}
    }

    poll();
    const t = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId, identity]);

  // Auto-prune old events after 8s
  useEffect(() => {
    if (events.length === 0) return;
    const t = setTimeout(() => {
      setEvents((prev) => prev.filter((e) => Date.now() - e.ts < 8000));
    }, 9000);
    return () => clearTimeout(t);
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-1/2 z-30 -translate-y-1/2 flex flex-col gap-2 max-w-xs">
      {events.slice(0, 4).map((e) => (
        <div
          key={e.id}
          className="ticker-in pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-xl"
          style={{ boxShadow: `0 4px 20px ${e.color}33` }}
        >
          <span
            className="grid h-6 w-6 place-items-center rounded-full"
            style={{ background: `${e.color}22`, color: e.color }}
          >
            {e.icon}
          </span>
          <div className="min-w-0">
            <div className="font-medium text-white/90 truncate max-w-[180px]">{e.text}</div>
            {e.subtext && (
              <div className="text-[10px] text-white/50 truncate max-w-[180px]">{e.subtext}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function emojiFor(kind: string): string {
  switch (kind) {
    case "thumbs": return "👍";
    case "clap": return "👏";
    case "heart": return "❤️";
    case "laugh": return "😂";
    case "fire": return "🔥";
    case "party": return "🎉";
    case "raise": return "✋";
    case "wave": return "👋";
    default: return "✦";
  }
}