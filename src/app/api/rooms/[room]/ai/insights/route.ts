import { NextRequest, NextResponse } from "next/server";
import { listInsights, resolveInsight } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const onlyOpen = url.searchParams.get("only") === "open";
  const items = listInsights(room, onlyOpen);
  return NextResponse.json({ insights: items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{ action: string; id: number }>;
  if (body.action === "resolve" && typeof body.id === "number") {
    resolveInsight(body.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}