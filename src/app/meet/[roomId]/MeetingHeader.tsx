"use client";

import { useState } from "react";

type Props = {
  roomId: string;
  participantCount: number;
  locked: boolean;
  recording: boolean;
  onShare: () => void;
  onAdmin: () => void;
  onSettings: () => void;
  onChat: () => void;
  onPeople: () => void;
  isAdmin: boolean;
  isEmbed: boolean;
};

// Compact, polished top bar that matches the design system
export function MeetingHeader({
  roomId, participantCount, locked, recording, onShare, onAdmin, onSettings, onChat, onPeople, isAdmin, isEmbed,
}: Props) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/${roomId}` : `/meet/${roomId}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-gray-950/80 backdrop-blur-md px-4 py-2">
      <div className="flex items-center gap-3 text-sm text-white">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
          >
            IX
          </div>
          <span className="font-semibold tracking-tight">Indux Meet</span>
        </div>
        <span className="text-white/30">·</span>
        <code className="font-mono text-xs tracking-wider text-white/60">/{roomId}</code>

        <div className="flex items-center gap-1.5">
          {locked && (
            <span className="badge badge-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />Locked
            </span>
          )}
          {recording && (
            <span className="badge badge-danger">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />REC
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-white/70 tabular-nums">{participantCount}</span>
          <span className="text-white/40">in room</span>
        </div>

        <button
          onClick={() => copy()}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10"
          title="Copy link"
        >
          {copied ? "Copied" : "Copy link"}
        </button>

        <button
          onClick={onChat}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10"
        >
          Chat
        </button>
        <button
          onClick={onPeople}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10"
        >
          People
        </button>

        {!isEmbed && (
          <button
            onClick={onSettings}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10"
          >
            Settings
          </button>
        )}

        {!isEmbed && isAdmin && (
          <button
            onClick={onAdmin}
            className="rounded-md border border-white/20 bg-white/10 px-3 py-1 font-medium text-white hover:bg-white/15"
          >
            Manage
          </button>
        )}

        <button
          onClick={onShare}
          className="rounded-md px-3 py-1 text-xs font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Share
        </button>
      </div>
    </header>
  );
}