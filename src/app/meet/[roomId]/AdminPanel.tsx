"use client";

// Admin panel — Lock/unlock, mute-all, end, manage participants, breakouts
// Extracted from RoomClient to keep that file small

import { useEffect, useState } from "react";

type Tab = "main" | "breakouts";

export function AdminPanel({
  roomId, participants, locked, onClose, onChanged,
}: {
  roomId: string;
  participants: any[];
  locked: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("main");
  const [breakoutInput, setBreakoutInput] = useState("");
  const [breakouts, setBreakouts] = useState<string[]>([]);

  const refreshBreakouts = async () => {
    const r = await fetch(`/api/rooms/${roomId}/breakouts`);
    const data = await r.json();
    setBreakouts(data.breakouts ?? []);
  };
  useEffect(() => {
    refreshBreakouts();
    const t = setInterval(refreshBreakouts, 3000);
    return () => clearInterval(t);
  }, [roomId]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    const url = body.identity
      ? `/api/rooms/${roomId}/participants`
      : `/api/rooms/${roomId}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (r.ok) onChanged();
  }

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-full max-w-md animate-slideInR flex-col border-l border-white/10 bg-[#0a0a0f] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Manage meeting</h2>
        <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
      </div>

      <div className="flex gap-1 border-b border-white/10 px-3 pt-2">
        {(["main", "breakouts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium " +
              (tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
            }
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "main" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => act("mute-all")} className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs hover:bg-white/10">Mute all</button>
              <button
                onClick={() => act(locked ? "unlock" : "lock")}
                className={
                  "rounded-md border px-3 py-2.5 text-xs " +
                  (locked ? "border-yellow-700 bg-yellow-900/40 text-yellow-200" : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                {locked ? "Unlock" : "Lock"} room
              </button>
              <button
                onClick={() => { if (confirm("End for everyone?")) act("end"); }}
                className="col-span-2 rounded-md border border-red-700 bg-red-900/40 px-3 py-2.5 text-xs text-red-200 hover:bg-red-900/60"
              >
                End meeting
              </button>
            </div>
            {locked && (
              <p className="mt-3 rounded border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                Room is locked. New joiners will land in the lobby.
              </p>
            )}

            <h3 className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Participants ({participants.length})
            </h3>
            {participants.length === 0 ? (
              <p className="text-xs text-white/40">No one else is here.</p>
            ) : (
              <ul className="space-y-1">
                {participants.map((p) => (
                  <li key={p.sid} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{p.name || p.identity}</div>
                      <div className="text-[10px] text-white/40">{p.isMuted ? "Muted" : "Live"}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => act("mute", { identity: p.identity })} className="rounded px-2 py-1 text-[10px] hover:bg-white/10">Mute</button>
                      <button
                        onClick={() => { if (confirm(`Remove ${p.name}?`)) act("kick", { identity: p.identity }); }}
                        className="rounded px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "breakouts" && (
          <div>
            <div className="flex gap-2">
              <input
                value={breakoutInput}
                onChange={(e) => setBreakoutInput(e.target.value)}
                placeholder="team-a, team-b"
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs placeholder:text-white/30"
              />
              <button
                onClick={async () => {
                  const subs = breakoutInput.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!subs.length) return;
                  await fetch(`/api/rooms/${roomId}/breakouts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subRooms: subs, createdBy: "admin" }),
                  });
                  setBreakoutInput("");
                  refreshBreakouts();
                }}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              >
                Create
              </button>
            </div>
            {breakouts.length > 0 && (
              <div className="mt-3 space-y-1">
                {breakouts.map((b) => (
                  <div key={b} className="flex items-center justify-between rounded border border-white/10 px-2 py-1.5 text-xs">
                    <span>{b}</span>
                    <button
                      onClick={async () => {
                        const sub = prompt(`Move which identity to ${b}?`);
                        if (sub) {
                          await fetch(`/api/rooms/${roomId}/breakouts/assign`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ identity: sub, subRoom: b }),
                          });
                        }
                      }}
                      className="text-white/40 hover:text-white"
                    >
                      Move
                    </button>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    await fetch(`/api/rooms/${roomId}/breakouts/close`, { method: "POST" });
                    refreshBreakouts();
                  }}
                  className="mt-2 w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
                >
                  Close all & return
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}