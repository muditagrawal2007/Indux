// Collaborative notes (Markdown, live-edited by anyone)
// GET  /api/rooms/[room]/notes    → current notes
// POST /api/rooms/[room]/notes    → { body, by }
import { getNotes, setNotes } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ notes: getNotes(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    if (typeof body.body !== "string") {
      return NextResponse.json({ error: "Missing body" }, { status: 400 });
    }
    const notes = setNotes(room, body.body, body.by || "user");
    return NextResponse.json({ notes });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}