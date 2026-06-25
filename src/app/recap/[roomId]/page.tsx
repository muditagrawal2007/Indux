"use client";

// Public recap page — read-only view of a generated meeting recap at /recap/[roomId].
// Anyone with the link can see the summary, action items, decisions, highlights.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../../components/Icons";

type Recap = {
  room: string;
  summary: string;
  action_items: string;
  decisions: string;
  highlights: string;
  participants: string;
  duration_ms: number;
  generated_at: number;
};

type AssignedItem = { text: string; assignee: string | null; confidence: number };

export default function RecapPage({ params }: { params: Promise<{ roomId: string }> }) {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string>("");

  useEffect(() => {
    params.then(async ({ roomId }) => {
      setRoomId(roomId);
      try {
        const r = await fetch(`/api/rooms/${roomId}/recap`);
        const d = await r.json();
        setRecap(d.recap);
      } catch {} finally {
        setLoading(false);
      }
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] flex items-center justify-center">
        <div className="text-sm text-white/40">Loading recap…</div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
            <Icon.FileText size={24} className="text-white/30" />
          </div>
          <h1 className="text-lg font-semibold">No recap published yet</h1>
          <p className="mt-1 text-sm text-white/50">The meeting host hasn&apos;t generated a recap for <code>/{roomId}</code> yet.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--accent)] hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const items: AssignedItem[] = safeParse(recap.action_items, []);
  const decisions: string[] = safeParse(recap.decisions, []);
  const highlights: string[] = safeParse(recap.highlights, []);
  const participants: string[] = safeParse(recap.participants, []);

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)]">
      <div className="aurora-bg" />
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm text-white/50 hover:text-white">← Indux Meet</Link>
          <span className="text-xs text-white/40">Public recap</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 relative">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60">
          <Icon.Sparkles size={10} />
          AI-generated · {new Date(recap.generated_at).toLocaleString("en-US")}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Meeting recap <code className="font-mono text-base text-white/40">/{recap.room}</code>
        </h1>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Summary</div>
          <p className="text-sm leading-relaxed text-white/85">{recap.summary}</p>
        </section>

        {items.length > 0 && (
          <section className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Action items</div>
            <ul className="space-y-2">
              {items.map((i, idx) => (
                <li key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-sm">{i.text}</div>
                  {i.assignee && (
                    <div className="mt-1 text-[11px] text-amber-300">→ assigned to @{i.assignee}</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {decisions.length > 0 && (
          <section className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Decisions</div>
            <ul className="space-y-1">
              {decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                  <span className="text-amber-400">🎯</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {highlights.length > 0 && (
          <section className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Highlights</div>
            <div className="space-y-1.5">
              {highlights.map((h, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs italic text-white/70">
                  {h}
                </div>
              ))}
            </div>
          </section>
        )}

        {participants.length > 0 && (
          <section className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">
              Participants ({participants.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {participants.map((p, i) => (
                <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/70">{p}</span>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-white/10 pt-5 text-[10px] text-white/30">
          Generated by Indux Meet · powered by LiveKit · open source
        </footer>
      </main>
    </div>
  );
}

function safeParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}