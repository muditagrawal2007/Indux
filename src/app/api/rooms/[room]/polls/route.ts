// Polls
// GET    /api/rooms/[room]/polls              → all polls in room
// POST   /api/rooms/[room]/polls              → create { question, options[] }
// POST   /api/rooms/[room]/polls/[pollId]/vote → { optionIndex }
// POST   /api/rooms/[room]/polls/[pollId]/close → close poll
import {
  closePoll,
  createPoll,
  getPoll,
  listPolls,
  pollResults,
  votePoll,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const polls = listPolls(room).map((p) => {
    const r = pollResults(p.id);
    return { ...p, results: r };
  });
  return NextResponse.json({ polls });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { question, options, createdBy } = body as {
      question: string;
      options: string[];
      createdBy: string;
    };
    if (!question || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "Need a question and at least 2 options" },
        { status: 400 }
      );
    }
    const poll = createPoll({
      id: randomUUID(),
      room,
      question,
      options,
      created_by: createdBy || "admin",
    });
    return NextResponse.json({ poll });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}