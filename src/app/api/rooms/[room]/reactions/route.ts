// Lightweight reactions endpoint (no persistence — just round-trip broadcast)
// POST /api/rooms/[room]/reactions   → { identity, emoji }
// GET  /api/rooms/[room]/reactions   → empty (real broadcast via LiveKit data channel)
import { NextRequest, NextResponse } from "next/server";

// In-memory buffer per room (ephemeral)
const buffer = new Map<string, Array<{ identity: string; emoji: string; ts: number }>>();

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const now = Date.now();
  const arr = (buffer.get(room) ?? []).filter((r) => now - r.ts < 4000);
  buffer.set(room, arr);
  return NextResponse.json({ reactions: arr });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const { identity, emoji } = await req.json();
    if (!identity || !emoji) {
      return NextResponse.json({ error: "Missing identity or emoji" }, { status: 400 });
    }
    const arr = buffer.get(room) ?? [];
    arr.push({ identity, emoji, ts: Date.now() });
    // Cap buffer
    while (arr.length > 50) arr.shift();
    buffer.set(room, arr);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}