"use client";

// Trivia — live multiplayer quiz game in meetings.
// Host creates a round, everyone answers, fastest correct wins more.
// Leaderboard runs across all rounds in the meeting.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";
import { fireConfetti } from "./Confetti";

type Round = {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  category: string | null;
  created_by: string;
  created_at: number;
};

type StarterQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  category?: string;
};

type LeaderEntry = { identity: string; name: string | null; total_score: number; correct: number; rounds: number };

const STARTER_QUESTIONS: StarterQuestion[] = [
  { question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct_index: 1, category: "Science" },
  { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Monet"], correct_index: 1, category: "Art" },
  { question: "What's the smallest country in the world?", options: ["Monaco", "Vatican", "San Marino", "Liechtenstein"], correct_index: 1, category: "Geography" },
  { question: "What does HTTP stand for?", options: ["HyperText Transfer Protocol", "High Transfer Text Protocol", "HyperText Transport Process", "Host Transfer Type Protocol"], correct_index: 0, category: "Tech" },
  { question: "Which language is primarily spoken in Brazil?", options: ["Spanish", "Portuguese", "Brazilian", "French"], correct_index: 1, category: "Culture" },
  { question: "How many keys are on a standard piano?", options: ["76", "82", "88", "92"], correct_index: 2, category: "Music" },
  { question: "What year did the first iPhone launch?", options: ["2005", "2007", "2009", "2010"], correct_index: 1, category: "Tech" },
  { question: "Which element has the chemical symbol 'Au'?", options: ["Silver", "Gold", "Copper", "Iron"], correct_index: 1, category: "Science" },
];

export function Trivia({
  roomId, userName, isAdmin, onClose,
}: {
  roomId: string;
  userName: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [active, setActive] = useState<Round | null>(null);
  const [phase, setPhase] = useState<"lobby" | "answering" | "reveal">("lobby");
  const [selected, setSelected] = useState<number | null>(null);
  const [myScore, setMyScore] = useState<{ correct: boolean; score: number } | null>(null);
  const [results, setResults] = useState<Array<{ identity: string; name: string; answer_index: number; score: number; response_ms: number }>>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [composer, setComposer] = useState(false);
  const [draftQ, setDraftQ] = useState("");
  const [draftOpts, setDraftOpts] = useState<string[]>(["", "", "", ""]);
  const [draftCorrect, setDraftCorrect] = useState(0);
  const [draftCat, setDraftCat] = useState("");
  const timerStartRef = useRef(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [roundsR, lbR] = await Promise.all([
          fetch(`/api/rooms/${roomId}/trivia`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/trivia?view=leaderboard`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setRounds(roundsR.rounds ?? []);
        setLeaderboard(lbR.leaderboard ?? []);
      } catch {}
    }
    load();
    const t = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  // Countdown for answer phase
  useEffect(() => {
    if (phase !== "answering") return;
    let cancelled = false;
    function startCountdown() {
      if (cancelled) return;
      setCountdown(15);
    }
    startCountdown();
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c == null) return c;
        if (c <= 1) {
          clearInterval(t);
          if (!submittingRef.current && selected == null) {
            // Auto-submit with no answer
            submit(-1, timerStartRef.current);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [phase, active?.id]);

  async function startRound(q: StarterQuestion) {
    try {
      const r = await fetch(`/api/rooms/${roomId}/trivia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          category: q.category,
          created_by: userName,
        }),
      });
      const d = await r.json();
      if (d.round) {
        setActive(d.round);
        setPhase("answering");
        setSelected(null);
        setMyScore(null);
        setResults([]);
        setCountdown(15);
        timerStartRef.current = Date.now();
        submittingRef.current = false;
        sfx.poll();
      }
    } catch {}
  }

  async function submit(idx: number, startedAt: number) {
    if (!active || submittingRef.current) return;
    submittingRef.current = true;
    const responseMs = Date.now() - startedAt;
    try {
      const r = await fetch(`/api/rooms/${roomId}/trivia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          round_id: active.id,
          identity: userName,
          name: userName,
          answer_index: idx,
          response_ms: responseMs,
        }),
      });
      const d = await r.json();
      setSelected(idx);
      setMyScore({ correct: d.correct, score: d.score });
      if (d.correct) sfx.reaction();
    } catch {}
  }

  async function reveal() {
    if (!active) return;
    try {
      const r = await fetch(`/api/rooms/${roomId}/trivia?view=results&round=${active.id}`);
      const d = await r.json();
      setResults(d.results ?? []);
      setPhase("reveal");
      sfx.confetti();
      fireConfetti("center", { count: 80, palette: "rainbow" });
    } catch {}
  }

  // Auto-reveal when most have answered
  useEffect(() => {
    if (phase !== "answering" || !active) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/rooms/${roomId}/trivia?view=results&round=${active.id}`).then((rr) => rr.json()).catch(() => ({ results: [] }));
      setResults(r.results ?? []);
      // Auto-reveal when 4+ answered or after 8s of phase
      if ((r.results ?? []).length >= 4) {
        reveal();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [phase, active?.id, roomId]);

  function pickStarter(i: number) {
    startRound(STARTER_QUESTIONS[i]);
  }

  function submitCustom() {
    const opts = draftOpts.filter((o) => o.trim());
    if (!draftQ.trim() || opts.length < 2) return;
    startRound({
      question: draftQ.trim(),
      options: opts,
      correct_index: Math.min(draftCorrect, opts.length - 1),
      category: draftCat.trim() || undefined,
    });
    setComposer(false);
    setDraftQ("");
    setDraftOpts(["", "", "", ""]);
    setDraftCorrect(0);
    setDraftCat("");
  }

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0a0a14]/95 via-[#10101c]/95 to-[#06060e]/95 backdrop-blur-xl animate-fadeIn flex">
      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl shadow-lg"
                 style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
              <Icon.Bolt size={14} />
            </div>
            <div>
              <div className="text-sm font-semibold">Trivia</div>
              <div className="text-[10px] text-white/40">Fastest correct wins · 1000 + up to 500 speed bonus</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
            <Icon.Close size={11} /> Exit
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase === "lobby" && (
            <Lobby
              isAdmin={isAdmin}
              composerOpen={composer}
              setComposerOpen={setComposer}
              draftQ={draftQ} setDraftQ={setDraftQ}
              draftOpts={draftOpts} setDraftOpts={setDraftOpts}
              draftCorrect={draftCorrect} setDraftCorrect={setDraftCorrect}
              draftCat={draftCat} setDraftCat={setDraftCat}
              onSubmitCustom={submitCustom}
              onPickStarter={pickStarter}
              roundCount={rounds.length}
            />
          )}

          {phase === "answering" && active && (
            <Answering
              round={active}
              selected={selected}
              countdown={countdown}
              startedAt={timerStartRef.current}
              onAnswer={submit}
              results={results}
              myScore={myScore}
            />
          )}

          {phase === "reveal" && active && (
            <Reveal round={active} results={results} myIdentity={userName} onNext={() => setPhase("lobby")} />
          )}
        </div>
      </div>

      {/* Leaderboard sidebar */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/30">
        <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-wider text-white/40">
          Leaderboard · this meeting
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {leaderboard.length === 0 ? (
            <div className="px-2 py-6 text-center text-[11px] text-white/40">
              No scores yet. First correct answer takes the lead.
            </div>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((l, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={l.identity}
                    className={
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs " +
                      (l.identity === userName
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-white/5 bg-white/[0.02]")
                    }
                  >
                    <span className="w-5 text-center text-sm">{medals[i] ?? `#${i + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{l.name ?? l.identity}</div>
                      <div className="text-[10px] text-white/40">{l.correct}/{l.rounds} correct</div>
                    </div>
                    <div className="font-mono tabular-nums text-emerald-300">{l.total_score}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Lobby({
  isAdmin, composerOpen, setComposerOpen,
  draftQ, setDraftQ, draftOpts, setDraftOpts,
  draftCorrect, setDraftCorrect, draftCat, setDraftCat,
  onSubmitCustom, onPickStarter, roundCount,
}: any) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#16161e] to-[#0a0a14] p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl shadow-2xl"
             style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
          <Icon.Bolt size={26} />
        </div>
        <h2 className="text-2xl font-semibold">Ready for a quick round?</h2>
        <p className="mt-2 text-sm text-white/50">
          Pick a starter question or compose your own. Fastest correct wins +500.
        </p>
        <div className="mt-1 text-[11px] text-white/40">{roundCount} round{roundCount === 1 ? "" : "s"} played this meeting</div>
      </div>

      {isAdmin && (
        <>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Starter questions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onPickStarter(i)}
                  className="group text-left rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-all hover:border-emerald-400/30 hover:bg-emerald-400/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-300">{q.category}</span>
                    <span className="text-[10px] text-white/30">▶ Start</span>
                  </div>
                  <div className="mt-1 text-sm">{q.question}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setComposerOpen(!composerOpen)}
              className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
            >
              {composerOpen ? "▼" : "▶"} Compose custom question
            </button>

            {composerOpen && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 animate-scaleIn">
                <input
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="Question"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
                <input
                  value={draftCat}
                  onChange={(e) => setDraftCat(e.target.value)}
                  placeholder="Category (optional)"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs outline-none focus:border-white/20"
                />
                {draftOpts.map((o: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setDraftCorrect(i)}
                      className={
                        "grid h-7 w-7 place-items-center rounded-md border text-xs font-bold transition-all " +
                        (draftCorrect === i
                          ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10")
                      }
                      title="Mark correct"
                    >✓</button>
                    <input
                      value={o}
                      onChange={(e) => {
                        const arr = [...draftOpts];
                        arr[i] = e.target.value;
                        setDraftOpts(arr);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-white/20"
                    />
                  </div>
                ))}
                <button
                  onClick={onSubmitCustom}
                  disabled={!draftQ.trim() || draftOpts.filter((o: string) => o.trim()).length < 2}
                  className="w-full rounded-lg py-2 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}
                >
                  Launch round
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Answering({ round, selected, countdown, startedAt, onAnswer, results, myScore }: any) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-wider text-emerald-300">{round.category ?? "Trivia"}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">{results.length} answered</span>
          <span className={
            "grid h-8 w-8 place-items-center rounded-full font-mono text-sm tabular-nums " +
            (countdown !== null && countdown <= 5
              ? "bg-red-500/20 text-red-300 animate-pulse"
              : "bg-white/10 text-white/70")
          }>
            {countdown ?? "·"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#16161e] to-[#0a0a14] p-6">
        <h2 className="text-2xl font-semibold leading-snug">{round.question}</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {round.options.map((opt: string, i: number) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => onAnswer(i, startedAt)}
              disabled={selected !== null}
              className={
                "group relative overflow-hidden rounded-xl border p-4 text-left text-sm font-medium transition-all " +
                (isSelected
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200 scale-[1.02]"
                  : selected !== null
                    ? "border-white/5 bg-white/[0.02] text-white/40"
                    : "border-white/10 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]")
              }
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/5 text-[10px] font-mono">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="ml-10">{opt}</span>
            </button>
          );
        })}
      </div>

      {myScore && (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-sm animate-bounceIn">
          {myScore.correct ? `+${myScore.score} points` : "Not quite — better luck next round!"}
        </div>
      )}
    </div>
  );
}

function Reveal({ round, results, myIdentity, onNext }: any) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#16161e] to-[#0a0a14] p-6 text-center">
        <div className="text-[10px] uppercase tracking-wider text-emerald-300">{round.category ?? "Trivia"}</div>
        <h2 className="mt-2 text-xl font-semibold">{round.question}</h2>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-300">
          ✓ Correct: {round.options[round.correct_index]}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
        {results.length === 0 ? (
          <div className="p-4 text-center text-xs text-white/40">Nobody answered.</div>
        ) : (
          results.sort((a: any, b: any) => b.score - a.score).map((r: any, i: number) => (
            <div
              key={r.identity}
              className={
                "flex items-center gap-3 px-4 py-2.5 text-sm " +
                (r.identity === myIdentity ? "bg-cyan-400/5" : "")
              }
            >
              <span className="w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
              <span className="flex-1 truncate">{r.name ?? r.identity}</span>
              <span className="text-[10px] text-white/40 tabular-nums">{(r.response_ms / 1000).toFixed(1)}s</span>
              <span className="w-16 text-right font-mono tabular-nums text-emerald-300">{r.score}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onNext}
        className="mt-5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
      >
        Next round →
      </button>
    </div>
  );
}