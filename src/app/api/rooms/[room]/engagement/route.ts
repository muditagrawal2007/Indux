import { NextRequest, NextResponse } from "next/server";
import {
  logEngagement,
  aggregateEngagement,
  aggregateTalkTime,
  addTalkTime,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const KIND_WEIGHTS: Record<string, number> = {
  join: 1,
  leave: 0,
  react: 0.4,
  hand: 0.6,
  speak: 1,
  chat: 0.5,
  poll_vote: 0.8,
  mic_on: 0.3,
  mic_off: 0,
  cam_on: 0.3,
  cam_off: 0,
};

type Body = {
  identity?: string;
  events?: Array<{ kind: string; ts?: number; weight?: number; meta?: any }>;
  talkBucketMs?: number;
  talkMs?: number;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const identity = (body.identity ?? "").toString().slice(0, 80);
  if (!identity) return NextResponse.json({ error: "identity required" }, { status: 400 });

  if (Array.isArray(body.events) && body.events.length) {
    const ts = Date.now();
    for (const e of body.events) {
      logEngagement({
        room,
        identity,
        kind: e.kind.slice(0, 32),
        weight: e.weight ?? KIND_WEIGHTS[e.kind] ?? 1.0,
        meta: e.meta ? JSON.stringify(e.meta).slice(0, 1000) : null,
        ts: e.ts ?? ts,
      });
    }
  }

  if (typeof body.talkBucketMs === "number" && typeof body.talkMs === "number") {
    addTalkTime(room, identity, body.talkBucketMs, body.talkMs);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const sinceMin = Number(url.searchParams.get("sinceMin") ?? "5");
  const since = Date.now() - Math.max(1, Math.min(60, sinceMin)) * 60_000;
  const bucketMin = Math.max(1, Math.min(60, sinceMin));
  const bucketMs = bucketMin * 60_000;

  const events = aggregateEngagement(room, since);
  const talk = aggregateTalkTime(room, bucketMs, since);

  // Compute per-identity engagement score
  const scoreMap = new Map<string, number>();
  for (const e of events) {
    scoreMap.set(e.identity, (scoreMap.get(e.identity) ?? 0) + e.weight);
  }
  for (const t of talk) {
    scoreMap.set(t.identity, (scoreMap.get(t.identity) ?? 0) + Math.min(t.total_ms / 60000, 5));
  }

  const participants = [...scoreMap.entries()]
    .map(([identity, score]) => ({ identity, score: Math.round(score * 100) / 100 }))
    .sort((a, b) => b.score - a.score);

  const totalScore = participants.reduce((s, p) => s + p.score, 0) || 1;
  const enriched = participants.map((p) => {
    const ev = events.find((e: { identity: string }) => e.identity === p.identity);
    const t = talk.find((tt: { identity: string }) => tt.identity === p.identity);
    return {
      ...p,
      participation: Math.round((p.score / totalScore) * 100),
      events: ev?.count ?? 0,
      talkMs: t?.total_ms ?? 0,
    };
  });

  const kindTotals: Record<string, number> = {};
  for (const e of events) {
    kindTotals[e.kind] = (kindTotals[e.kind] ?? 0) + e.count;
  }

  return NextResponse.json({
    participants: enriched,
    kinds: kindTotals,
    windowMin: bucketMin,
  });
}