"use client";

// Zoom-style participant list panel
// Each row shows: avatar with status dot, name, mic state, hand raised, admin actions

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";

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
  const [handRaises, setHandRaises] = useState<{ identity: string; raised_at: number }[]>([]);
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
            </div>
          )}
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="mt-3 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />
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
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => act("mute", p.identity)}
                      title="Mute"
                      className="rounded p-1 text-white/60 hover:bg-white/10"
                    >
                      <Icon.MicOff size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove ${displayName}?`)) act("kick", p.identity); }}
                      title="Remove"
                      className="rounded p-1 text-red-300 hover:bg-red-500/20"
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
    </div>
  );
}
