// Q&A — audience asks, host approves/answers
// GET    /api/rooms/[room]/qa          → all questions
// POST   /api/rooms/[room]/qa          → { asker, asker_name, question, action? }
//   action: "ask" (default) | "upvote" | "approve" | "answer"
//   for "answer": also send { answer, answeredBy }
import {
  addQuestion,
  answerQuestion,
  approveQuestion,
  listQuestions,
  upvoteQuestion,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const url = new URL(_req.url);
  const onlyApproved = url.searchParams.get("approved") === "1";
  return NextResponse.json({ questions: listQuestions(room, onlyApproved) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { action, id, asker, asker_name, question, answer, answeredBy } = body as {
      action?: string;
      id?: string;
      asker?: string;
      asker_name?: string;
      question?: string;
      answer?: string;
      answeredBy?: string;
    };
    const act = action || "ask";

    if (act === "ask") {
      if (!asker || !question) return NextResponse.json({ error: "Missing asker or question" }, { status: 400 });
      const q = addQuestion({ room, asker, asker_name: asker_name ?? null, question });
      return NextResponse.json({ question: q });
    }
    if (act === "upvote" && id) {
      upvoteQuestion(id);
      return NextResponse.json({ ok: true });
    }
    if (act === "approve" && id) {
      approveQuestion(id);
      return NextResponse.json({ ok: true });
    }
    if (act === "answer" && id && answer) {
      answerQuestion(id, answer, answeredBy || "admin");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}