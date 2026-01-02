// Lobby knock + state
// POST /api/rooms/[room]/lobby   → { identity, userName }  records a knock
// GET  /api/rooms/[room]/lobby   → list of pending knocks (admin can poll)
import { NextRequest, NextResponse } from "next/server";

// In-memory knock store per room (ephemeral, not persisted)
const knocks = new Map<string, Array<{ identity: string; userName: string; ts: number }>>();

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ knocks: knocks.get(room) ?? [] });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { identity, userName } = body as { identity: string; userName: string };
    if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    const arr = knocks.get(room) ?? [];
    // Replace if same identity
    const filtered = arr.filter((k) => k.identity !== identity);
    filtered.push({ identity, userName: userName || identity, ts: Date.now() });
    knocks.set(room, filtered.slice(-100));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/rooms/[room]/lobby?identity=x → clear a knock (after admin admits)
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const url = new URL(req.url);
  const identity = url.searchParams.get("identity");
  if (identity) {
    const arr = knocks.get(room) ?? [];
    knocks.set(room, arr.filter((k) => k.identity !== identity));
  } else {
    knocks.delete(room);
  }
  return NextResponse.json({ ok: true });
}