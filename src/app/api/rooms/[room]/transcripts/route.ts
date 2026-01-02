// Live transcript lines
// GET  /api/rooms/[room]/transcripts?since=N  → lines after id N
// POST /api/rooms/[room]/transcripts          → { identity, name, text, ts_ms }
import { addTranscriptLine, listTranscripts } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const since = Number(new URL(req.url).searchParams.get("since") || "0");
  return NextResponse.json({ transcripts: listTranscripts(room, since) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { identity, name, text, ts_ms } = body as {
      identity: string;
      name?: string;
      text: string;
      ts_ms: number;
    };
    if (!identity || !text) {
      return NextResponse.json({ error: "Missing identity or text" }, { status: 400 });
    }
    const line = addTranscriptLine({
      room,
      identity,
      name: name ?? null,
      text,
      ts_ms: ts_ms || Date.now(),
    });
    return NextResponse.json({ line });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}