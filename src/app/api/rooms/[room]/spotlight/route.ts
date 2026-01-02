// Spotlight (pin speakers on stage)
// GET    /api/rooms/[room]/spotlight
// POST   /api/rooms/[room]/spotlight   → { identities: ["a","b"] } or { action: "clear" }
import { clearSpotlight, getSpotlight, setSpotlight } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ spotlight: getSpotlight(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    if (body.action === "clear") {
      clearSpotlight(room);
      return NextResponse.json({ ok: true, spotlight: [] });
    }
    if (Array.isArray(body.identities)) {
      setSpotlight(room, body.identities.slice(0, 9)); // max 9
      return NextResponse.json({ ok: true, spotlight: body.identities });
    }
    return NextResponse.json({ error: "Need identities[] or action: clear" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}