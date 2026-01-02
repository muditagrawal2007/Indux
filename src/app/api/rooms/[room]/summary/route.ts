// AI summary endpoint
// POST /api/rooms/[room]/summary   → generates a summary from transcripts
// GET  /api/rooms/[room]/summary   → reads latest summary
//
// MVP: builds a simple summary from transcript lines (no OpenAI required).
// Production: replace buildSummary() with OpenAI / Claude / local LLM call.
import { getSummary, listTranscripts, saveSummary } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function buildSummary(transcripts: Array<{ identity: string; name: string | null; text: string; ts_ms: number }>) {
  if (transcripts.length === 0) {
    return { summary: "No transcript lines yet.", action_items: [] };
  }

  const speakers = new Map<string, string>();
  for (const t of transcripts) {
    const key = t.name || t.identity;
    if (!speakers.has(key)) speakers.set(key, key);
  }

  // Extract sentences with action verbs
  const actionVerbs = /\b(will|should|must|need to|have to|let's|lets|going to|plan to|todo|to-do|action item)\b/i;
  const action_items: string[] = [];
  const minutes: string[] = [];

  for (const t of transcripts) {
    const speaker = speakers.get(t.name || t.identity)!;
    const line = t.text.trim();
    if (!line) continue;
    if (actionVerbs.test(line)) {
      action_items.push(`[${speaker}] ${line}`);
    } else {
      minutes.push(`[${speaker}] ${line}`);
    }
  }

  // Take first ~10 lines for summary
  const summary = [
    `Meeting summary (${transcripts.length} transcript lines, ${speakers.size} speaker${speakers.size === 1 ? "" : "s"}).`,
    ...minutes.slice(0, 10),
  ].join("\n");

  return { summary, action_items: action_items.slice(0, 20) };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ summary: getSummary(room) });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const transcripts = listTranscripts(room);
    const { summary, action_items } = buildSummary(transcripts);
    const saved = saveSummary({
      room,
      summary,
      action_items: JSON.stringify(action_items),
    });
    return NextResponse.json({ summary: saved });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}