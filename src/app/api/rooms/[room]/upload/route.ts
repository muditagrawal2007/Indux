// File upload for chat
// POST /api/rooms/[room]/upload   → multipart file
// Returns the public URL and metadata
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { addChat } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_DIR = process.env.INDUX_UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const identity = (form.get("identity") as string) || "anon";
    const name = (form.get("name") as string) || identity;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(file.name) || "";
    const safeName = `${randomUUID()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, safeName);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buf);

    // Persist as a chat message
    const url = `/api/files/${safeName}`;
    const kind = file.type.startsWith("image/") ? "file" : "file";
    const msg = addChat({
      room,
      identity,
      name,
      body: file.name,
      kind,
      meta: JSON.stringify({
        url,
        size: buf.length,
        mime: file.type,
        filename: safeName,
      }),
    });

    return NextResponse.json({ file: url, message: msg });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}