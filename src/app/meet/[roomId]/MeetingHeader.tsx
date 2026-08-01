"use client";

// Meeting header — slim glass bar across the top of the room.
// Shows: brand, room code, lock/rec states, live timer, participant count,
// copy link, manage (admin), and a primary "Invite" CTA.

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";

type Props = {
  roomId: string;
  participantCount: number;
  locked: boolean;
  recording: boolean;
  onShare: () => void;
  onAdmin: () => void;
  isAdmin: boolean;
  isEmbed: boolean;
};

export function MeetingHeader({
  roomId, participantCount, locked, recording, onShare, onAdmin, isAdmin, isEmbed,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/${roomId}` : `/meet/${roomId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timerStr = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <header
      className="absolute top-0 inset-x-0 z-30 flex items-center justify-between gap-2 px-4 py-3 backdrop-blur-2xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 60%, rgba(0,0,0,0) 100%)",
      }}
    >
      {/* Left: brand + room code + state pills */}
      <div className="flex items-center gap-2.5 text-white min-w-0">
        <div className="flex items-center gap-2 pr-3 border-r border-white/[0.08]">
          <div
            className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white shadow-md ring-1 ring-white/15 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}
          >
            <span className="relative z-10">IX</span>
            <span
              className="absolute inset-0 opacity-50"
              style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 60%)" }}
            />
          </div>
          <span className="hidden sm:inline font-semibold tracking-tight text-[15px]">Indux Meet</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <code className="font-mono text-[13px] tracking-wider text-white/55 truncate">/{roomId}</code>
          <button
            onClick={copy}
            className="rounded-md p-1 text-white/30 hover:text-white hover:bg-white/[0.08] transition-all hover:scale-110 active:scale-95"
            title="Copy link"
            aria-label="Copy link"
          >
            {copied ? <Icon.Check size={11} /> : <Icon.Copy size={11} />}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-1.5 ml-1">
          {locked && <StateBadge tone="danger" icon={<Icon.Lock size={9} />} label="Locked" />}
          {recording && <StateBadge tone="danger" pulse icon={<span className="h-1.5 w-1.5 rounded-full bg-red-400" />} label="REC" />}
          {!locked && !recording && (
            <StateBadge tone="live" pulse label="LIVE" />
          )}
        </div>
      </div>

      {/* Center (sm+): elapsed timer */}
      <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono text-xs tabular-nums text-white/85 tracking-wide">{timerStr}</span>
      </div>

      {/* Right (md+): actions */}
      <div className="hidden md:flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/85 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Icon.Users size={11} className="text-white/55" />
          <span className="tabular-nums font-semibold">{participantCount}</span>
        </div>

        {!isEmbed && isAdmin && (
          <button
            onClick={onAdmin}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:bg-white/[0.10] hover:text-white hover:scale-[1.03] active:scale-[0.97]"
          >
            <Icon.Shield size={11} className="text-amber-300/90" />
            <span>Manage</span>
          </button>
        )}

        <button
          onClick={onShare}
          className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:scale-[1.04] active:scale-[0.97] relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--accent), #a855f7)",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.25), transparent 60%)" }}
          />
          <Icon.Plus size={11} />
          <span className="relative z-10">Invite</span>
        </button>
      </div>

      {/* Mobile: timer + overflow menu */}
      <div className="flex md:hidden items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] tabular-nums text-white/85 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {timerStr}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 backdrop-blur-md hover:bg-white/[0.10] hover:text-white transition-all active:scale-95"
            aria-label="Menu"
          >
            <Icon.More size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-1 shadow-2xl backdrop-blur-2xl animate-scaleIn">
                <button
                  onClick={() => { copy(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Icon.Copy size={12} /> Copy link
                </button>
                {!isEmbed && isAdmin && (
                  <button
                    onClick={() => { onAdmin(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <Icon.Shield size={12} className="text-amber-300/90" /> Manage
                  </button>
                )}
                <button
                  onClick={() => { onShare(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Icon.Plus size={12} /> Invite
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function StateBadge({ tone, icon, label, pulse }: { tone: "live" | "danger"; icon?: React.ReactNode; label: string; pulse?: boolean }) {
  const palette = tone === "danger"
    ? "bg-red-500/15 text-red-300 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.18)]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${palette}`}>
      {icon || (pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />)}
      <span>{label}</span>
    </span>
  );
}