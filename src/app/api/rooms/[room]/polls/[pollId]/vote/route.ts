// Vote / close a poll
// POST /api/rooms/[room]/polls/[pollId]/vote  → { identity, optionIndex }
// POST /api/rooms/[room]/polls/[pollId]/close
import { closePoll, getPoll, pollResults, votePoll } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { room, pollId } = await ctx_params(req);
    const body = await req.json();
    const { identity, optionIndex } = body as { identity: string; optionIndex: number };
    if (!identity || typeof optionIndex !== "number") {
      return NextResponse.json({ error: "Missing identity or optionIndex" }, { status: 400 });
    }
    const poll = getPoll(pollId);
    if (!poll || poll.room !== room) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    if (poll.closed) {
      return NextResponse.json({ error: "Poll closed" }, { status: 400 });
    }
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return NextResponse.json({ error: "Invalid optionIndex" }, { status: 400 });
    }
    votePoll(pollId, identity, optionIndex);
    const results = pollResults(pollId);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Helper to extract params from request URL since this is a leaf route
function ctx_params(req: NextRequest) {
  const url = new URL(req.url);
  // /api/rooms/[room]/polls/[pollId]/vote
  const parts = url.pathname.split("/");
  // parts: ["", "api", "rooms", "<room>", "polls", "<pollId>", "vote"]
  return { room: parts[3], pollId: parts[5] };
}
