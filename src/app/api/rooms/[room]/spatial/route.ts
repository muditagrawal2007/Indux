import { NextRequest, NextResponse } from "next/server";
import { setSpatialPosition, listSpatialPositions, clearSpatialPositions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{ identity: string; x: number; y: number; action: string }>;
  if (body.action === "clear") {
    clearSpatialPositions(room);
    return NextResponse.json({ ok: true });
  }
  const identity = (body.identity ?? "").toString().slice(0, 80);
  if (!identity || typeof body.x !== "number" || typeof body.y !== "number") {
    return NextResponse.json({ error: "identity, x, y required" }, { status: 400 });
  }
  setSpatialPosition(room, identity, body.x, body.y);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return NextResponse.json({ positions: listSpatialPositions(room) });
}