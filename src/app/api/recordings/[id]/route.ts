// Download or stream a recording file
// GET /api/recordings/[id]            → streams the .webm file (supports range requests)
// GET /api/recordings/[id]?download=1 → forces download
import fs from "fs";
import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = getDb();
  const rec = db.prepare(`SELECT * FROM recordings WHERE id = ?`).get(id) as
    | { file_path: string; file_size: number; status: string; room: string; started_by: string; started_at: number; duration_ms: number | null }
    | undefined;
  if (!rec || !rec.file_path || !fs.existsSync(rec.file_path)) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const stat = fs.statSync(rec.file_path);
  const total = stat.size;
  const rangeHeader = req.headers.get("range");

  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";
  const disposition = forceDownload
    ? `attachment; filename="indux-${rec.room}-${id}.webm"`
    : `inline; filename="indux-${rec.room}-${id}.webm"`;

  if (rangeHeader) {
    const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : total - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(rec.file_path, { start, end });
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": "video/webm",
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Disposition": disposition,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = fs.createReadStream(rec.file_path);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/webm",
      "Content-Length": total.toString(),
      "Content-Disposition": disposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}