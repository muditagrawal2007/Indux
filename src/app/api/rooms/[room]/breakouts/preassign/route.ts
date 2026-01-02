// Breakout pre-assignment (BigBlueButton style)
// POST /api/rooms/[room]/breakouts/preassign
//   body: { assignments: { [identity]: "sub-room" } }
// When a user joins, the server checks their assignment and auto-moves them.
import {
  createBreakout,
  deleteBreakouts,
  listBreakouts,
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

// Persisted in room metadata for now
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { assignments, createdBy } = body as {
      assignments: Record<string, string>;
      createdBy: string;
    };
    if (!assignments || typeof assignments !== "object") {
      return NextResponse.json({ error: "Need assignments object" }, { status: 400 });
    }
    const svc = getService();
    const subs = Object.values(assignments);
    // Ensure each sub-room exists
    for (const sub of [...new Set(subs)]) {
      createBreakout(room, sub, createdBy || "admin");
    }
    // Move any already-joined users to their assigned sub-room
    const parts = await svc.listParticipants(room);
    for (const p of parts) {
      const target = assignments[p.identity];
      if (target && target !== room) {
        try {
          await svc.moveParticipant(room, p.identity, target);
        } catch {}
      }
    }
    return NextResponse.json({ ok: true, assignments });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
