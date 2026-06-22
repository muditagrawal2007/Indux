"use client";

// Polls panel — list, create, vote, close. Used as the "polls" tab in SidePanel.
// Supports both multiple-choice and word-cloud poll kinds.

import { useEffect, useRef, useState } from "react";
import { Icon, Reaction } from "../../components/Icons";
import { WordCloudPoll } from "./WordCloudPoll";

type Poll = {
  id: string;
  room: string;
  question: string;
  options: string[];
  created_by: string;
  created_at: number;
  closed: boolean;
  kind?: "multiple_choice" | "word_cloud";
  results?: { counts: number[]; voters: Record<string, number>; words?: Array<{ word: string; count: number }> };
};

export function PollsTab({
  roomId,
  identity,
  userName,
  isAdmin,
}: {
  roomId: string;
  identity: string;
  userName: string;
  isAdmin: boolean;
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionInputs, setOptionInputs] = useState<string[]>(["", ""]);
  const [pollKind, setPollKind] = useState<"multiple_choice" | "word_cloud">("multiple_choice");
  const [openCloudPollId, setOpenCloudPollId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshRef = useRef(0);

  async function refresh() {
    try {
      const r = await fetch(`/api/rooms/${roomId}/polls`);
      const data = await r.json();
      if (data.polls) {
        setPolls(data.polls);
        // also fetch my votes
        const votes: Record<string, number> = {};
        for (const p of data.polls) {
          try {
            const v = await fetch(`/api/rooms/${roomId}/polls/${p.id}/vote`);
            const vd = await v.json();
            if (vd.results?.voters) {
              // we can't tell "mine" from server results — UI will rely on
              // local `myVotes` map (set after a successful POST).
            }
          } catch {}
        }
      }
    } catch {}
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [roomId]);

  async function create() {
    setError(null);
    const q = question.trim();
    if (!q) { setError("Type a question"); return; }
    const opts = pollKind === "word_cloud"
      ? ["open"] // word cloud polls accept any word
      : optionInputs.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) { setError("Need at least 2 options"); return; }
    setBusy(true);
    const r = await fetch(`/api/rooms/${roomId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, options: opts, createdBy: userName, kind: pollKind }),
    });
    setBusy(false);
    if (r.ok) {
      setQuestion("");
      setOptionInputs(["", ""]);
      setComposerOpen(false);
      refresh();
    } else {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Failed to create poll");
    }
  }

  async function vote(pollId: string, choice: string | number) {
    setError(null);
    const r = await fetch(`/api/rooms/${roomId}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: userName, choice }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Vote failed");
      return;
    }
    // Optimistically update local vote
    const idx = typeof choice === "number" ? choice : -1;
    setMyVotes((prev) => ({ ...prev, [pollId]: idx >= 0 ? idx : (prev[pollId] ?? -1) }));
    refresh();
  }

  async function close(pollId: string) {
    await fetch(`/api/rooms/${roomId}/polls/${pollId}/close`, { method: "POST" });
    refresh();
  }

  function setOption(i: number, value: string) {
    setOptionInputs((arr) => arr.map((v, idx) => (idx === i ? value : v)));
  }
  function addOption() {
    if (optionInputs.length >= 6) return;
    setOptionInputs((arr) => [...arr, ""]);
  }
  function removeOption(i: number) {
    if (optionInputs.length <= 2) return;
    setOptionInputs((arr) => arr.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {openCloudPollId && (
          <WordCloudPoll
            roomId={roomId}
            pollId={openCloudPollId}
            question={polls.find((p) => p.id === openCloudPollId)?.question ?? ""}
            closed={!!polls.find((p) => p.id === openCloudPollId)?.closed}
            identity={userName}
            onClose={() => setOpenCloudPollId(null)}
          />
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => setComposerOpen(!composerOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <Icon.Plus size={14} />
            {composerOpen ? "Cancel" : "Create poll"}
          </button>
        )}

        {composerOpen && isAdmin && (
          <div className="animate-scaleIn rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
            {/* Poll type switcher */}
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => setPollKind("multiple_choice")}
                className={
                  "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors " +
                  (pollKind === "multiple_choice" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80")
                }
              >
                Multiple choice
              </button>
              <button
                onClick={() => setPollKind("word_cloud")}
                className={
                  "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors " +
                  (pollKind === "word_cloud" ? "bg-amber-500/15 text-amber-300" : "text-white/50 hover:text-white/80")
                }
              >
                ☁️ Word cloud
              </button>
            </div>

            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={pollKind === "word_cloud" ? "e.g. What word describes this meeting?" : "Ask a question..."}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />

            {pollKind === "multiple_choice" ? (
              <>
                <div className="space-y-1.5">
                  {optionInputs.map((opt, i) => (
                    <div key={i} className="flex gap-1.5">
                      <input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      />
                      {optionInputs.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white/70"
                        >
                          <Icon.Close size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={addOption}
                    disabled={optionInputs.length >= 6}
                    className="text-xs text-white/50 hover:text-white/80 disabled:opacity-30"
                  >
                    + Add option
                  </button>
                  <button
                    onClick={create}
                    disabled={busy}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-white/90 disabled:opacity-40"
                  >
                    {busy ? "Creating..." : "Launch poll"}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
                  Anyone can submit one word per round. Bigger words = more mentions. Perfect for vibes, feedback, "one word to describe…".
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={create}
                    disabled={busy}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-black shadow disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}
                  >
                    {busy ? "Creating..." : "Launch word cloud"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {polls.length === 0 && (
          <p className="py-12 text-center text-xs text-white/40">
            {isAdmin ? "No polls yet — create one above." : "No polls yet."}
          </p>
        )}

        {polls.slice().reverse().map((poll) => {
          if (poll.kind === "word_cloud") {
            return (
              <div key={poll.id} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-amber-300">Word cloud</div>
                    <div className="mt-1 text-sm font-medium">{poll.question}</div>
                    <div className="mt-1 text-[10px] text-white/40">
                      {poll.results?.words?.length ?? 0} words · {poll.closed ? "closed" : "open"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => setOpenCloudPollId(poll.id)}
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black shadow"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ec4899)" }}
                  >
                    Open cloud
                  </button>
                  {isAdmin && !poll.closed && (
                    <button
                      onClick={() => close(poll.id)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            );
          }
          return (
            <PollCard
              key={poll.id}
              poll={poll}
              myChoice={myVotes[poll.id]}
              onVote={(c) => vote(poll.id, c)}
              onClose={() => close(poll.id)}
              isAdmin={isAdmin}
            />
          );
        })}
      </div>
    </div>
  );
}

function PollCard({
  poll,
  myChoice,
  onVote,
  onClose,
  isAdmin,
}: {
  poll: Poll;
  myChoice?: number;
  onVote: (choice: string | number) => void;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const totalVotes = (poll.results?.counts ?? []).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(1, ...(poll.results?.counts ?? [1]));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Icon.BarChart size={12} className="text-white/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Poll
            </span>
            {poll.closed && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
                Closed
              </span>
            )}
          </div>
          <h4 className="mt-1 text-sm font-semibold text-white">{poll.question}</h4>
          <div className="mt-0.5 text-[10px] text-white/40">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            {" · "}
            <span className="text-white/30">by {poll.created_by}</span>
          </div>
        </div>
        {isAdmin && !poll.closed && (
          <button
            onClick={onClose}
            title="Close poll"
            className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white/60"
          >
            <Icon.Stop size={11} />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {poll.options.map((opt, i) => {
          const count = poll.results?.counts?.[i] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMine = myChoice === i;
          return (
            <button
              key={i}
              onClick={() => !poll.closed && onVote(i)}
              disabled={poll.closed}
              className={
                "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-all " +
                (isMine
                  ? "border-white/40 bg-white/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]") +
                (poll.closed ? " cursor-default" : " cursor-pointer")
              }
            >
              {/* Progress fill */}
              {poll.closed && totalVotes > 0 && (
                <span
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isMine
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
              <div className="relative flex items-center justify-between text-sm">
                <span className={isMine ? "font-semibold text-white" : "text-white/80"}>
                  {opt}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-white/50">
                  <span className="font-mono tabular-nums">{count}</span>
                  {poll.closed && totalVotes > 0 && (
                    <span className="text-white/40">· {pct}%</span>
                  )}
                  {isMine && <span className="text-[10px] text-white/60">· you</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}