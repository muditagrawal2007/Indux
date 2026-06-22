"use client";

// Side panel with tabs: Chat / People / Polls / Q&A / Notes
// Tabbed, fixed-width, slide-in from right.
// Self-contained — bottom padding so it doesn't get hidden behind toolbar.

import { useEffect, useRef, useState } from "react";
import { Icon, Reaction } from "../../components/Icons";
import { MessageReactions } from "./Reactions";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { PollsTab } from "./Polls";

type Tab = "chat" | "people" | "polls" | "qa" | "notes";

export function SidePanel({
  roomId, identity, userName, isAdmin, tab, onChangeTab, onClose,
}: {
  roomId: string;
  identity: string;
  userName: string;
  isAdmin: boolean;
  tab: Tab;
  onChangeTab: (t: Tab) => void;
  onClose: () => void;
}) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "chat",   icon: <Icon.MessageSquare size={13} />, label: "Chat" },
    { id: "people", icon: <Icon.Users size={13} />,          label: "People" },
    { id: "polls",  icon: <Icon.BarChart size={13} />,       label: "Polls" },
    { id: "qa",     icon: <Icon.Help size={13} />,           label: "Q&A" },
    { id: "notes",  icon: <Icon.FileText size={13} />,       label: "Notes" },
  ];
  return (
    <aside className="animate-slideInR relative flex h-full w-[400px] max-w-[88vw] shrink-0 flex-col border-l border-white/[0.06] bg-gradient-to-b from-[#15151c]/95 to-[#0e0e14]/95 shadow-[-12px_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-0.5 border-b border-white/[0.06] bg-black/15 px-2 py-2.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChangeTab(t.id)}
            className={
              "group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 " +
              (tab === t.id
                ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]")
            }
          >
            <span className={tab === t.id ? "text-white/90" : "text-white/50 group-hover:text-white/70"}>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {tab === t.id && (
              <span className="absolute -bottom-2.5 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80 transition-colors" aria-label="Close panel">
          <Icon.Close size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden pb-20">
        {tab === "chat"   && <ChatTab roomId={roomId} identity={identity} userName={userName} />}
        {tab === "people" && <ParticipantsPanel roomId={roomId} isAdmin={isAdmin} identity={identity} />}
        {tab === "polls"  && <PollsTab roomId={roomId} identity={identity} userName={userName} isAdmin={isAdmin} />}
        {tab === "qa"     && <QATab roomId={roomId} identity={identity} userName={userName} isAdmin={isAdmin} />}
        {tab === "notes"  && <NotesTab roomId={roomId} identity={identity} userName={userName} />}
      </div>
    </aside>
  );
}

// === Chat tab ===
function ChatTab({ roomId, identity, userName }: { roomId: string; identity: string; userName: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const sinceRef = useRef(0);
  const initializedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function refresh(initial = false) {
    try {
      const r = await fetch(`/api/rooms/${roomId}/chat?since=${initial ? 0 : sinceRef.current}`);
      const data = await r.json();
      const incoming = data.messages ?? [];
      if (incoming.length > 0) {
        sinceRef.current = Math.max(sinceRef.current, ...incoming.map((m: any) => m.id));
        if (initial) {
          setMsgs(incoming);
          initializedRef.current = true;
        } else {
          // avoid duplicates
          setMsgs((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = incoming.filter((m: any) => !known.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
        }
      } else if (initial) {
        setMsgs([]);
        initializedRef.current = true;
      }
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;

    async function tick() {
      if (document.hidden || cancelled) {
        timeoutId = setTimeout(tick, 6000);
        return;
      }
      const wasInit = initializedRef.current;
      await refresh(!wasInit);
      if (!cancelled) timeoutId = setTimeout(tick, 4000);
    }

    tick();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [roomId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    // optimistic append with a temp id; the POST response will replace it
    const tempId = `local-${Date.now()}`;
    const optimistic = {
      id: tempId,
      room: roomId,
      identity,
      name: userName,
      body: t,
      kind: "text",
      meta: null,
      created_at: Date.now(),
      _pending: true,
    };
    setMsgs((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/rooms/${roomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, name: userName, body: t }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const realId = data?.message?.id;
        if (realId) {
          // replace optimistic with the real one
          setMsgs((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: realId, _pending: false } : m))
          );
        } else {
          // mark not pending; next refresh will sync
          setMsgs((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, _pending: false } : m))
          );
        }
      } else {
        setMsgs((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, _failed: true } : m))
        );
      }
    } catch {
      setMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _failed: true } : m))
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {msgs.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/[0.04]">
              <Icon.MessageSquare size={20} className="text-white/30" />
            </div>
            <p className="text-xs text-white/40">No messages yet</p>
            <p className="mt-0.5 text-[10px] text-white/25">Be the first to say hi</p>
          </div>
        )}
        {msgs.map((m, idx) => {
          let reactions: Record<string, string[]> = {};
          try {
            const meta = m.meta ? JSON.parse(m.meta) : {};
            reactions = meta.reactions ?? {};
          } catch {}
          const msgReactions = reactions[String(m.id)] ?? [];
          const prev = msgs[idx - 1];
          const grouped = prev && prev.identity === m.identity && (m.created_at - prev.created_at) < 60_000;
          return (
            <div
              key={m.id}
              className={
                "group relative break-words rounded-xl px-3 py-2 transition-all " +
                (m._pending ? "opacity-50" : "") +
                (m._failed ? " border border-red-500/30 bg-red-500/5" : " hover:bg-white/[0.05]") +
                " " +
                (grouped ? "" : "mt-2.5")
              }
            >
              {!grouped && (
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-white/85">{m.name || m.identity}</span>
                  <span className="text-[10px] text-white/30" suppressHydrationWarning>
                    {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                  {m._pending && (
                    <span className="text-[9px] uppercase tracking-wide text-white/30">sending…</span>
                  )}
                </div>
              )}
              <div className="text-[13px] leading-relaxed text-white/90">{m.body}</div>
              {msgReactions.length > 0 && (
                <div className="mt-1">
                  <MessageReactions
                    messageId={String(m.id)}
                    roomId={roomId}
                    identity={identity}
                    reactionList={msgReactions}
                  />
                </div>
              )}
              <div className="absolute -top-2 right-1 hidden gap-0.5 rounded-full border border-white/10 bg-[#1a1a24] p-0.5 opacity-0 shadow-lg transition-opacity group-hover:flex group-hover:opacity-100">
                {(["thumbs", "heart", "laugh", "party"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={async () => {
                      await fetch(`/api/rooms/${roomId}/chat/${m.id}/reactions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identity, emoji: r }),
                      });
                      refresh(false);
                    }}
                    title={r}
                    className="grid h-7 w-7 place-items-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
                  >
                    <Reaction kind={r} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-white/[0.06] bg-[#0d0d14]/85 p-3 backdrop-blur-xl"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message everyone…"
          className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none transition-all"
        />
        <button
          type="submit"
          className="group flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
          style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}
          disabled={!text.trim()}
          aria-label="Send"
        >
          <Icon.Send size={14} />
        </button>
      </form>
    </div>
  );
}

// === Q&A tab ===
function QATab({ roomId, identity, userName, isAdmin }: { roomId: string; identity: string; userName: string; isAdmin: boolean }) {
  const [list, setList] = useState<any[]>([]);
  const [text, setText] = useState("");

  const refresh = async () => {
    const r = await fetch(`/api/rooms/${roomId}/qa${isAdmin ? "" : "?approved=1"}`);
    const data = await r.json();
    setList(data.questions ?? []);
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [roomId, isAdmin]);

  const ask = async () => {
    if (!text.trim()) return;
    const t = text;
    setText("");
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asker: identity, asker_name: userName, question: t }),
    });
    refresh();
  };

  const sorted = [...list].sort((a, b) => b.upvotes - a.upvotes || a.created_at - b.created_at);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {sorted.length === 0 && (
          <p className="py-12 text-center text-xs text-white/30">No questions yet.</p>
        )}
        {sorted.map((q) => (
          <div key={q.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start gap-2">
              <button
                onClick={async () => {
                  await fetch(`/api/rooms/${roomId}/qa`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "upvote", id: q.id }),
                  });
                  refresh();
                }}
                className="flex h-9 w-7 shrink-0 flex-col items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
                title="Upvote"
              >
                <span className="text-xs text-white/60">+</span>
                <span className="text-[10px] font-mono text-white/70">{q.upvotes ?? 0}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-white/40">{q.asker_name || q.asker}</div>
                <div className="mt-0.5 text-[13px] text-white/80">{q.question}</div>
                {q.answer && (
                  <div className="mt-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/70">
                    <span className="font-medium text-white/60">Answer:</span> {q.answer}
                  </div>
                )}
                {isAdmin && (
                  <div className="mt-2 flex gap-1.5">
                    {!q.approved && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/rooms/${roomId}/qa`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "approve", id: q.id }),
                          });
                          refresh();
                        }}
                        className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const ans = prompt("Answer this question:");
                        if (!ans) return;
                        await fetch(`/api/rooms/${roomId}/qa`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "answer", id: q.id, answer: ans, answeredBy: userName }),
                        });
                        refresh();
                      }}
                      className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
                    >
                      Answer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="flex items-center gap-2 border-t border-white/10 bg-[#0f0f14]/80 p-3 backdrop-blur"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-30">
          Ask
        </button>
      </form>
    </div>
  );
}

// === Notes tab ===
function NotesTab({ roomId, identity, userName }: { roomId: string; identity: string; userName: string }) {
  const [body, setBody] = useState("");
  const [editors, setEditors] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const last = useRef("");

  const refresh = async () => {
    const r = await fetch(`/api/rooms/${roomId}/notes`);
    const data = await r.json();
    if (data.notes && data.notes.body !== last.current) {
      last.current = data.notes.body;
      setBody(data.notes.body);
    }
    if (typeof data.notes?.updated_at === "number" && data.notes.updated_at > 0) {
      setSavedAt(data.notes.updated_at);
    }
    if (Array.isArray(data.notes?.editors)) setEditors(data.notes.editors);
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [roomId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (body !== last.current) {
        last.current = body;
        fetch(`/api/rooms/${roomId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, by: userName }),
        });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [body]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[10px] text-white/40">
        <span suppressHydrationWarning>{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}` : "Not saved yet"}</span>
        <span>{body.length} chars</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Notes auto-save as you type. Markdown supported."
        className="h-full w-full flex-1 resize-none bg-transparent p-4 text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
      />
    </div>
  );
}