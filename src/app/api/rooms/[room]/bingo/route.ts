import { NextRequest, NextResponse } from "next/server";
import {
  generateBingoCard,
  getBingoCard,
  toggleBingoMark,
  bingoLeaderboard,
  autoMarkBingo,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const view = url.searchParams.get("view");
  if (view === "leaderboard") {
    return NextResponse.json({ leaderboard: bingoLeaderboard(room) });
  }
  const identity = url.searchParams.get("identity");
  if (identity) {
    let card = getBingoCard(room, identity);
    if (!card) card = generateBingoCard(room, identity, identity);
    return NextResponse.json({ card });
  }
  return NextResponse.json({ leaderboard: bingoLeaderboard(room) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{
    action: string;
    identity: string;
    name: string;
    index: number;
    phrase: string;
  }>;
  if (!body.identity) return NextResponse.json({ error: "identity required" }, { status: 400 });

  if (body.action === "generate") {
    const card = generateBingoCard(room, body.identity, body.name);
    return NextResponse.json({ card });
  }

  if (body.action === "toggle" && typeof body.index === "number") {
    const card = toggleBingoMark(room, body.identity, body.index);
    return NextResponse.json({ card });
  }

  if (body.action === "auto-mark" && body.phrase) {
    const r = autoMarkBingo(room, body.identity, body.phrase);
    return NextResponse.json({ ...(r ?? {}) });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}