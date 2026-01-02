// Serve uploaded files
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_DIR = process.env.INDUX_UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ filename: string }> }
) {
  const { filename } = await ctx.params;
  // Sanitize
  if (filename.includes("/") || filename.includes("..")) {
    return new NextResponse("Bad filename", { status: 400 });
  }
  const filepath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const stat = fs.statSync(filepath);
  const stream = fs.createReadStream(filepath);
  // Guess content type
  const ext = path.extname(filename).toLowerCase();
  const mime: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  };
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Content-Length": stat.size.toString(),
    },
  });
}