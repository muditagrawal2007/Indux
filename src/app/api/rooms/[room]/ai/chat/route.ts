import { NextRequest, NextResponse } from "next/server";
import {
  addAIMessage,
  listAIConversation,
  addInsight,
  listInsights,
  listChat,
  listTranscripts,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = {
  identity: string;
  message: string;
};

// POST → ask the sidekick a question (lightweight rule-based + transcript+chat RAG)
export async function POST(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<Body>;
  const identity = (body.identity ?? "").toString().slice(0, 80);
  const message = (body.message ?? "").toString().slice(0, 1000);
  if (!identity || !message) {
    return NextResponse.json({ error: "identity and message required" }, { status: 400 });
  }

  addAIMessage({ room, identity, role: "user", content: message });

  const reply = await composeReply(room, identity, message);
  const saved = addAIMessage({ room, identity, role: "assistant", content: reply.text, meta: JSON.stringify({ sources: reply.sources }) });

  // Auto-extract insights from user messages
  await extractInsights(room, message, identity);

  return NextResponse.json({ reply: saved });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const url = new URL(req.url);
  const identity = (url.searchParams.get("identity") ?? "").toString().slice(0, 80);
  if (!identity) return NextResponse.json({ messages: [] });
  const messages = listAIConversation(room, identity, 200);
  return NextResponse.json({ messages });
}

async function composeReply(
  room: string,
  identity: string,
  message: string
): Promise<{ text: string; sources: string[] }> {
  const q = message.toLowerCase().trim();
  const sources: string[] = [];

  // Pull context: last 30 chat messages + last 30 transcript lines
  const chats = listChat(room, 0, 30);
  const transcripts = listTranscripts(room, 0, 30);
  const chatCorpus = chats.map((c) => `[chat] ${c.name ?? c.identity}: ${c.body}`).join("\n");
  const txCorpus = transcripts.map((t) => `[transcript] ${t.name ?? t.identity}: ${t.text}`).join("\n");
  const corpus = (chatCorpus + "\n" + txCorpus).toLowerCase();

  // Quick intent matches
  if (/summari[sz]e|tl;dr|recap|wrap.?up/.test(q)) {
    const highlights = topSpeakers(room, transcripts);
    const topics = extractTopics(transcripts, chats);
    return {
      text:
        `**Meeting recap so far**\n\n` +
        `• ${chats.length + transcripts.length} lines captured (${chats.length} chat, ${transcripts.length} transcript)\n` +
        `• Most active speakers: ${highlights}\n` +
        `• Topics mentioned: ${topics}\n\n` +
        `_Tap an insight to mark resolved, or ask "what decisions were made?"._`,
      sources: ["chat", "transcript"],
    };
  }

  if (/action.?item|todo|next step|assign/.test(q)) {
    const items = listInsights(room, true).filter((i) => i.kind === "action_item");
    if (items.length === 0) {
      return {
        text: `No action items yet. They appear automatically when someone says phrases like "I'll send that out" or "Mudit will own X". Try mentioning a task out loud.`,
        sources: [],
      };
    }
    return {
      text: `**Action items (${items.length})**\n\n` + items.map((i) => `• ${i.text} — _${i.source ?? "?"}_`).join("\n"),
      sources: ["insights"],
    };
  }

  if (/decision|decided|agreed/.test(q)) {
    const items = listInsights(room, false).filter((i) => i.kind === "decision");
    if (items.length === 0) return { text: `No decisions captured yet.`, sources: [] };
    return {
      text: `**Decisions**\n\n` + items.map((i) => `• ${i.text}`).join("\n"),
      sources: ["insights"],
    };
  }

  if (/who|raised|hand|queue/.test(q)) {
    return {
      text: `Hand raises and the people queue appear in the **People** panel. I'll surface them automatically in your action items if someone commits to a task.`,
      sources: [],
    };
  }

  if (/poll|vote|result/.test(q)) {
    return {
      text: `Live poll results are in the **Polls** tab. I'll auto-summarise the winning option here once the host closes a poll.`,
      sources: [],
    };
  }

  if (/transcript|captions|caption|what.*said|who said/.test(q)) {
    if (transcripts.length === 0) {
      return { text: `No captions captured yet — toggle Live Captions (CC) in the meeting and a few lines will show up here.`, sources: [] };
    }
    const last = transcripts.slice(-5);
    return {
      text: `**Recent speech**\n\n` + last.map((t) => `> _${t.name ?? t.identity}_: ${t.text}`).join("\n\n"),
      sources: ["transcript"],
    };
  }

  if (/translate|hindi|spanish|french|german/.test(q)) {
    return {
      text: `Real-time translation ships next quarter. For now I can fetch any spoken line if you ask "what did X just say?".`,
      sources: [],
    };
  }

  if (/help|what can you|commands|menu/.test(q)) {
    return {
      text:
        `I can answer:\n` +
        `• "Summarize this meeting"\n` +
        `• "What are the action items?"\n` +
        `• "What did [name] say?"\n` +
        `• "Show recent transcript"\n` +
        `• "Poll results"\n` +
        `• "Decisions made"`,
      sources: [],
    };
  }

  if (corpus.includes(q.replace(/[^a-z0-9 ]/g, "")) && q.length > 4) {
    const hitChat = chats.find((c) => c.body?.toLowerCase().includes(q));
    if (hitChat) {
      return {
        text: `Found a match in chat:\n\n> _${hitChat.name ?? hitChat.identity}_: ${hitChat.body}`,
        sources: ["chat"],
      };
    }
    const hitTx = transcripts.find((t) => t.text?.toLowerCase().includes(q));
    if (hitTx) {
      return {
        text: `Found a match in transcript:\n\n> _${hitTx.name ?? hitTx.identity}_: ${hitTx.text}`,
        sources: ["transcript"],
      };
    }
  }

  return {
    text:
      `I'm your AI sidekick — I haven't found a confident answer yet. Try one of these:\n\n` +
      `• "Summarize this meeting"\n` +
      `• "What are the action items?"\n` +
      `• "What did [name] say?"\n\n` +
      `_The corpus I'm searching: ${chats.length} chat messages, ${transcripts.length} transcript lines._`,
    sources: [],
  };
}

function topSpeakers(room: string, transcripts: any[]): string {
  const counts = new Map<string, number>();
  for (const t of transcripts) {
    counts.set(t.name ?? t.identity, (counts.get(t.name ?? t.identity) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).join(", ") || "no speakers yet";
}

function extractTopics(transcripts: any[], chats: any[]): string {
  const stop = new Set(["the", "and", "to", "of", "a", "is", "in", "that", "we", "i", "it", "you", "for", "on", "with", "this", "be", "have", "are", "as", "so", "but", "or"]);
  const counts = new Map<string, number>();
  for (const c of [...transcripts.map((t) => t.text), ...chats.map((c) => c.body)]) {
    for (const w of (c ?? "").toLowerCase().split(/\W+/)) {
      if (w.length < 4 || stop.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w).join(", ") || "none detected";
}

async function extractInsights(room: string, message: string, identity: string) {
  const lower = message.toLowerCase();

  // Action item patterns
  const aiPatterns = [
    /\b(i'?ll|i will|let me|going to|gonna)\s+(send|write|build|ship|fix|review|check|follow up|reach out|circle back|own|take|handle|do)\b/i,
    /\b(\w+)\s+(will|should|to)\s+(send|write|build|ship|fix|review|check|own|take|handle|do)\b/i,
    /\b(action item|todo|to-?do|task)\b[:\s]/i,
  ];
  for (const re of aiPatterns) {
    const m = message.match(re);
    if (m) {
      addInsight({
        room,
        kind: "action_item",
        text: message.trim().slice(0, 240),
        source: identity,
        confidence: 0.85,
      });
      break;
    }
  }

  // Decision patterns
  if (/\b(we'?ve? decided|decision|agreed|let'?s go with|going with|ship it|approved)\b/i.test(lower)) {
    addInsight({ room, kind: "decision", text: message.trim().slice(0, 240), source: identity, confidence: 0.8 });
  }

  // Open question patterns (only if not addressed to me)
  if (/\?$/.test(message.trim()) && !lower.startsWith("summarize") && !lower.startsWith("what are")) {
    addInsight({ room, kind: "question", text: message.trim().slice(0, 240), source: identity, confidence: 0.6 });
  }
}