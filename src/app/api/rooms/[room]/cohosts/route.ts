// Co-hosts and banned users management
// GET    /api/rooms/[room]/cohosts
// POST   /api/rooms/[room]/cohosts   → { action: "add"|"remove", identity }
// GET    /api/rooms/[room]/banned
// POST   /api/rooms/[room]/banned    → { action: "ban"|"unban", identity }
import {
  addCoHost,
  banUser,
  isBanned,
  listBanned,
  listCoHosts,
  removeCoHost,
  unbanUser,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

function getService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL || "ws://localhost:7880";
  if (!apiKey || !apiSecret) throw new Error("missing credentials");
  const httpUrl = url.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:"));
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// ===== Co-hosts only =====
export async function GET(_req: NextRequest, ctx: { params: Promise<{ room: string }> }) {
  const { room } = await ctx.params;
  return NextResponse.json({ cohosts: listCoHosts(room) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ room: string }> }) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { action, identity, addedBy } = body as { action: string; identity: string; addedBy?: string };
    if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    if (action === "add") {
      addCoHost(room, identity, addedBy || "admin");
      try {
        const svc = getService();
        await svc.updateParticipant(room, identity, undefined, {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        } as any);
      } catch {}
      return NextResponse.json({ ok: true, action, identity });
    }
    if (action === "remove") {
      removeCoHost(room, identity);
      try {
        const svc = getService();
        await svc.updateParticipant(room, identity, undefined, {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        } as any);
      } catch {}
      return NextResponse.json({ ok: true, action, identity });
    }
    return NextResponse.json({ error: "Bad action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
