"use client";

// Indux Meet — Interactive demo modal for the launcher's feature grid.
// Each demo is a small interactive preview, not marketing copy.

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { AudioWave } from "./AudioWave";
import { AnimatedCounter } from "./AnimatedCounter";
import { Typewriter } from "./Typewriter";

type DemoModalProps = {
  kind: string;
  onClose: () => void;
};

export function DemoModal({ kind, onClose }: DemoModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn p-4"
      onClick={onClose}
    >
      <div
        className="relative w-[min(640px,96vw)] max-h-[90vh] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--accent)]/15 text-[color:var(--accent)]">
              {labelFor(kind).icon}
            </span>
            <div>
              <div className="text-sm font-semibold">{labelFor(kind).title}</div>
              <div className="text-[10px] text-[color:var(--text-muted)]">{labelFor(kind).hint}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[color:var(--text-muted)] hover:bg-[color:var(--bg-sunken)] hover:text-[color:var(--text-primary)] transition-colors"
            aria-label="Close demo"
          >
            <Icon.Close size={14} />
          </button>
        </div>
        <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(90vh - 64px)" }}>
          {kind === "video" && <VideoDemo />}
          {kind === "screen" && <ScreenDemo />}
          {kind === "whiteboard" && <WhiteboardDemo />}
          {kind === "ai" && <AIDemo />}
          {kind === "chat" && <ChatDemo />}
          {kind === "polls" && <PollsDemo />}
          {kind === "secure" && <SecureDemo />}
          {kind === "admin" && <AdminDemo />}
        </div>
      </div>
    </div>
  );
}

function labelFor(kind: string) {
  switch (kind) {
    case "video":     return { title: "HD Video",         hint: "End-to-end WebRTC video, sub-200ms", icon: <Icon.Video size={14} /> };
    case "screen":    return { title: "Screen Share",     hint: "Apps, tabs, or full desktop — 4K",  icon: <Icon.ScreenShare size={14} /> };
    case "whiteboard":return { title: "Whiteboard",       hint: "Live collaboration with tldraw",   icon: <Icon.Pencil size={14} /> };
    case "ai":        return { title: "AI Sidekick",      hint: "Live captions + post-meeting recap", icon: <Icon.Sparkles size={14} /> };
    case "chat":      return { title: "Persistent Chat",  hint: "Replies, files, threads, history",  icon: <Icon.MessageSquare size={14} /> };
    case "polls":     return { title: "Polls & Word Cloud",hint: "Live votes + free-text word clouds",icon: <Icon.BarChart size={14} /> };
    case "secure":    return { title: "End-to-End Secure",hint: "E2EE rooms, MFA, SSO, audit log",   icon: <Icon.Lock size={14} /> };
    case "admin":     return { title: "Admin Controls",   hint: "Mute, kick, lock, promote, ban",    icon: <Icon.Shield size={14} /> };
    default:          return { title: "Demo",             hint: "",                                  icon: <Icon.Sparkles size={14} /> };
  }
}

// ================= Video demo =================
function VideoDemo() {
  const [speaking, setSpeaking] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setSpeaking((s) => !s), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile name="You" speaking={speaking} self />
      <Tile name="Alice" speaking={!speaking} />
      <Tile name="Bob" speaking={false} />
      <Tile name="Carol" speaking={false} muted />
    </div>
  );
}

function Tile({ name, speaking, muted, self }: { name: string; speaking: boolean; muted?: boolean; self?: boolean }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--accent)]/15 to-purple-500/10">
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white/85 text-sm font-bold text-zinc-900">
          {name[0]}
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
        {muted ? <Icon.MicOff size={9} /> : <Icon.Mic size={9} />}
        <span>{name}{self ? " (you)" : ""}</span>
      </div>
      {speaking && (
        <div className="absolute bottom-2 right-2">
          <AudioWave active className="text-emerald-400" />
        </div>
      )}
      {speaking && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-400/70" />
      )}
    </div>
  );
}

