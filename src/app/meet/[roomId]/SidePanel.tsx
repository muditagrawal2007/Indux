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
    <aside className="animate-slideInR relative flex h-full w-[380px] max-w-[85vw] shrink-0 flex-col border-l border-white/10 bg-[#16161e]/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-0.5 border-b border-white/10 px-2 py-2.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChangeTab(t.id)}
            className={
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 " +
              (tab === t.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5")
            }
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors" aria-label="Close panel">
          <Icon.Close size={14} />
        </button>
      </div>
      {/* pb-24 leaves room above the floating bottom toolbar so the chat
          input / poll composer doesn't get hidden behind it. */}
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
    refresh(true);
    const t = setInterval(() => refresh(false), 3000);
    return () => clearInterval(t);
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
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {msgs.length === 0 && (
          <p className="py-12 text-center text-xs text-white/30">
            No messages yet. Say hi.
          </p>
        )}
        {msgs.map((m) => {
          let reactions: Record<string, string[]> = {};
          try {
            const meta = m.meta ? JSON.parse(m.meta) : {};
            reactions = meta.reactions ?? {};
          } catch {}
          const msgReactions = reactions[String(m.id)] ?? [];
          return (
            <div
              key={m.id}
              className={
                "group relative break-words rounded-lg px-3 py-2 transition-colors " +
                (m._pending ? "opacity-60" : "") +
                (m._failed ? " border border-red-500/40 bg-red-500/5" : " hover:bg-white/[0.04]")
              }
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-white/80">{m.name || m.identity}</span>
                <span className="text-[10px] text-white/30">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-white/80">{m.body}</div>
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
        className="flex items-center gap-2 border-t border-white/10 bg-[#0f0f14]/80 p-3 backdrop-blur"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
        />
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all disabled:opacity-30"
          disabled={!text.trim()}
        >
          <Icon.Send size={16} />
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
        <span>{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}</span>
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