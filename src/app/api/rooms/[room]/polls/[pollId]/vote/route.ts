// Vote / close a poll
// POST /api/rooms/[room]/polls/[pollId]/vote  → { identity, choice } or { identity, optionIndex }
// GET  /api/rooms/[room]/polls/[pollId]/vote  → results { pollId, options, counts, total }
import { getPoll, pollResults, votePoll } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const parts = new URL(req.url).pathname.split("/");
    const room = parts[3];
    const pollId = parts[5];
    const body = await req.json();
    const { identity } = body as { identity: string };

    if (!identity) {
      return NextResponse.json({ error: "identity required" }, { status: 400 });
    }
    const poll = getPoll(pollId);
    if (!poll || poll.room !== room) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    if (poll.closed) {
      return NextResponse.json({ error: "Poll closed" }, { status: 400 });
    }

    // Accept either optionIndex (number) or choice (string label) or choice (number index)
    let idx: number;
    if (typeof body.optionIndex === "number") {
      idx = body.optionIndex;
    } else if (typeof body.choice === "number") {
      idx = body.choice;
    } else if (typeof body.choice === "string") {
      idx = poll.options.findIndex(
        (o) => String(o).toLowerCase() === String(body.choice).toLowerCase()
      );
      if (idx < 0) {
        return NextResponse.json({ error: `Unknown choice "${body.choice}"` }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Missing optionIndex or choice" },
        { status: 400 }
      );
    }

    if (idx < 0 || idx >= poll.options.length) {
      return NextResponse.json({ error: "Invalid option index" }, { status: 400 });
    }

    votePoll(pollId, identity, idx);
    const results = pollResults(pollId);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const parts = new URL(req.url).pathname.split("/");
    const room = parts[3];
    const pollId = parts[5];
    const poll = getPoll(pollId);
    if (!poll || poll.room !== room) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    return NextResponse.json({ poll, results: pollResults(pollId) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}