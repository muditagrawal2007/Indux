"use client";

// Recap — post-meeting summary view. Auto-assigns action items, lists decisions
// and highlights, lets you share a public recap link, and download as markdown.

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type AssignedItem = { text: string; assignee: string | null; confidence: number };
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

export function RecapModal({
  roomId, isAdmin, onClose,
}: {
  roomId: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [pollSummary, setPollSummary] = useState<Array<{ question: string; kind: string; winner?: string; votes?: number }>>([]);
  const [generating, setGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/recap`);
        const d = await r.json();
        if (!cancelled) {
          setRecap(d.recap);
        }
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [roomId]);

  async function generate() {
    if (!isAdmin) return;
    setGenerating(true);
    sfx.ai();
    try {
      const r = await fetch(`/api/rooms/${roomId}/recap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      setRecap(d.recap);
      setPollSummary(d.pollSummary ?? []);
    } catch {} finally {
      setGenerating(false);
    }
  }

  function copyShareLink() {
    if (!recap) return;
    const url = `${window.location.origin}/recap/${recap.room}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function downloadMarkdown() {
    if (!recap) return;
    const items = JSON.parse(recap.action_items) as AssignedItem[];
    const decisions = JSON.parse(recap.decisions) as string[];
    const highlights = JSON.parse(recap.highlights) as string[];
    const participants = JSON.parse(recap.participants) as string[];

    const md = [
      `# Meeting recap · /${recap.room}`,
      ``,
      `_Generated ${new Date(recap.generated_at).toLocaleString()}_`,
      ``,
      `## Summary`,
      recap.summary,
      ``,
      `## Action items (${items.length})`,
      ...items.map((i) => i.assignee ? `- [ ] **${i.assignee}** — ${i.text}` : `- [ ] ${i.text}`),
      ``,
      `## Decisions (${decisions.length})`,
      ...(decisions.length ? decisions.map((d) => `- ${d}`) : ["_None recorded_"]),
      ``,
      `## Highlights`,
      ...(highlights.length ? highlights.map((h) => `- ${h}`) : ["_None captured_"]),
      ``,
      `## Polls`,
      ...(pollSummary.length
        ? pollSummary.map((p) => p.kind === "word_cloud"
            ? `- _${p.question}_ — word cloud`
            : `- _${p.question}_ — winner: **${p.winner}** (${p.votes} votes)`)
        : ["_No polls_"]),
      ``,
      `## Participants (${participants.length})`,
      participants.map((p) => `- ${p}`).join("\n"),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recap-${recap.room}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    sfx.message();
  }

  const items: AssignedItem[] = recap ? safeParse(recap.action_items, []) : [];
  const decisions: string[] = recap ? safeParse(recap.decisions, []) : [];
  const highlights: string[] = recap ? safeParse(recap.highlights, []) : [];
  const participants: string[] = recap ? safeParse(recap.participants, []) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-[min(820px,94vw)] max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#16161e]/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl"
                 style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}>
              <Icon.FileText size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Meeting Recap</h2>
              <p className="text-[11px] text-white/40">
                {recap ? `Generated ${new Date(recap.generated_at).toLocaleString("en-US")}` : "Not generated yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {recap && (
              <>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Icon.Link size={11} /> {linkCopied ? "Copied!" : "Share link"}
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Icon.Send size={11} /> Markdown
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={generate}
                disabled={generating}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
              >
                {generating ? "Generating…" : recap ? "Regenerate" : "Generate"}
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70" aria-label="Close">
              <Icon.Close size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: "calc(90vh - 81px)" }}>
          {!recap ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl"
                   style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}>
                <Icon.FileText size={24} />
              </div>
              <h3 className="text-base font-semibold">No recap yet</h3>
              <p className="mt-1 text-sm text-white/50 max-w-md mx-auto">
                {isAdmin
                  ? "Click Generate to summarize this meeting. We'll extract action items, decisions, highlights, and assign owners automatically."
                  : "Only the host can generate a recap. Ask them to click Generate."}
              </p>
            </div>
          ) : (
            <>
              <Section title="Summary" icon={<Icon.Sparkles size={12} />}>
                <div className="text-sm leading-relaxed text-white/85">{recap.summary}</div>
              </Section>

              <Section title={`Action items (${items.length})`} icon={<Icon.Check size={12} />}>
                {items.length === 0 ? (
                  <div className="text-xs text-white/40 italic">None captured yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((i, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                        <span className="mt-0.5 text-base">✅</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{i.text}</div>
                          {i.assignee && (
                            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                              <Icon.User size={9} /> @{i.assignee}
                              <span className="text-amber-200/40">· {Math.round(i.confidence * 100)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`Decisions (${decisions.length})`} icon={<Icon.Star size={12} />}>
                {decisions.length === 0 ? (
                  <div className="text-xs text-white/40 italic">None captured.</div>
                ) : (
                  <ul className="space-y-1">
                    {decisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-400">🎯</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Highlights" icon={<Icon.Bolt size={12} />}>
                {highlights.length === 0 ? (
                  <div className="text-xs text-white/40 italic">None captured.</div>
                ) : (
                  <div className="space-y-1">
                    {highlights.map((h, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 italic">
                        {h}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {pollSummary.length > 0 && (
                <Section title={`Polls (${pollSummary.length})`} icon={<Icon.BarChart size={12} />}>
                  <div className="space-y-1.5">
                    {pollSummary.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                        <div className="flex-1 min-w-0 truncate">{p.question}</div>
                        <div className="text-xs text-white/60">
                          {p.kind === "word_cloud"
                            ? <span className="text-amber-300">word cloud</span>
                            : <span><span className="text-emerald-300 font-medium">{p.winner}</span> · {p.votes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title={`Participants (${participants.length})`} icon={<Icon.Users size={12} />}>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p, i) => (
                    <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/70">{p}</span>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function safeParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}