// Hand raise queue
// GET   /api/rooms/[room]/hand          → list of {identity, raised_at}
// POST  /api/rooms/[room]/hand          → { identity, action: "raise" | "lower" | "lowerAll" }
import { listHandRaises, lowerHand, raiseHand } from "@/lib/db";
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
    const { identity, action } = body as { identity?: string; action: string };
    if (action === "raise" && identity) {
      raiseHand(room, identity);
      return NextResponse.json({ ok: true });
    }
    if (action === "lower" && identity) {
      lowerHand(room, identity);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}