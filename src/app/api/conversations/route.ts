// Conversations: rooms I'm in / recent rooms (Nextcloud Talk style)
// GET /api/conversations?user=alice → list of recent rooms + active participants
// POST /api/conversations → { action: "join", room } for tracking
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

function sanitize<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "bigint") out[k] = Number(v);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else out[k] = v;
  }
  return out;
}

export async function GET() {
  try {
    const svc = getService();
    const rooms = await svc.listRooms();
    return NextResponse.json({
      conversations: rooms.map((r) => sanitize({
        sid: r.sid,
        name: r.name,
        numParticipants: r.numParticipants,
        maxParticipants: r.maxParticipants,
        creationTimeMs: r.creationTimeMs,
        creationTime: r.creationTime,
        isActive: r.numParticipants > 0,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}