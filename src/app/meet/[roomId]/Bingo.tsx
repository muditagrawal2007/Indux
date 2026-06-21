"use client";

// Bingo — multiplayer meeting bingo. Players get a 5x5 card of corporate-meeting
// clichés and clichés. Mark squares manually, or have the system auto-detect
// phrases from chat/captions. First to bingo (row/col/diagonal) wins.

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";
import { fireConfetti } from "./Confetti";

type Card = {
  id: number;
  room: string;
  identity: string;
  name: string | null;
  phrases: string[];
  marks: boolean[];
  has_bingo: boolean;
  completed_at: number | null;
  created_at: number;
};

type LeaderEntry = { identity: string; name: string | null; has_bingo: boolean; completed_at: number | null; marks: number };

const WIN_LINES = [
  // Rows
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  // Cols
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  // Diagonals
  [0,6,12,18,24],[4,8,12,16,20],
];

export function Bingo({
  roomId, userName, onClose,
}: {
  roomId: string;
  userName: string;
  onClose: () => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [autoMarkOn, setAutoMarkOn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cR, lbR] = await Promise.all([
          fetch(`/api/rooms/${roomId}/bingo?identity=${encodeURIComponent(userName)}`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/bingo?view=leaderboard`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setCard(cR.card ?? null);
        setLeaderboard(lbR.leaderboard ?? []);
      } catch {}
    }
    load();
    const t = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId, userName]);

  // Poll chat & captions for phrases, auto-mark when detected
  useEffect(() => {
    if (!autoMarkOn || !card || card.has_bingo) return;
    let cancelled = false;
    let sinceChat = 0;
    let sinceTx = 0;

    async function scan() {
      if (cancelled || !card) return;
      try {
        const [chatR, txR] = await Promise.all([
          fetch(`/api/rooms/${roomId}/chat?since=${sinceChat}`).then((r) => r.json()).catch(() => ({ messages: [] })),
          fetch(`/api/rooms/${roomId}/transcripts?since=${sinceTx}`).then((r) => r.json()).catch(() => ({ lines: [] })),
        ]);
        if (cancelled) return;

        const phrases = card.phrases.map((p) => p.toLowerCase());
        const check = (text: string, _src: "chat" | "transcript") => {
          const lower = text.toLowerCase();
          for (let i = 0; i < phrases.length; i++) {
            if (lower.includes(phrases[i])) {
              // Skip center FREE
              if (i >= 12) i++;
              if (i === 12) return;
              fetch(`/api/rooms/${roomId}/bingo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "auto-mark", identity: userName, phrase: card.phrases[i] }),
              }).catch(() => {});
              return;
            }
          }
        };

        for (const m of chatR.messages ?? []) {
          sinceChat = Math.max(sinceChat, m.id ?? 0);
          check(m.body, "chat");
        }
        for (const l of txR.lines ?? []) {
          sinceTx = Math.max(sinceTx, l.id ?? 0);
          check(l.text, "transcript");
        }
      } catch {}
    }

    scan();
    const t = setInterval(scan, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [autoMarkOn, card?.has_bingo, roomId, userName]);

  // Celebrate when bingo happens
  useEffect(() => {
    if (card?.has_bingo) {
      sfx.confetti();
      fireConfetti("center", { count: 200, palette: "rainbow" });
    }
  }, [card?.has_bingo]);

  async function toggle(idx: number) {
    if (!card || idx === 12) return; // center is FREE
    try {
      const r = await fetch(`/api/rooms/${roomId}/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", identity: userName, index: idx }),
      });
      const d = await r.json();
      setCard(d.card);
      sfx.reaction();
    } catch {}
  }

  const myMarks = card?.marks ?? [];
  const winLine = card ? findWinLine(myMarks) : null;

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0a0a14]/95 via-[#10101c]/95 to-[#06060e]/95 backdrop-blur-xl animate-fadeIn flex">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl shadow-lg"
                 style={{ background: "linear-gradient(135deg, #f97316, #facc15)" }}>
              <span className="text-base">B</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Meeting Bingo</div>
              <div className="text-[10px] text-white/40">Mark squares as people say them · auto-detect on</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoMarkOn((s) => !s)}
              className={
                "rounded-lg border px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 " +
                (autoMarkOn
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Auto-mark {autoMarkOn ? "on" : "off"}
            </button>
            <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <Icon.Close size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 overflow-auto p-6">
          {!card ? (
            <div className="text-center text-white/40 text-sm">Loading your card…</div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {card.has_bingo && (
                <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 p-4 text-center animate-bounceIn">
                  <div className="text-3xl">🎉</div>
                  <div className="mt-1 text-lg font-bold text-amber-300">BINGO!</div>
                  <div className="text-xs text-white/60">You're a corporate mastermind.</div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
                {card.phrases.map((phrase, i) => {
                  const marked = myMarks[i] ?? false;
                  const isCenter = i === 12;
                  const isWin = winLine?.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggle(i)}
                      disabled={isCenter}
                      className={
                        "relative aspect-square rounded-lg p-1.5 text-[10px] sm:text-xs font-medium transition-all " +
                        (isCenter
                          ? "cursor-default bg-gradient-to-br from-amber-400 to-orange-500 text-black font-bold"
                          : marked
                            ? isWin
                              ? "bg-gradient-to-br from-emerald-400 to-cyan-400 text-black shadow-lg scale-105 ring-2 ring-emerald-300"
                              : "bg-gradient-to-br from-emerald-400 to-cyan-400 text-black shadow-md"
                            : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/20")
                      }
                      title={phrase}
                    >
                      <span className="line-clamp-3 leading-tight">{isCenter ? "FREE" : phrase}</span>
                      {marked && !isCenter && (
                        <span className="absolute top-0.5 right-0.5 text-[8px] font-bold">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-center text-[10px] text-white/40">
                {myMarks.filter(Boolean).length}/25 marked · {card.phrases.length} phrases on your card
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/30">
        <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-wider text-white/40">
          Bingo winners
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {leaderboard.length === 0 ? (
            <div className="px-2 py-6 text-center text-[11px] text-white/40">
              No cards yet. Open the bingo panel to join.
            </div>
          ) : (
            leaderboard.map((l, i) => {
              const wins = marksToWinCount(l.marks as any);
              return (
                <div
                  key={l.identity}
                  className={
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs " +
                    (l.identity === userName
                      ? "border-amber-400/40 bg-amber-400/10"
                      : l.has_bingo
                        ? "border-emerald-400/30 bg-emerald-400/5"
                        : "border-white/5 bg-white/[0.02]")
                  }
                >
                  <span className="w-5 text-center text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{l.name ?? l.identity}</div>
                    <div className="text-[10px] text-white/40">{l.has_bingo ? "BINGO!" : `${countTrueMarks(l.marks as any)}/25`}</div>
                  </div>
                  {l.has_bingo && <span className="text-amber-300">★</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function marksToWinCount(marksJson: string): number {
  try {
    const marks = JSON.parse(marksJson) as boolean[];
    let wins = 0;
    for (const line of WIN_LINES) {
      if (line.every((i) => marks[i])) wins++;
    }
    return wins;
  } catch { return 0; }
}

function countTrueMarks(marksJson: string): number {
  try {
    const marks = JSON.parse(marksJson) as boolean[];
    return marks.filter(Boolean).length;
  } catch { return 0; }
}

function findWinLine(marks: boolean[]): number[] | null {
  for (const line of WIN_LINES) {
    if (line.every((i) => marks[i])) return line;
  }
  return null;
}