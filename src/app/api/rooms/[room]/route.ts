// Indux Meet — Room Controls API
// Lock/unlock, end, configure max participants, name, metadata.
// In production: validate requester is admin.
import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

function getService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL || "ws://localhost:7880";
  if (!apiKey || !apiSecret) throw new Error("Server not configured");
  const httpUrl = url.replace(/^wss?:/, (m) =>
    m === "wss:" ? "https:" : "http:"
  );
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

// GET /api/rooms/[room] → single room info (incl. metadata)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const svc = getService();
    const rooms = await svc.listRooms([room]);
    if (rooms.length === 0) {
      return NextResponse.json({ room: null });
    }
    const r = rooms[0];
    let parsedMeta: Record<string, unknown> = {};
    if (r.metadata) {
      try { parsedMeta = JSON.parse(r.metadata); } catch {}
    }
    return NextResponse.json({
      room: sanitize({
        sid: r.sid,
        name: r.name,
        numParticipants: r.numParticipants,
        maxParticipants: r.maxParticipants,
        creationTimeMs: r.creationTimeMs,
        metadata: parsedMeta,
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/rooms/[room]  — body: { action }
//   action: "lock" | "unlock" | "end" | "admit" | "deny"
//   For admit/deny: { identity, action }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { action, identity } = body as { action: string; identity?: string };
    const svc = getService();

    switch (action) {
      case "lock": {
        await svc.updateRoomMetadata(
          room,
          JSON.stringify({ locked: true, lockedAt: Date.now() })
        );
        return NextResponse.json({ ok: true, action, locked: true });
      }
      case "unlock": {
        await svc.updateRoomMetadata(
          room,
          JSON.stringify({ locked: false, lockedAt: null })
        );
        return NextResponse.json({ ok: true, action, locked: false });
      }
      case "end": {
        await svc.deleteRoom(room);
        return NextResponse.json({ ok: true, action, ended: true });
      }
      case "admit": {
        // Promote the participant from the lobby (currently a no-publish participant)
        // to a full publisher. In LiveKit, all joiners already connect to the room,
        // so "lobby" is implemented via permission: canPublish=false.
        // To admit, we flip canPublish to true.
        if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
        await svc.updateParticipant(room, identity, {
          permission: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          },
        });
        return NextResponse.json({ ok: true, action, identity });
      }
      case "deny": {
        if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
        await svc.removeParticipant(room, identity);
        return NextResponse.json({ ok: true, action, identity });
      }
      case "lobby": {
        // Put participant in the lobby: canPublish=false (they can see others but not be seen/heard)
        if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
        await svc.updateParticipant(room, identity, {
          permission: {
            canPublish: false,
            canSubscribe: true,
            canPublishData: true,
          },
        });
        return NextResponse.json({ ok: true, action, identity });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}