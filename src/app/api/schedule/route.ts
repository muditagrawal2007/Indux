// Scheduled meetings + personal meeting room
// GET  /api/schedule?host=email        → list scheduled meetings
// POST /api/schedule                   → { id?, room, title, host, starts_at, duration_min, recurring }
// DELETE /api/schedule?id=…            → cancel
// GET  /api/personal-room?user=name    → get/create personal room
import {
  deleteScheduled,
  getPersonalRoom,
  getScheduled,
  listScheduled,
  scheduleMeeting,
  setPersonalRoom,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/personal-room")) {
    const user = url.searchParams.get("user") || "guest";
    let pr = getPersonalRoom(user);
    if (!pr) pr = setPersonalRoom(user);
    return NextResponse.json({ personalRoom: pr });
  }
  const host = url.searchParams.get("host") || undefined;
  return NextResponse.json({ scheduled: listScheduled(host) });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/personal-room")) {
      const body = await req.json();
      const user = body.user || body.username || "guest";
      const pr = setPersonalRoom(user);
      return NextResponse.json({ personalRoom: pr });
    }
    const body = await req.json();
    const { room, title, host, starts_at, duration_min = 60, recurring = "none", id } = body as {
      room?: string;
      title: string;
      host: string;
      starts_at: number;
      duration_min?: number;
      recurring?: "none" | "daily" | "weekly" | "monthly";
      id?: string;
    };
    if (!title || !host || !starts_at) {
      return NextResponse.json({ error: "Need title, host, starts_at" }, { status: 400 });
    }
    const meeting = scheduleMeeting({
      id: id || randomUUID(),
      room: room || `mtg-${randomUUID().slice(0, 8)}`,
      title,
      host,
      starts_at,
      duration_min,
      recurring,
    });
    return NextResponse.json({ scheduled: meeting });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteScheduled(id);
  return NextResponse.json({ ok: true });
}