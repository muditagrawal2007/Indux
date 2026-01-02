// Breakout rooms
// GET    /api/rooms/[room]/breakouts          → list sub-room names
// POST   /api/rooms/[room]/breakouts          → create { subRooms: ["room1", "room2"] }
// POST   /api/rooms/[room]/breakouts/assign   → { identity, subRoom } – move user
// POST   /api/rooms/[room]/breakouts/close    → close all breakouts (move users back)
import { RoomServiceClient } from "livekit-server-sdk";
import {
  createBreakout,
  deleteBreakouts,
  listBreakouts,
} from "@/lib/db";
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
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ breakouts: listBreakouts(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const url = req.url;
    const body = await req.json().catch(() => ({}));

    // Close all breakouts
    if (url.endsWith("/close")) {
      const svc = getService();
      const subs = listBreakouts(room);
      // Move all participants back to the main room
      for (const sub of subs) {
        try {
          const parts = await svc.listParticipants(sub);
          for (const p of parts) {
            await svc.moveParticipant(sub, p.identity, room);
          }
        } catch {}
      }
      deleteBreakouts(room);
      return NextResponse.json({ ok: true, closed: true });
    }

    // Assign a user to a breakout
    if (url.endsWith("/assign")) {
      const { identity, subRoom } = body as { identity: string; subRoom: string };
      if (!identity || !subRoom) {
        return NextResponse.json({ error: "Missing identity or subRoom" }, { status: 400 });
      }
      const svc = getService();
      await svc.moveParticipant(room, identity, subRoom);
      return NextResponse.json({ ok: true, identity, subRoom });
    }

    // Create breakouts
    const { subRooms, createdBy } = body as {
      subRooms: string[];
      createdBy: string;
    };
    if (!Array.isArray(subRooms) || subRooms.length === 0) {
      return NextResponse.json({ error: "Need subRooms array" }, { status: 400 });
    }
    for (const sub of subRooms) {
      createBreakout(room, sub, createdBy || "admin");
    }
    return NextResponse.json({ ok: true, breakouts: subRooms });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}