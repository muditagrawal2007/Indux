// Recording: client-side MediaRecorder
// POST /api/rooms/[room]/recordings  → multipart upload of a webm file
// GET  /api/rooms/[room]/recordings  → list recordings
import fs from "fs";
import path from "path";
import {
  listRecordings,
  startRecording,
  stopRecording,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const RECORDINGS_DIR = process.env.INDUX_RECORDINGS_DIR || path.join(process.cwd(), "recordings");

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  const { room } = await ctx.params;
  return NextResponse.json({ recordings: listRecordings(room) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ room: string }> }
) {
  try {
    const { room } = await ctx.params;
    const url = req.url;

    // Start marker (no file)
    if (url.endsWith("/start")) {
      const body = await req.json().catch(() => ({}));
      const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const rec = startRecording(id, room, body.startedBy || "admin");
      return NextResponse.json({ recording: rec });
    }

    // Upload: multipart with file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const id = formData.get("id") as string | null;
    const durationMs = Number(formData.get("durationMs") || 0);
    if (!file || !id) {
      return NextResponse.json({ error: "Missing file or id" }, { status: 400 });
    }
    if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    const filename = `${id}.webm`;
    const filepath = path.join(RECORDINGS_DIR, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buf);
    const rec = stopRecording(id, filepath, buf.length, durationMs);
    return NextResponse.json({ recording: rec });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}