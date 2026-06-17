import { NextRequest, NextResponse } from "next/server";
import {
  saveRecap,
  getRecap,
  listInsights,
  listChat,
  listTranscripts,
  listPolls,
  pollResults,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type AssignedItem = { text: string; assignee: string | null; confidence: number };

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const recap = getRecap(room);
  return NextResponse.json({ recap });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{
    durationMs: number;
    participants: string[];
  }>;

  const chats = listChat(room, 0, 500);
  const transcripts = listTranscripts(room, 0, 500);
  const insights = listInsights(room, false);

  // Auto-assign action items by parsing "<name> will <verb>..." patterns
  const assigned = insights
    .filter((i) => i.kind === "action_item")
    .map((i) => ({
      text: i.text,
      assignee: extractAssignee(i.text) ?? (i.source ? prettyName(i.source) : null),
      confidence: i.confidence,
    })) as AssignedItem[];

  const decisions = insights.filter((i) => i.kind === "decision").map((i) => i.text);

  // Highlights: longest chat messages + highest-scoring transcripts
  const chatHighlights = chats
    .slice()
    .sort((a, b) => b.body.length - a.body.length)
    .slice(0, 3)
    .map((c) => `${c.name ?? c.identity}: ${c.body}`);

  const transcriptHighlights = transcripts
    .slice()
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 3)
    .map((t) => `${t.name ?? t.identity}: ${t.text}`);

  // Poll summary
  const polls = listPolls(room);
  const pollSummary = polls.slice(0, 5).map((p) => {
    if (p.kind === "word_cloud") {
      return { question: p.question, kind: "word_cloud", winner: "(open responses)" };
    }
    const r = pollResults(p.id);
    const max = Math.max(0, ...r.counts);
    const winIdx = r.counts.indexOf(max);
    return { question: p.question, kind: "multiple_choice", winner: p.options[winIdx] ?? "—", votes: r.counts[winIdx] };
  });

  const participants = body.participants ?? Array.from(
    new Set([
      ...chats.map((c) => c.name ?? c.identity),
      ...transcripts.map((t) => t.name ?? t.identity),
    ])
  );

  const summary = composeSummary({
    durationMs: body.durationMs ?? 0,
    chatCount: chats.length,
    transcriptCount: transcripts.length,
    pollCount: polls.length,
    insightCount: insights.length,
    decisionCount: decisions.length,
    actionItemCount: assigned.length,
    participants: participants.length,
  });

  const recap = saveRecap({
    room,
    summary,
    action_items: JSON.stringify(assigned),
    decisions: JSON.stringify(decisions),
    highlights: JSON.stringify([...chatHighlights, ...transcriptHighlights].slice(0, 5)),
    participants: JSON.stringify(participants),
    duration_ms: body.durationMs ?? 0,
  });

  return NextResponse.json({ recap, pollSummary });
}

function composeSummary(m: {
  durationMs: number; chatCount: number; transcriptCount: number;
  pollCount: number; insightCount: number; decisionCount: number;
  actionItemCount: number; participants: number;
}): string {
  const durMin = Math.round(m.durationMs / 60_000);
  return [
    `Meeting ran for ${durMin} minute${durMin === 1 ? "" : "s"} with ${m.participants} participant${m.participants === 1 ? "" : "s"}.`,
    `${m.chatCount} chat messages, ${m.transcriptCount} transcript lines captured.`,
    m.pollCount > 0 ? `${m.pollCount} live poll${m.pollCount === 1 ? "" : "s"} ran.` : "No polls.",
    m.decisionCount > 0 ? `${m.decisionCount} decision${m.decisionCount === 1 ? "" : "s"} recorded.` : "",
    m.actionItemCount > 0 ? `${m.actionItemCount} action item${m.actionItemCount === 1 ? "" : "s"} captured, auto-assigned to specific people.` : "No action items captured.",
  ].filter(Boolean).join(" ");
}

function extractAssignee(text: string): string | null {
  // Match "<Name> will|to <verb>..." (capitalized first word)
  const m1 = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:will|to|is going to|should|gonna)\s+/);
  if (m1) return m1[1];
  // Match "I'll" — assign to current speaker (handled separately by caller)
  return null;
}

function prettyName(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}