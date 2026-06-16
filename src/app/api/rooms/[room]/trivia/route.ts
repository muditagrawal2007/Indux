import { NextRequest, NextResponse } from "next/server";
import {
  addTriviaRound,
  listTriviaRounds,
  answerTrivia,
  triviaLeaderboard,
  triviaRoundResults,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  question?: string;
  options?: string[];
  correct_index?: number;
  category?: string;
  created_by?: string;
  identity?: string;
  name?: string;
  round_id?: number;
  answer_index?: number;
  response_ms?: number;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const view = url.searchParams.get("view");

  if (view === "leaderboard") {
    return NextResponse.json({ leaderboard: triviaLeaderboard(room) });
  }
  if (view === "results" && url.searchParams.get("round")) {
    const roundId = Number(url.searchParams.get("round"));
    return NextResponse.json({ results: triviaRoundResults(roundId) });
  }

  return NextResponse.json({ rounds: listTriviaRounds(room) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (body.action === "create") {
    if (!body.question || !body.options || body.correct_index == null || !body.created_by) {
      return NextResponse.json({ error: "question, options, correct_index, created_by required" }, { status: 400 });
    }
    if (body.options.length < 2) return NextResponse.json({ error: "at least 2 options" }, { status: 400 });
    const round = addTriviaRound({
      room,
      question: body.question.slice(0, 500),
      options: body.options.slice(0, 8).map((o) => o.slice(0, 200)),
      correct_index: Math.max(0, Math.min(body.options.length - 1, body.correct_index)),
      category: body.category?.slice(0, 60) ?? null,
      created_by: body.created_by,
    });
    return NextResponse.json({ round });
  }

  if (body.action === "answer") {
    if (
      typeof body.round_id !== "number" ||
      !body.identity ||
      typeof body.answer_index !== "number"
    ) {
      return NextResponse.json({ error: "round_id, identity, answer_index required" }, { status: 400 });
    }
    const rounds = listTriviaRounds(room);
    const round = rounds.find((r) => r.id === body.round_id);
    if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });

    const correct = body.answer_index === round.correct_index;
    const responseMs = Math.max(0, body.response_ms ?? 0);
    // Score: 1000 base, up to +500 speed bonus (decays over 10s), 0 if wrong
    let score = 0;
    if (correct) {
      score = 1000 + Math.max(0, Math.round(500 * Math.exp(-responseMs / 4000)));
    }
    answerTrivia({
      round_id: body.round_id,
      identity: body.identity,
      name: body.name ?? body.identity,
      answer_index: body.answer_index,
      correct,
      score,
      response_ms: responseMs,
    });
    return NextResponse.json({ ok: true, correct, score });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}