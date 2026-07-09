// Hand raise queue
// GET   /api/rooms/[room]/hand          → list of {identity, name, raised_at}
// POST  /api/rooms/[room]/hand          → { identity, name?, action: "raise" | "lower" | "lower-all" }
import { listHandRaises, lowerHand, raiseHand, lowerAllHands } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ hands: listHandRaises(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { identity, name, action } = body as {
      identity?: string;
      name?: string;
      action: string;
    };
    if (action === "raise" && identity) {
      raiseHand(room, identity, name ?? null);
      return NextResponse.json({ ok: true });
    }
    if (action === "lower" && identity) {
      lowerHand(room, identity);
      return NextResponse.json({ ok: true });
    }
    if (action === "lower-all") {
      const dropped = lowerAllHands(room);
      return NextResponse.json({ ok: true, dropped });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}