// ================= Screen share demo =================
function ScreenDemo() {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-zinc-950 text-xs text-zinc-300 shadow-inner">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 font-mono text-[10px] text-zinc-500">indux-meet · meeting.tsx</span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">
{`export function Room() {
  return (
    <LiveKitRoom token={token} ...>
      <VideoConference />
    </LiveKitRoom>
  );
}

// Shared from your screen
// 4K @ 60fps · audio passthrough · cursor overlay`}
      </pre>
      <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-500">
        Sharing &quot;Safari&quot; · 1920×1080 · 32ms latency
      </div>
    </div>
  );
}

// ================= Whiteboard demo =================
function WhiteboardDemo() {
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }[]>>([]);
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);

  function addPoint(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDraft((d) => [...d, { x, y }]);
  }
  function commit() {
    if (draft.length < 2) return;
    setStrokes((s) => [...s, draft]);
    setDraft([]);
  }
  function clear() {
    setStrokes([]);
    setDraft([]);
  }

  return (
    <div className="space-y-2">
      <div
        onMouseDown={addPoint}
        onMouseMove={(e) => e.buttons === 1 && addPoint(e)}
        onMouseUp={commit}
        onMouseLeave={commit}
        className="relative h-64 cursor-crosshair overflow-hidden rounded-xl border border-[color:var(--border)] bg-white dark:bg-zinc-900"
      >
        {/* grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            color: "rgba(120,120,120,0.4)",
          }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {strokes.map((s, i) => (
            <polyline
              key={i}
              points={s.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              className="text-[color:var(--accent)]"
            />
          ))}
          {draft.length > 1 && (
            <polyline
              points={draft.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              className="text-[color:var(--accent)]/70"
            />
          )}
        </svg>
        <div className="absolute left-2 top-2 flex gap-1">
          <button
            onClick={clear}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-1.5 py-0.5 text-[10px] hover:bg-[color:var(--bg-sunken)]"
          >
            Clear
          </button>
        </div>
        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white">
          Drag to draw · {strokes.length} stroke{strokes.length === 1 ? "" : "s"}
        </div>
      </div>
      <p className="text-xs text-[color:var(--text-muted)]">
        Real meetings use tldraw for full vector editing, sticky notes, and live cursors. This is a taste.
      </p>
    </div>
  );
}

// ================= AI Sidekick demo =================
function AIDemo() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-sunken)]/50 p-3 text-sm">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
          <Icon.Sparkles size={10} className="text-[color:var(--accent)]" />
          Live transcript
        </div>
        <p className="leading-relaxed text-[color:var(--text-primary)]">
          “So if we ship the launch by Friday, <span className="text-[color:var(--accent)]">Sarah will own the marketing</span> and I’ll handle the dev cutover… <Typewriter phrases={["", "let's reconvene on Monday to review the metrics."]} />
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Insight icon="✅" title="Action item captured" sub="@Sarah — marketing launch" />
        <Insight icon="🎯" title="Decision recorded" sub="Ship by Friday" />
        <Insight icon="📌" title="Action item captured" sub="@You — dev cutover" />
        <Insight icon="🧠" title="Recap ready in 1 click" sub="Markdown export + share link" />
      </div>
    </div>
  );
}

function Insight({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-2">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className="text-base">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">{sub}</div>
    </div>
  );
}

// ================= Chat demo =================
function ChatDemo() {
  const messages = [
    { who: "Alice", body: "Pushed v2.3 — check staging.", color: "#6366f1" },
    { who: "Bob", body: "Tests green on my end.", color: "#10b981" },
    { who: "Carol", body: "Loom recording attached 👇", color: "#f59e0b", file: "loom-recording.mp4 · 4.2MB" },
    { who: "You", body: "Looks great. Merging.", color: "#ec4899" },
  ];
  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <div key={i} className="flex items-start gap-2 animate-fadeIn" style={{ animationDelay: `${i * 120}ms` }}>
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ background: m.color }}
          >
            {m.who[0]}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{m.who}</span>
              <span className="text-[10px] text-[color:var(--text-muted)]">just now</span>
            </div>
            <div className="mt-0.5 inline-block rounded-2xl rounded-tl-md bg-[color:var(--bg-sunken)] px-2.5 py-1 text-xs text-[color:var(--text-primary)]">
              {m.body}
              {m.file && (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-2 py-1 text-[10px]">
                  <Icon.FileText size={10} />
                  <span className="font-mono">{m.file}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ================= Polls demo =================
function PollsDemo() {
  const options = [
    { label: "Friday afternoon", votes: 6 },
    { label: "Monday morning", votes: 9 },
    { label: "Wednesday noon", votes: 3 },
    { label: "Skip the sync", votes: 1 },
  ];
  const total = options.reduce((s, o) => s + o.votes, 0);
  const [voted, setVoted] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-sunken)]/50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">Live poll</div>
        <div className="text-sm font-medium">Best slot for the launch retro?</div>
        <div className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">{total} of 19 voted</div>
      </div>
      <div className="space-y-2">
        {options.map((o, i) => {
          const pct = total ? Math.round((o.votes / total) * 100) : 0;
          const selected = voted === i;
          return (
            <button
              key={i}
              onClick={() => setVoted(i)}
              className={
                "relative w-full overflow-hidden rounded-lg border p-2 text-left text-xs transition-all " +
                (selected
                  ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/10"
                  : "border-[color:var(--border)] bg-[color:var(--bg-elevated)] hover:border-[color:var(--accent)]/30")
              }
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-700"
                style={{
                  width: voted === null ? `${pct}%` : `${pct}%`,
                  background: "linear-gradient(90deg, var(--accent)/15, transparent)",
                }}
              />
              <div className="relative flex items-center justify-between">
                <span className={selected ? "font-medium" : ""}>{o.label}</span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-[color:var(--text-muted)]">
                  {voted !== null && (
                    <span className="inline-block animate-scaleIn font-mono text-[10px] font-bold text-[color:var(--accent)]">
                      <AnimatedCounter to={o.votes} duration={700} />
                    </span>
                  )}
                  <span className={voted === null ? "text-[color:var(--text-muted)]" : ""}>{pct}%</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setVoted(null)}
        className="mt-3 text-[10px] text-[color:var(--text-muted)] underline-offset-2 hover:underline"
      >
        Reset &amp; try another
      </button>
    </div>
  );
}

// ================= Secure demo =================
function SecureDemo() {
  const items = [
    { title: "End-to-end room encryption", sub: "AES-GCM on every media track" },
    { title: "Multi-factor auth", sub: "TOTP, WebAuthn, recovery codes" },
    { title: "Single sign-on (SSO)", sub: "SAML 2.0 + OIDC for enterprise" },
    { title: "Audit log immutability", sub: "WORM storage, hash-chained" },
    { title: "SOC 2 Type II ready", sub: "Controls documented & tested" },
    { title: "Data residency", sub: "EU / IN / US pinning available" },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-2.5"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-500">
            <Icon.Check size={12} />
          </span>
          <div>
            <div className="text-xs font-medium">{it.title}</div>
            <div className="text-[10px] text-[color:var(--text-muted)]">{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ================= Admin demo =================
function AdminDemo() {
  const actions = [
    { who: "Bob", action: "muted by Alice" },
    { who: "Spammer-3", action: "removed by Alice" },
    { who: "Marketing", action: "promoted to co-host by Alice" },
    { who: "—", action: "room locked" },
    { who: "Recording", action: "started · 1080p" },
  ];
  return (
    <div className="space-y-1.5">
      {actions.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-2.5 py-1.5 text-xs animate-fadeIn"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="grid h-5 w-5 place-items-center rounded bg-[color:var(--accent)]/15 text-[10px] text-[color:var(--accent)]">
            <Icon.Shield size={10} />
          </span>
          <span className="font-medium">{a.who}</span>
          <span className="text-[color:var(--text-muted)]">{a.action}</span>
          <span className="ml-auto text-[10px] tabular-nums text-[color:var(--text-muted)]">{i + 1}m ago</span>
        </div>
      ))}
    </div>
  );
}
