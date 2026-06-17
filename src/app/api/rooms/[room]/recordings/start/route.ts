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

export async function POST(req: NextRequest) {
  try {
    const { room } = await ctx_params(req);
    const body = await req.json().catch(() => ({}));
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rec = startRecording(id, room, body.startedBy || "admin");
    return NextResponse.json({ recording: rec });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function ctx_params(req: NextRequest) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  return { room: parts[3] };
}
