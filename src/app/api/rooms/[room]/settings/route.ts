// Per-room admin-togglable settings
// GET  /api/rooms/[room]/settings     → current settings (with defaults)
// POST /api/rooms/[room]/settings     → { ...partial settings }
import { DEFAULT_SETTINGS, getSettings, setSettings, type RoomSettings } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ settings: getSettings(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    // Validate keys
    const allowed: (keyof RoomSettings)[] = Object.keys(DEFAULT_SETTINGS) as (keyof RoomSettings)[];
    const filtered: Partial<RoomSettings> = {};
    for (const k of allowed) {
      if (k in body) (filtered as Record<string, unknown>)[k] = body[k];
    }
    const settings = setSettings(room, filtered);
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}