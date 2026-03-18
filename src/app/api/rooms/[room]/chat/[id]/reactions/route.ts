// Message reactions (inline thumbs up / heart on chat messages)
// GET  /api/rooms/[room]/chat/[id]/reactions  → { reactions: { msgId: ["alice:thumbs", "bob:heart"] } }
// POST /api/rooms/[room]/chat/[id]/reactions  → { identity, emoji }  toggle own
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
) {
  const { room, id } = await params;
  const db = getDb();
  // Use meta column of the message to store reactions as JSON
  const row = db
    .prepare("SELECT id, meta FROM chat WHERE id = ? AND room = ?")
    .get(Number(id), room) as { id: number; meta: string | null } | undefined;
  if (!row) return NextResponse.json({ reactions: {} });
  const meta = row.meta ? JSON.parse(row.meta) : {};
  return NextResponse.json({ reactions: meta.reactions ?? {} });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
) {
  try {
    const { room, id } = await params;
    const { identity, emoji } = await req.json();
    if (!identity || !emoji) {
      return NextResponse.json({ error: "identity and emoji required" }, { status: 400 });
    }
    const db = getDb();
    const row = db
      .prepare("SELECT id, meta FROM chat WHERE id = ? AND room = ?")
      .get(Number(id), room) as { id: number; meta: string | null } | undefined;
    if (!row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const meta = row.meta ? JSON.parse(row.meta) : {};
    if (!meta.reactions) meta.reactions = {};
    const key = `${identity}:${emoji}`;
    const reactions: string[] = meta.reactions;
    const idx = reactions.indexOf(key);
    if (idx >= 0) reactions.splice(idx, 1);
    else reactions.push(key);
    meta.reactions = reactions;
    db.prepare("UPDATE chat SET meta = ? WHERE id = ? AND room = ?").run(JSON.stringify(meta), Number(id), room);
    return NextResponse.json({ reactions: meta.reactions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
