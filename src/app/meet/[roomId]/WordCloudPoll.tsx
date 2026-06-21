"use client";

// WordCloudPoll — renders a live word cloud from poll responses.
// Words scale by frequency, color cycles through a palette, fresh words pop in.

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type Entry = { word: string; count: number };

const PALETTE = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16"];

export function WordCloudPoll({
  roomId, pollId, question, closed, identity, onClose,
}: {
  roomId: string;
  pollId: string;
  question: string;
  closed: boolean;
  identity: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/polls/${pollId}/words`);
        const d = await r.json();
        if (!cancelled) setEntries(d.words ?? []);
      } catch {}
    }
    load();
    const t = setInterval(load, 1500);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId, pollId]);

  async function submit() {
    const w = draft.trim();
    if (!w || closed) return;
    if (submitted.has(w.toLowerCase())) {
      setDraft("");
      return;
    }
    try {
      const r = await fetch(`/api/rooms/${roomId}/polls/${pollId}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, word: w }),
      });
      const d = await r.json();
      setEntries(d.words ?? []);
      setSubmitted((s) => new Set(s).add(w.toLowerCase()));
      setDraft("");
      sfx.reaction();
    } catch {}
  }

  const maxCount = Math.max(1, ...entries.map((e) => e.count));
  const layout = useMemo(() => layoutCloud(entries), [entries]);

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0a0a14]/95 via-[#10101c]/95 to-[#06060e]/95 backdrop-blur-xl animate-fadeIn flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl shadow-lg"
               style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}>
            <span className="text-base">☁️</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Word Cloud · {entries.reduce((s, e) => s + e.count, 0)} responses</div>
            <div className="text-[10px] text-white/40">{closed ? "Closed" : "Type one word · bigger = more mentions"}</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
          <Icon.Close size={11} /> Exit
        </button>
      </div>

      {/* Question */}
      <div className="border-b border-white/10 px-6 py-5 text-center bg-gradient-to-r from-transparent via-white/[0.02] to-transparent">
        <div className="text-[10px] uppercase tracking-wider text-amber-300">Q</div>
        <h2 className="mt-1 text-xl font-semibold leading-snug">{question}</h2>
      </div>

      {/* Cloud */}
      <div className="relative flex-1 overflow-hidden p-4">
        {entries.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-center text-white/40">
            <div>
              <div className="text-5xl mb-2 opacity-30">☁️</div>
              <div className="text-sm">No words yet. Submit one below to start the cloud.</div>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {layout.map((w) => (
              <span
                key={w.word}
                className="absolute font-bold leading-none transition-all duration-700 animate-fadeIn"
                style={{
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  fontSize: `${Math.max(14, 14 + Math.log2(w.count / maxCount + 1) * 22)}px`,
                  color: PALETTE[hashColor(w.word) % PALETTE.length],
                  transform: `translate(-50%, -50%) rotate(${w.rot}deg)`,
                  opacity: 0.5 + (w.count / maxCount) * 0.5,
                  textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                {w.word}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      {!closed && (
        <div className="border-t border-white/10 bg-black/30 p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mx-auto flex max-w-xl items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a word..."
              autoFocus
              maxLength={40}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/8 transition-all"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}
              aria-label="Submit"
            >
              <Icon.Send size={14} />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-white/40">
            One word at a time. No repeats. Pick what stands out.
          </div>
        </div>
      )}
    </div>
  );
}

function hashColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfffffff;
  return h;
}

// Simple spiral layout for the cloud
function layoutCloud(entries: Entry[]): Array<Entry & { x: number; y: number; rot: number }> {
  const sorted = [...entries].sort((a, b) => b.count - a.count);
  const out: Array<Entry & { x: number; y: number; rot: number }> = [];
  let step = 0;
  for (const e of sorted) {
    const angle = step * 0.4;
    const radius = 5 + step * 2.5;
    const x = 50 + Math.cos(angle) * radius * 4;
    const y = 50 + Math.sin(angle) * radius * 2.8;
    const rot = (Math.sin(step * 1.7) * 18);
    out.push({ ...e, x: Math.max(5, Math.min(95, x)), y: Math.max(8, Math.min(92, y)), rot });
    step++;
  }
  return out;
}