"use client";

// Zoom-style participant list panel
// Each row shows: avatar with status dot, name, mic state, hand raised, admin actions

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type Participant = {
  sid: string;
  identity: string;
  name?: string;
  isMuted?: boolean;
  isHandRaised?: boolean;
  isPublisher?: boolean;
  joinedAtMs?: number;
};

export function ParticipantsPanel({
  roomId, isAdmin, identity,
}: {
  roomId: string;
  isAdmin: boolean;
  identity: string;
}) {
  const [list, setList] = useState<Participant[]>([]);
  const [cohosts, setCohosts] = useState<string[]>([]);
  const [handRaises, setHandRaises] = useState<{ identity: string; name: string | null; raised_at: number }[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [partsRes, cohostsRes, handRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/cohosts`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/hand`).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setList(partsRes.participants ?? []);
          setCohosts(cohostsRes.cohosts ?? []);
          setHandRaises(handRes.hands ?? handRes.hand ?? []);
        }
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  async function act(action: string, target: string) {
    await fetch(`/api/rooms/${roomId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, identity: target }),
    });
  }

  const [confirmRemove, setConfirmRemove] = useState<{ identity: string; name: string } | null>(null);
  function removeWithConfirm(identity: string, name: string) {
    setConfirmRemove({ identity, name });
  }
  async function doRemove() {
    if (confirmRemove) {
      await act("kick", confirmRemove.identity);
      setConfirmRemove(null);
    }
  }

  async function roomAction(action: string) {
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  // Add yourself to the list (admin always sees self)
  const allList: Participant[] = [
    { sid: "self", identity, name: `${identity} (You)`, isMuted: false, isHandRaised: false },
    ...list.filter((p) => p.identity !== identity),
  ];

  const filtered = allList.filter((p) => {
    const q = filter.toLowerCase();
    return !q || (p.name || p.identity).toLowerCase().includes(q);
  });

  const handRaisedSet = new Set(handRaises.map((h) => h.identity));

  return (
    <div className="flex h-full flex-col">
      {/* Header actions */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{allList.length} in meeting</div>
            {cohosts.length > 0 && (
              <div className="text-[10px] text-white/50">{cohosts.length} co-host(s)</div>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <button
                onClick={() => roomAction("mute-all")}
                title="Mute all"
                className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Icon.MicOff size={14} />
              </button>
              <button
                onClick={() => roomAction("lock")}
                title="Lock room"
                className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Icon.Lock size={14} />
              </button>
              {handRaises.length > 0 && (
                <button
                  onClick={() => {
                    fetch(`/api/rooms/${roomId}/hand`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "lower-all" }),
                    });
                  }}
                  title="Lower all hands"
                  className="rounded p-1.5 text-amber-300/80 hover:bg-amber-500/15 hover:text-amber-200"
                >
                  <Icon.Hand size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="mt-3 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />

        {/* Hand-raise queue */}
        {handRaises.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-2">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              <span className="flex items-center gap-1.5">
                <Icon.Hand size={11} />
                Hand raised · {handRaises.length}
              </span>
            </div>
            <ol className="space-y-1">
              {handRaises.map((h, i) => {
                const me = h.identity === identity;
                const liveName = list.find((p) => p.identity === h.identity)?.name;
                const displayName = h.name ?? liveName ?? h.identity;
                return (
                  <li
                    key={h.identity}
                    className={
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs " +
                      (me ? "bg-amber-500/15 text-amber-100" : "text-amber-100/85")
                    }
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500/30 font-mono text-[10px] font-bold tabular-nums text-amber-50">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{displayName}</span>
                      {me && <span className="text-[10px] text-amber-200/70">— you</span>}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          fetch(`/api/rooms/${roomId}/hand`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "lower", identity: h.identity }),
                          });
                        }}
                        title="Lower hand"
                        className="rounded p-0.5 text-amber-200/60 hover:bg-amber-500/30 hover:text-amber-50"
                      >
                        <Icon.Close size={10} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-white/40">No participants match</div>
        )}
        {filtered.map((p) => {
          const isHost = isAdmin && p.identity === identity;
          const isCoHost = cohosts.includes(p.identity);
          const isSelf = p.identity === identity;
          const displayName = p.name || p.identity;
          const initials = displayName.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2);
          const handUp = handRaisedSet.has(p.identity);

          return (
            <div
              key={p.sid}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
            >
              <div className="relative shrink-0">
                <div
                  className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0a0a0f]">
                  {p.isMuted ? (
                    <span className="grid h-3 w-3 place-items-center rounded-full bg-red-500">
                      <Icon.MicOff size={8} className="text-white" />
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  {isHost && (
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-blue-300">
                      Host
                    </span>
                  )}
                  {isCoHost && !isHost && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-purple-300">
                      Co-host
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/40">
                  {p.isMuted ? "Muted" : "Speaking"}
                  {handUp && " · ✋ Hand raised"}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {handUp && <span className="text-base">✋</span>}
                {!isSelf && isAdmin && (
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => act(p.isMuted ? "unmute" : "mute", p.identity)}
                      title={p.isMuted ? "Ask to unmute" : "Mute"}
                      className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {p.isMuted ? <Icon.Mic size={14} /> : <Icon.MicOff size={14} />}
                    </button>
                    <button
                      onClick={() => act(isCoHost ? "demote" : "promote", p.identity)}
                      title={isCoHost ? "Demote from co-host" : "Make co-host"}
                      className={
                        "rounded p-1 transition-colors " +
                        (isCoHost
                          ? "bg-purple-500/20 text-purple-300"
                          : "text-white/60 hover:bg-white/10 hover:text-white")
                      }
                    >
                      <Icon.ShieldCheck size={14} />
                    </button>
                    <button
                      onClick={() => removeWithConfirm(p.identity, displayName)}
                      title="Remove"
                      className="rounded p-1 text-red-300 transition-colors hover:bg-red-500/20"
                    >
                      <Icon.Logout size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmRemove && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className="relative w-[min(420px,92vw)] rounded-2xl border border-white/10 bg-[#16161e]/95 p-5 shadow-2xl backdrop-blur-xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400">
              <Icon.Logout size={18} />
            </div>
            <h3 className="mt-3 text-base font-semibold">Remove {confirmRemove.name}?</h3>
            <p className="mt-1 text-sm text-white/60">
              They&apos;ll be dropped from the call. You can let them back in from the People panel.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  sfx.kick();
                  doRemove();
                }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:bg-red-400 active:scale-95"
              >
                Remove from meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
