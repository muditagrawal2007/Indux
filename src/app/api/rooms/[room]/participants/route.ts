// Indux Meet — Participant Admin API
// Server-side control over a single participant in a room.
// Used by the admin panel in the meeting room UI.
// In production: validate the requester is the room admin (via Indux session).
import {
  RoomServiceClient,
  type ParticipantInfo,
} from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

function getService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL || "ws://localhost:7880";
  if (!apiKey || !apiSecret) {
    throw new Error("Server not configured");
  }
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

function participantView(p: ParticipantInfo) {
  return sanitize({
    sid: p.sid,
    identity: p.identity,
    name: p.name,
    state: p.state,
    isPublisher: p.permission?.canPublish ?? false,
    isSubscriber: p.permission?.canSubscribe ?? false,
    isMuted: !(p.tracks ?? []).some((t) => !t.muted),
    joinedAtMs: p.joinedAtMs,
    metadata: p.metadata,
  });
}

// GET /api/rooms/[room]/participants → list everyone in the room
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const svc = getService();
    const list = await svc.listParticipants(room);
    return NextResponse.json({
      participants: list.map(participantView),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/rooms/[room]/participants  — body: { action, identity?, sid? }
//   action: "mute" | "unmute" | "kick" | "promote" | "demote" | "rename" | "mute-all"
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { action, identity, name } = body as {
      action: string;
      identity?: string;
      name?: string;
    };
    const svc = getService();

    if (action === "mute-all") {
      const all = await svc.listParticipants(room);
      let count = 0;
      for (const p of all) {
        for (const t of p.tracks ?? []) {
          if (t.type === "AUDIO" && !t.muted) {
            await svc.mutePublishedTrack(room, p.identity, t.sid, true);
            count++;
          }
        }
      }
      return NextResponse.json({ ok: true, action, tracksMuted: count });
    }

    if (!identity) {
      return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    }

    switch (action) {
      case "mute": {
        try {
          const p = await svc.getParticipant(room, identity);
          for (const t of p.tracks ?? []) {
            if (t.type === "AUDIO" && !t.muted) {
              await svc.mutePublishedTrack(room, identity, t.sid, true);
            }
          }
          return NextResponse.json({ ok: true, action, identity });
        } catch (e) {
          // Participant not in room — not an error from the admin's perspective
          if (String(e).includes("does not exist") || String(e).includes("not found")) {
            return NextResponse.json({ ok: true, action, identity, note: "not in room" });
          }
          throw e;
        }
      }

      case "unmute":
        // LiveKit can't force-unmute for privacy reasons; clients must unmute themselves
        // We return ok so the UI shows the request was sent
        return NextResponse.json({
          ok: true,
          action,
          identity,
          note: "Ask the participant to unmute — privacy",
        });

      case "kick":
        await svc.removeParticipant(room, identity);
        return NextResponse.json({ ok: true, action, identity });

      case "promote":
        await svc.updateParticipant(room, identity, {
          permission: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            roomAdmin: true,
            roomCreate: true,
          },
        });
        return NextResponse.json({ ok: true, action, identity });

      case "demote":
        await svc.updateParticipant(room, identity, {
          permission: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            roomAdmin: false,
            roomCreate: false,
          },
        });
        return NextResponse.json({ ok: true, action, identity });

      case "rename":
        if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
        await svc.updateParticipant(room, identity, undefined, undefined, name);
        return NextResponse.json({ ok: true, action, identity, name });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}