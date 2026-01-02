// ICS calendar file export
// GET /api/calendar/[scheduledId].ics → iCalendar file
import { getScheduled } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function fmtIcsDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function buildIcs(m: { id: string; title: string; host: string; room: string; starts_at: number; duration_min: number }): string {
  const end = m.starts_at + m.duration_min * 60 * 1000;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/meet/${m.room}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Indux Meet//EN",
    "BEGIN:VEVENT",
    `UID:${m.id}@indux`,
    `DTSTAMP:${fmtIcsDate(Date.now())}`,
    `DTSTART:${fmtIcsDate(m.starts_at)}`,
    `DTEND:${fmtIcsDate(end)}`,
    `SUMMARY:${m.title}`,
    `DESCRIPTION:Join at ${url}`,
    `LOCATION:${url}`,
    `ORGANIZER;CN=${m.host}:mailto:noreply@indux`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  // id may be "abc123.ics" — strip the extension
  const cleanId = id.replace(/\.ics$/, "");
  const m = getScheduled(cleanId);
  if (!m) {
    return new NextResponse("Not found", { status: 404 });
  }
  const body = buildIcs(m);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${m.title.replace(/[^a-z0-9]/gi, "-")}.ics"`,
    },
  });
}