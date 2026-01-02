// Vote / close a poll
// POST /api/rooms/[room]/polls/[pollId]/vote  → { identity, optionIndex }
// POST /api/rooms/[room]/polls/[pollId]/close
import { closePoll, getPoll, pollResults, votePoll } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pollId } = await ctx_params(req);
    closePoll(pollId);
    return NextResponse.json({ ok: true, closed: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function ctx_params(req: NextRequest) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  return { pollId: parts[5] };
}
