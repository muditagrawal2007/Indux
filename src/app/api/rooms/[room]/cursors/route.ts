import { NextRequest, NextResponse } from "next/server";
import { upsertCursor, listRecentCursors, clearStaleCursors } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{ identity: string; name: string; x: number; y: number }>;
  const identity = (body.identity ?? "").toString().slice(0, 80);
  if (!identity || typeof body.x !== "number" || typeof body.y !== "number") {
    return NextResponse.json({ error: "identity, x, y required" }, { status: 400 });
  }
  upsertCursor({
    room,
    identity,
    name: (body.name ?? null) as any,
    x: Math.max(0, Math.min(1, body.x)),
    y: Math.max(0, Math.min(1, body.y)),
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  clearStaleCursors(room);
  const cursors = listRecentCursors(room);
  return NextResponse.json({ cursors });
}