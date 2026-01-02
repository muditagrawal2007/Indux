// In-room chat history
// GET /api/rooms/[room]/chat?since=N  → messages after id N
// POST /api/rooms/[room]/chat          → { body, kind?, meta? }
import { addChat, listChat } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  const since = Number(new URL(req.url).searchParams.get("since") || "0");
  const messages = listChat(room, since);
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const body = await req.json();
    const { identity, name, body: text, kind = "text", meta } = body as {
      identity: string;
      name?: string;
      body: string;
      kind?: "text" | "file" | "system";
      meta?: unknown;
    };
    if (!identity || !text) {
      return NextResponse.json({ error: "Missing identity or body" }, { status: 400 });
    }
    const msg = addChat({
      room,
      identity,
      name: name ?? null,
      body: text,
      kind,
      meta: meta ? JSON.stringify(meta) : null,
    });
    return NextResponse.json({ message: msg });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}