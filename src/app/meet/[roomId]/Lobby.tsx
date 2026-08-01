"use client";

// Lobby / waiting room screen
// Shown when the user is in the room but waiting to be admitted (canPublish=false)

import { useEffect, useState } from "react";

export function LobbyScreen({
  roomId,
  identity,
  userName,
  onAdmitted,
  onLeave,
}: {
  roomId: string;
  identity: string;
  userName: string;
  onAdmitted: () => void;
  onLeave: () => void;
}) {
  const [knocking, setKnocking] = useState(false);
  const [knockedAt, setKnockedAt] = useState<number | null>(null);
  const [rejected, setRejected] = useState(false);

  async function knock() {
    setKnocking(true);
    setKnockedAt(Date.now());
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, userName }),
      });
    } catch {}
  }

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/state`);
        if (r.ok) {
          const data = await r.json();
          if (data.admitted) {
            onAdmitted();
          }
          if (data.rejected) {
            setRejected(true);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [roomId, onAdmitted]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gray-950 p-6 text-white">
      {/* Ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(251,191,36,0.18), transparent 50%), radial-gradient(circle at 70% 60%, rgba(99,102,241,0.18), transparent 50%)",
        }}
      />

      <div className="relative max-w-md text-center animate-fadeIn">
        {/* Animated waiting icon */}
        <div className="relative mx-auto h-24 w-24">
          <div
            className="absolute inset-0 rounded-full opacity-50 pulse-halo"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.7) 0%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <svg className="h-10 w-10 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-2xl font-semibold tracking-tight">Waiting for the host</h2>
        <p className="mt-2 text-sm text-white/55 leading-relaxed">
          You&apos;re in the waiting room for{" "}
          <code className="rounded-md bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 font-mono text-white/80 text-xs">/{roomId}</code>
        </p>

        {rejected ? (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 backdrop-blur-xl">
            <p className="text-sm text-red-200">The host didn&apos;t admit you to this meeting.</p>
            <button
              onClick={onLeave}
              className="mt-4 rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
            >
              Leave
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/50">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.04] ring-1 ring-white/10 text-[10px] font-bold text-white/80">
                {userName?.[0]?.toUpperCase() || "?"}
              </span>
              <span className="font-medium text-white/85">{userName}</span>
              <span className="text-white/30">is waiting to join</span>
            </div>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={knock}
                disabled={knocking}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:hover:scale-100"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                {knocking ? "✓ Knock sent" : "Let me in"}
              </button>
              <button
                onClick={onLeave}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors backdrop-blur-xl"
              >
                Leave
              </button>
            </div>

            {knockedAt && (
              <p className="mt-3 text-[11px] text-white/40 font-mono" suppressHydrationWarning>
                Knocked at {new Date(knockedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </p>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/25">
              <span className="h-px w-8 bg-white/10" />
              <span>Waiting room</span>
              <span className="h-px w-8 bg-white/10" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}