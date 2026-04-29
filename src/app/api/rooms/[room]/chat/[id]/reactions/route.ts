// Message reactions (inline thumbs up / heart on chat messages)
// GET  /api/rooms/[room]/chat/[id]/reactions  → { reactions: ["alice:thumbs", "bob:heart"] }
// POST /api/rooms/[room]/chat/[id]/reactions  → { identity, emoji }  toggle own
// Storage shape (meta.reactions): { msgId: ["alice:thumbs", "bob:heart"] }
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function parseMeta(meta: string | null): Record<string, any> {
  if (!meta) return {};
  try { return JSON.parse(meta); } catch { return {}; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT meta FROM chat WHERE id = ?")
    .get(Number(id)) as { meta: string | null } | undefined;
  if (!row) return NextResponse.json({ reactions: [] });
  const meta = parseMeta(row.meta);
  const list: string[] = (meta.reactions ?? {})[String(id)] ?? [];
  return NextResponse.json({ reactions: list });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
) {
  try {
    const { id } = await params;
    const { identity, emoji } = await req.json();
    if (!identity || !emoji) {
      return NextResponse.json({ error: "identity and emoji required" }, { status: 400 });
    }
    const db = getDb();
    const row = db
      .prepare("SELECT meta FROM chat WHERE id = ?")
      .get(Number(id)) as { meta: string | null } | undefined;
    if (!row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const meta = parseMeta(row.meta);
    if (!meta.reactions) meta.reactions = {};
    const msgId = String(id);
    if (!Array.isArray(meta.reactions[msgId])) meta.reactions[msgId] = [];
    const list: string[] = meta.reactions[msgId];
    const key = `${identity}:${emoji}`;
    const idx = list.indexOf(key);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(key);
    db.prepare("UPDATE chat SET meta = ? WHERE id = ?").run(JSON.stringify(meta), Number(id));
    return NextResponse.json({ reactions: list });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}