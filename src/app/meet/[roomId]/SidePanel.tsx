"use client";

// Side panel with tabs: Chat / People / Q&A / Notes
// Lightweight, no heavy deps

import { useEffect, useRef, useState } from "react";
import { Icon, Reaction } from "../../components/Icons";
import { MessageReactions } from "./Reactions";
import { ParticipantsPanel } from "./ParticipantsPanel";

type Tab = "chat" | "people" | "qa" | "notes";

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
  return (
    <aside className="animate-slideInR relative flex h-full w-[380px] max-w-[85vw] flex-col border-l border-white/10 bg-[#1a1a24]/95 backdrop-blur-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2.5">
        {(["chat", "people", "qa", "notes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChangeTab(t)}
            className={
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 " +
              (tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5")
            }
          >
            {t === "chat" ? <Icon.MessageSquare size={13} /> : t === "people" ? <Icon.Users size={13} /> : t === "qa" ? <Icon.Help size={13} /> : <Icon.FileText size={13} />}
            <span className="capitalize hidden sm:inline">{t}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors">
          <Icon.Close size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab roomId={roomId} identity={identity} userName={userName} />}
        {tab === "people" && <ParticipantsPanel roomId={roomId} isAdmin={isAdmin} identity={identity} />}
        {tab === "qa" && <QATab roomId={roomId} identity={identity} userName={userName} isAdmin={isAdmin} />}
        {tab === "notes" && <NotesTab roomId={roomId} identity={identity} userName={userName} />}
      </div>
    </aside>
  );
}

// === Chat tab ===
function ChatTab({ roomId, identity, userName }: { roomId: string; identity: string; userName: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const sinceRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/chat?since=${sinceRef.current}`);
        const data = await r.json();
        if (data.messages?.length && !cancelled) {
          sinceRef.current = data.messages[data.messages.length - 1].id;
          setMsgs((prev) => [...prev, ...data.messages]);
        }
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await fetch(`/api/rooms/${roomId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, name: userName, body: t }),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        <p className="py-12 text-center text-xs text-[color:var(--text-muted)]">No messages yet. Say hi.</p>
        {msgs.map((m) => {
          let reactions: Record<string, string[]> = {};
          try {
            const meta = m.meta ? JSON.parse(m.meta) : {};
            reactions = meta.reactions ?? {};
          } catch {}
          return (
            <div key={m.id} className="group relative break-words rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-white/80">{m.name || m.identity}</span>
                <span className="text-[10px] text-white/30">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-white/70">{m.body}</div>
              {Object.keys(reactions).length > 0 && (
                <div className="mt-1">
                  <MessageReactions
                    messageId={String(m.id)}
                    roomId={roomId}
                    identity={identity}
                    reactions={reactions}
                  />
                </div>
              )}
              {/* Hover actions */}
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
                      setRefreshKey((k) => k + 1);
                    }}
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
        className="flex items-center gap-2 border-t border-white/10 p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
        />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
          <Icon.Send size={16} />
        </button>
      </form>
    </div>
  );
}

// === People tab ===
function PeopleTab({ roomId, isAdmin, identity }: { roomId: string; isAdmin: boolean; identity: string }) {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/participants`);
        const data = await r.json();
        if (!cancelled) setList(data.participants ?? []);
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    const url = body.identity
      ? `/api/rooms/${roomId}/participants`
      : `/api/rooms/${roomId}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        In this meeting ({list.length})
      </div>
      {list.length === 0 && <p className="text-xs text-[color:var(--text-muted)]">Just you so far.</p>}
      {list.map((p) => (
        <div key={p.sid} className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--bg-sunken)]/50">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-600))" }}>
              {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm text-[color:var(--text-primary)]">{p.name || p.identity}</div>
              <div className="truncate text-[10px] text-[color:var(--text-muted)]">{p.isMuted ? "Muted" : "Speaking"}</div>
            </div>
          </div>
          {isAdmin && p.identity !== identity && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => act("mute", { identity: p.identity })} className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-sunken)]">
                Mute
              </button>
              <button onClick={() => { if (confirm(`Remove ${p.name}?`)) act("kick", { identity: p.identity }); }} className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--danger)] hover:bg-[color:var(--danger)]/15">
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
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
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [roomId, isAdmin]);

  const ask = async () => {
    if (!text.trim()) return;
    setText("");
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asker: identity, asker_name: userName, question: text }),
    });
    refresh();
  };

  const sorted = [...list].sort((a, b) => b.upvotes - a.upvotes || a.created_at - b.created_at);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {sorted.length === 0 && <p className="py-12 text-center text-xs text-[color:var(--text-muted)]">No questions yet.</p>}
        {sorted.map((q) => (
          <div key={q.id} className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-sunken)]/50 p-3">
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
                className="flex h-7 w-6 shrink-0 flex-col items-center justify-center rounded border border-[color:var(--border)] hover:bg-[color:var(--bg-elevated)]"
                title="Upvote"
              >
                <span className="text-[10px] text-[color:var(--text-secondary)]">+</span>
                <span className="text-[10px] text-[color:var(--text-secondary)]">{q.upvotes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[color:var(--text-muted)]">{q.asker_name || q.asker}</div>
                <div className="text-sm text-[color:var(--text-primary)]">{q.question}</div>
                {q.answer && (
                  <div className="mt-1.5 rounded border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-2 py-1 text-xs text-[color:var(--text-secondary)]">
                    {q.answer}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-[color:var(--border)] p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question..."
          className="flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-sunken)] px-2.5 py-1.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none"
        />
        <button onClick={ask} className="rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-xs text-white hover:bg-[color:var(--accent)]/90">Ask</button>
      </div>
    </div>
  );
}

// === Notes tab ===
function NotesTab({ roomId, identity, userName }: { roomId: string; identity: string; userName: string }) {
  const [body, setBody] = useState("");
  const last = useRef("");

  const refresh = async () => {
    const r = await fetch(`/api/rooms/${roomId}/notes`);
    const data = await r.json();
    if (data.notes && data.notes.body !== last.current) {
      last.current = data.notes.body;
      setBody(data.notes.body);
    }
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
    <textarea
      value={body}
      onChange={(e) => setBody(e.target.value)}
      placeholder="Notes auto-save as you type. Markdown supported."
      className="h-full w-full resize-none bg-[color:var(--bg-sunken)] p-4 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none"
    />
  );
}