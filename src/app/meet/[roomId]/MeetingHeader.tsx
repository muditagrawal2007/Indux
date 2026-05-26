"use client";

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
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Header stays visible — never auto-hide (Zoom pattern).
  // Earlier we hid the header after 5s of no mouse movement, but that
  // made the Manage button unreachable. Now it's permanently visible.

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timerStr = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <header
      className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent px-4 py-3 backdrop-blur-sm"
    >
      {/* Left: branding + room info */}
      <div className="flex items-center gap-2 text-sm text-white">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
          >
            IX
          </div>
          <span className="font-semibold tracking-tight hidden sm:inline">Indux Meet</span>
        </div>
        <code className="font-mono text-xs tracking-wider text-white/40">/{roomId}</code>

        {locked && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Locked
          </span>
        )}

        {recording && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            REC
          </span>
        )}
      </div>

      {/* Right: timer + actions — hidden on mobile */}
      <div className="hidden md:flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-xs tabular-nums text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          {timerStr}
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/50 backdrop-blur-sm">
          <Icon.Users size={11} />
          <span className="tabular-nums">{participantCount}</span>
        </div>

        <button onClick={() => copy()} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/70 transition-all" title="Copy link">
          {copied ? (
            <span className="flex items-center gap-1"><Icon.Check size={11} /> Copied</span>
          ) : (
            <span className="flex items-center gap-1"><Icon.Link size={11} /> Copy link</span>
          )}
        </button>

        {!isEmbed && isAdmin && (
          <button onClick={onAdmin} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/70 transition-all flex items-center gap-1">
            <Icon.Shield size={11} /> Manage
          </button>
        )}

        <button onClick={onShare} className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/15 hover:text-white transition-all flex items-center gap-1.5">
          <Icon.Share size={11} /> Invite
        </button>
      </div>

      {/* Mobile: timer + overflow menu */}
      <div className="flex md:hidden items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 font-mono text-[10px] tabular-nums text-white/60 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          {timerStr}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
            aria-label="Menu"
          >
            <Icon.More size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-1 shadow-2xl backdrop-blur-xl animate-scaleIn">
                <button onClick={() => { copy(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white/80 transition-colors">
                  <Icon.Link size={14} /> Copy link
                </button>
                {!isEmbed && isAdmin && (
                  <button onClick={() => { onAdmin(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white/80 transition-colors">
                    <Icon.Shield size={14} /> Manage
                  </button>
                )}
                <button onClick={() => { onShare(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white/80 transition-colors">
                  <Icon.Share size={14} /> Invite
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
