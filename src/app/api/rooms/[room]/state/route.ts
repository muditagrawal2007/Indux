// Room state endpoint — for the lobby UI to know if it's been admitted
// GET /api/rooms/[room]/state?identity=x → { admitted: boolean, rejected: boolean }
import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

function getService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL || "ws://localhost:7880";
  if (!apiKey || !apiSecret) throw new Error("missing credentials");
  const httpUrl = url.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:"));
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const url = new URL(req.url);
    const identity = url.searchParams.get("identity") || "";
    const svc = getService();
    let admitted = false;
    let inRoom = false;
    try {
      const p = await svc.getParticipant(room, identity);
      inRoom = true;
      admitted = !!(p.permission?.canPublish);
    } catch {
      // not in room
    }
    return NextResponse.json({ admitted, inRoom, rejected: !inRoom });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}