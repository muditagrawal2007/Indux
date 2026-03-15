"use client";

// Side panel with tabs: Chat / People / Q&A / Notes
// Lightweight, no heavy deps

import { useEffect, useRef, useState } from "react";

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
    <aside className="animate-slideInR flex w-96 max-w-[40vw] flex-col border-l border-white/10 bg-[#0f0f14]">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        {(["chat", "people", "qa", "notes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChangeTab(t)}
            className={
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " +
              (tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
            }
          >
            <span className="mr-1">{t === "chat" ? "💬" : t === "people" ? "👥" : t === "qa" ? "❓" : "📝"}</span>
            <span className="capitalize">{t}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab roomId={roomId} identity={identity} userName={userName} />}
        {tab === "people" && <PeopleTab roomId={roomId} isAdmin={isAdmin} identity={identity} />}
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
        {msgs.length === 0 && <p className="py-12 text-center text-xs text-white/40">No messages yet. Say hi 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className="break-words">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-medium text-white/80">{m.name || m.identity}</span>
              <span className="text-[10px] text-white/30">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-white/90">{m.body}</div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-white/10 p-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">
          Send
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
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        In this meeting ({list.length})
      </div>
      {list.length === 0 && <p className="text-xs text-white/40">Just you so far.</p>}
      {list.map((p) => (
        <div key={p.sid} className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-white/5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 grid place-items-center text-xs font-semibold">
              {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm">{p.name || p.identity}</div>
              <div className="truncate text-[10px] text-white/40">{p.isMuted ? "Muted" : "Speaking"}</div>
            </div>
          </div>
          {isAdmin && p.identity !== identity && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => act("mute", { identity: p.identity })}
                className="rounded px-1.5 py-0.5 text-[10px] text-white/60 hover:bg-white/10"
              >
                Mute
              </button>
              <button
                onClick={() => { if (confirm(`Remove ${p.name}?`)) act("kick", { identity: p.identity }); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20"
              >
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
        {sorted.length === 0 && <p className="py-12 text-center text-xs text-white/40">No questions yet.</p>}
        {sorted.map((q) => (
          <div key={q.id} className="rounded-md border border-white/10 bg-white/5 p-3">
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
                className="flex h-7 w-6 shrink-0 flex-col items-center justify-center rounded border border-white/10 hover:bg-white/10"
                title="Upvote"
              >
                <span className="text-[10px]">▲</span>
                <span className="text-[10px]">{q.upvotes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-white/40">{q.asker_name || q.asker}</div>
                <div className="text-sm text-white/90">{q.question}</div>
                {q.answer && (
                  <div className="mt-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                    {q.answer}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        <button onClick={ask} className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">Ask</button>
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
      className="h-full w-full resize-none bg-[#0f0f14] p-4 text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
    />
  );
}