"use client";

// AI Sidekick panel — chat with the meeting. Asks "what did X say?",
// "summarize this", "action items", etc. Renders markdown-ish text with
// animated typing indicator and quick-prompt chips.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type Message = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: string | null;
  created_at: number;
};

const QUICK_PROMPTS = [
  { label: "Summarize", icon: "📝", prompt: "Summarize this meeting" },
  { label: "Action items", icon: "✅", prompt: "What are the action items?" },
  { label: "Recent transcript", icon: "💬", prompt: "What did people say recently?" },
  { label: "Poll results", icon: "📊", prompt: "Poll results" },
  { label: "Decisions", icon: "🎯", prompt: "What decisions were made?" },
  { label: "Help", icon: "❓", prompt: "What can you do?" },
];

export function AISidekick({
  roomId, identity, userName, onClose, insights, onResolveInsight,
}: {
  roomId: string;
  identity: string;
  userName: string;
  onClose: () => void;
  insights: Array<{ id: number; kind: string; text: string; source: string | null; resolved: boolean }>;
  onResolveInsight: (id: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"chat" | "insights">("chat");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/ai/chat?identity=${encodeURIComponent(identity)}`);
        const d = await r.json();
        if (!cancelled) setMessages(d.messages ?? []);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [roomId, identity]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const optimistic: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      created_at: Date.now(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    try {
      const r = await fetch(`/api/rooms/${roomId}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, message: trimmed }),
      });
      const d = await r.json();
      if (d.reply) {
        setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), optimistic, d.reply]);
        sfx.ai();
        onResolveInsight(0); // refresh insights signal
      }
    } catch (e) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "system", content: "Couldn't reach the sidekick. Try again.", created_at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="animate-slideInR relative flex h-full w-[420px] max-w-[90vw] shrink-0 flex-col border-l border-white/10 bg-gradient-to-b from-[#1a1a26]/95 to-[#16161e]/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="grid h-8 w-8 place-items-center rounded-xl text-sm shadow-lg"
                 style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}>
              <Icon.Sparkles size={14} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#1a1a26] animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Sidekick</div>
            <div className="text-[10px] text-white/40">Listening to {userName}&apos;s meeting</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors" aria-label="Close">
          <Icon.Close size={14} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 px-4 pt-2">
        {(["chat", "insights"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-full px-3 py-1 text-[11px] font-medium transition-all " +
              (tab === t
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5")
            }
          >
            {t === "chat" ? "Chat" : `Insights (${insights.filter((i) => !i.resolved).length})`}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <>
          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-white/40 text-xs mt-8">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
                     style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}>
                  <Icon.Sparkles size={20} />
                </div>
                <div className="font-medium text-white/70">I&apos;m here to help.</div>
                <div className="mt-1 max-w-[280px] mx-auto leading-relaxed">
                  I listen to chat, captions, and polls. Ask me anything about what&apos;s happening.
                </div>
              </div>
            )}

            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} content={m.content} />
            ))}

            {busy && (
              <div className="flex gap-2 items-start">
                <div className="grid h-6 w-6 place-items-center rounded-lg mt-0.5"
                     style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}>
                  <Icon.Sparkles size={11} />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-white/5 px-3 py-2 text-sm text-white/70">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.prompt)}
                  disabled={busy}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                >
                  <span className="mr-1">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask the sidekick…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/8 transition-all max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-lg transition-all disabled:opacity-30 disabled:shadow-none hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}
                aria-label="Send"
              >
                <Icon.Send size={14} />
              </button>
            </form>
          </div>
        </>
      ) : (
        <InsightsList insights={insights} onResolve={onResolveInsight} />
      )}
    </aside>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant" | "system"; content: string }) {
  if (role === "system") {
    return (
      <div className="text-center text-[11px] text-white/40 italic">{content}</div>
    );
  }
  const isUser = role === "user";
  return (
    <div className={"flex gap-2 items-start " + (isUser ? "flex-row-reverse" : "")}>
      {!isUser && (
        <div className="grid h-6 w-6 place-items-center rounded-lg mt-0.5 shrink-0"
             style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}>
          <Icon.Sparkles size={11} />
        </div>
      )}
      <div
        className={
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm " +
          (isUser
            ? "rounded-tr-md text-white"
            : "rounded-tl-md bg-white/5 text-white/85 border border-white/8")
        }
        style={isUser ? { background: "linear-gradient(135deg, var(--accent), var(--brand-700))" } : undefined}
      >
        <MarkdownLite content={content} />
      </div>
    </div>
  );
}

function MarkdownLite({ content }: { content: string }) {
  // Very small markdown: bold + bullet list + quote
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("> ")) {
          return <div key={i} className="border-l-2 border-white/20 pl-2 italic text-white/60">{renderInline(line.slice(2))}</div>;
        }
        if (/^[•\-\*]\s/.test(line)) {
          return <div key={i} className="flex gap-1.5"><span className="text-white/40">•</span><span>{renderInline(line.replace(/^[•\-\*]\s/, ""))}</span></div>;
        }
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("_") && p.endsWith("_")) {
      return <em key={i} className="italic text-white/60">{p.slice(1, -1)}</em>;
    }
    return <span key={i}>{p}</span>;
  });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function InsightsList({
  insights, onResolve,
}: {
  insights: Array<{ id: number; kind: string; text: string; source: string | null; resolved: boolean }>;
  onResolve: (id: number) => void;
}) {
  if (insights.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-xs px-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
          <Icon.Sparkles size={20} />
        </div>
        <div className="font-medium text-white/70">No insights yet</div>
        <div className="mt-1 leading-relaxed max-w-[280px]">
          Action items, decisions, and questions appear here as people talk in chat, captions, and the sidekick.
        </div>
      </div>
    );
  }

  const grouped: Record<string, typeof insights> = {};
  for (const i of insights) {
    (grouped[i.kind] ??= []).push(i);
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {(["action_item", "decision", "question", "highlight"] as const).map((kind) => {
        const items = grouped[kind] ?? [];
        if (items.length === 0) return null;
        const meta = KIND_META[kind];
        return (
          <div key={kind}>
            <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              <span>{meta.icon}</span>
              <span>{meta.label} ({items.length})</span>
            </div>
            <div className="space-y-1.5">
              {items.map((i) => (
                <div
                  key={i.id}
                  className={
                    "group rounded-xl border p-2.5 transition-all " +
                    (i.resolved
                      ? "border-white/5 bg-white/[0.02] opacity-50"
                      : "border-white/10 bg-white/5 hover:border-white/20")
                  }
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={"text-xs leading-relaxed " + (i.resolved ? "line-through" : "")}>{i.text}</div>
                      {i.source && (
                        <div className="mt-1 text-[10px] text-white/30">— {i.source}</div>
                      )}
                    </div>
                    {!i.resolved && (
                      <button
                        onClick={() => onResolve(i.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-white/40 hover:text-white hover:bg-white/10"
                        title="Mark resolved"
                      >
                        <Icon.Check size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const KIND_META: Record<string, { label: string; icon: string }> = {
  action_item: { label: "Action items", icon: "✅" },
  decision: { label: "Decisions", icon: "🎯" },
  question: { label: "Open questions", icon: "❓" },
  highlight: { label: "Highlights", icon: "✨" },
};