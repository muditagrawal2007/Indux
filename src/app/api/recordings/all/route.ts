// List all recordings across all rooms
// GET /api/recordings/all
import { listAllRecordings } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const recs = listAllRecordings(200).map((r) => ({
      id: r.id,
      room: r.room,
      started_by: r.started_by,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_ms: r.duration_ms,
      file_size: r.file_size,
      status: r.status,
    }));
    return NextResponse.json({ recordings: recs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}