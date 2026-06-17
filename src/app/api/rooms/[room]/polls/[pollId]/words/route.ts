import { NextRequest, NextResponse } from "next/server";
import { addWordCloudResponse, wordCloudResults, getPoll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string; pollId: string }> }) {
  const { pollId } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{ identity: string; word: string }>;
  const poll = getPoll(pollId);
  if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });
  if (poll.kind !== "word_cloud") return NextResponse.json({ error: "not a word cloud poll" }, { status: 400 });
  if (!body.identity || !body.word) return NextResponse.json({ error: "identity, word required" }, { status: 400 });
  if (poll.closed) return NextResponse.json({ error: "poll closed" }, { status: 400 });
  addWordCloudResponse(pollId, body.identity, body.word);
  return NextResponse.json({ words: wordCloudResults(pollId) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string; pollId: string }> }) {
  const { pollId } = await params;
  return NextResponse.json({ words: wordCloudResults(pollId) });
}