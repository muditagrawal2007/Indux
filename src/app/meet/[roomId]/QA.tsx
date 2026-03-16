"use client";

import { useEffect, useState } from "react";

type Q = {
  id: string;
  asker: string;
  asker_name: string | null;
  question: string;
  answer: string | null;
  answered_by: string | null;
  upvotes: number;
  approved: boolean;
  created_at: number;
};

export function QAPanel({ roomId, identity, userName, isAdmin, onClose }: { roomId: string; identity: string; userName: string; isAdmin: boolean; onClose: () => void }) {
  const [list, setList] = useState<Q[]>([]);
  const [question, setQuestion] = useState("");
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  async function refresh() {
    const r = await fetch(`/api/rooms/${roomId}/qa${isAdmin ? "" : "?approved=1"}`);
    const data = await r.json();
    setList(data.questions ?? []);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [roomId, isAdmin]);

  async function ask() {
    const text = question.trim();
    if (!text) return;
    setQuestion("");
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asker: identity, asker_name: userName, question: text }),
    });
    refresh();
  }

  async function upvote(id: string) {
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upvote", id }),
    });
    refresh();
  }

  async function approve(id: string) {
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    refresh();
  }

  async function answer(id: string) {
    const text = (answerDraft[id] || "").trim();
    if (!text) return;
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", id, answer: text, answeredBy: identity }),
    });
    setAnswerDraft((s) => ({ ...s, [id]: "" }));
    refresh();
  }

  // Sort by upvotes desc, then by time
  const sorted = [...list].sort((a, b) => b.upvotes - a.upvotes || a.created_at - b.created_at);

  return (
    <div className="absolute bottom-12 right-4 z-40 flex h-[28rem] w-[28rem] max-w-[90vw] flex-col rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <h3 className="text-sm font-medium">Q&A</h3>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {sorted.length === 0 && (
          <p className="text-center text-xs text-gray-500">No questions yet.</p>
        )}
        {sorted.map((q) => (
          <div key={q.id} className="rounded border border-gray-800 bg-gray-900 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-xs text-gray-500">
                  {q.asker_name || q.asker}
                  {!q.approved && isAdmin && <span className="ml-2 rounded bg-yellow-900/40 px-1 text-yellow-300">pending</span>}
                </div>
                <div className="mt-1 text-sm">{q.question}</div>
                {q.answer && (
                  <div className="mt-2 rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs">
                    <span className="text-gray-500">{q.answered_by}: </span>
                    {q.answer}
                  </div>
                )}
              </div>
              <button
                onClick={() => upvote(q.id)}
                className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded border border-gray-700 hover:bg-gray-800"
                title="Upvote"
              >
                <span className="text-[10px]">+</span>
                <span className="text-[10px] font-medium">{q.upvotes}</span>
              </button>
            </div>
            {isAdmin && !q.approved && (
              <button onClick={() => approve(q.id)} className="mt-2 rounded border border-gray-700 px-2 py-0.5 text-[11px] hover:bg-gray-800">
                Approve
              </button>
            )}
            {isAdmin && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={answerDraft[q.id] || ""}
                  onChange={(e) => setAnswerDraft((s) => ({ ...s, [q.id]: e.target.value }))}
                  placeholder="Answer..."
                  className="flex-1 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs placeholder-gray-600"
                />
                <button onClick={() => answer(q.id)} className="rounded bg-gray-800 px-2 py-1 text-[11px] hover:bg-gray-700">Send</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-800 p-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
          placeholder="Ask a question..."
          className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm placeholder-gray-500 focus:border-gray-500 focus:outline-none"
        />
        <button onClick={ask} className="rounded bg-gray-800 px-3 py-1 text-xs hover:bg-gray-700">Ask</button>
      </div>
    </div>
  );
}