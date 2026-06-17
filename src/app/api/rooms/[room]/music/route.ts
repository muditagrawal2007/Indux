import { NextRequest, NextResponse } from "next/server";
import { addMusicTrack, listMusicQueue, voteMusicTrack, markMusicPlayed, removeMusicTrack } from "@/lib/db";

export const dynamic = "force-dynamic";

const CURATED = [
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", title: "SoundHelix · Song 1" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", title: "SoundHelix · Song 2" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", title: "SoundHelix · Song 3" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", title: "SoundHelix · Song 4" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", title: "SoundHelix · Song 5" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", title: "SoundHelix · Song 6" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", title: "SoundHelix · Song 7" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", title: "SoundHelix · Song 8" },
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const includePlayed = url.searchParams.get("all") === "1";
  const queue = listMusicQueue(room, !includePlayed);
  return NextResponse.json({ queue, curated: CURATED });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{
    action: string;
    url: string;
    title: string;
    added_by: string;
    id: number;
    delta: number;
  }>;

  if (body.action === "add") {
    if (!body.url || !body.title || !body.added_by) {
      return NextResponse.json({ error: "url, title, added_by required" }, { status: 400 });
    }
    const track = addMusicTrack({ room, url: body.url, title: body.title, added_by: body.added_by });
    return NextResponse.json({ track });
  }

  if (body.action === "vote" && typeof body.id === "number" && typeof body.delta === "number") {
    voteMusicTrack(body.id, body.delta);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "played" && typeof body.id === "number") {
    markMusicPlayed(body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove" && typeof body.id === "number") {
    removeMusicTrack(body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}