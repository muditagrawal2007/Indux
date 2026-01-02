// Indux Meeting — Admin Rooms API
// Server-side control over LiveKit rooms (full admin power).
// In production: validate the requesting user is an Indux admin of the org.
import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

function getService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL || "ws://localhost:7880";
  if (!apiKey || !apiSecret) {
    throw new Error("Server not configured");
  }
  // Admin client uses HTTP, swap ws:// -> http://
  const httpUrl = url.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:"));
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

// Convert BigInts (LiveKit returns creationTime as BigInt seconds) to numbers
// so JSON.stringify works.
function sanitize<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "bigint") {
      out[k] = Number(v);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function GET() {
  try {
    const svc = getService();
    const rooms = await svc.listRooms();
    return NextResponse.json({
      rooms: rooms.map((r) =>
        sanitize({
          sid: r.sid,
          name: r.name,
          numParticipants: r.numParticipants,
          maxParticipants: r.maxParticipants,
          creationTime: r.creationTime,
          creationTimeMs: r.creationTimeMs,
          metadata: r.metadata,
        })
      ),
    });
  } catch (e) {
    console.error("List rooms error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, maxParticipants = 100 } = body as {
      name: string;
      maxParticipants?: number;
    };

    if (!name) {
      return NextResponse.json({ error: "Missing room name" }, { status: 400 });
    }

    const svc = getService();
    const room = await svc.createRoom({ name, maxParticipants });
    return NextResponse.json({
      room: sanitize({
        sid: room.sid,
        name: room.name,
        maxParticipants: room.maxParticipants,
        creationTime: room.creationTime,
      }),
    });
  } catch (e) {
    console.error("Create room error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room");
    if (!room) {
      return NextResponse.json({ error: "Missing room name" }, { status: 400 });
    }
    const svc = getService();
    await svc.deleteRoom(room);
    return NextResponse.json({ ok: true, room });
  } catch (e) {
    console.error("Delete room error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}