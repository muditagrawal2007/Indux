"use client";

import { useEffect, useRef, useState } from "react";

type Note = { body: string; updated_by: string | null; updated_at: number };

export function NotesPanel({ roomId, identity, userName, onClose }: { roomId: string; identity: string; userName: string; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const last = useRef("");
  const ta = useRef<HTMLTextAreaElement>(null);

  async function refresh() {
    const r = await fetch(`/api/rooms/${roomId}/notes`);
    const data = await r.json();
    if (data.notes && data.notes.body !== last.current) {
      last.current = data.notes.body;
      setBody(data.notes.body);
      setUpdatedBy(data.notes.updated_by);
      setUpdatedAt(data.notes.updated_at);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [roomId]);

  async function save() {
    last.current = body;
    await fetch(`/api/rooms/${roomId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, by: userName }),
    });
  }

  // Debounced auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      if (body !== last.current) save();
    }, 800);
    return () => clearTimeout(t);
  }, [body]);

  return (
    <div className="absolute right-4 top-12 z-40 flex h-[28rem] w-[36rem] max-w-[90vw] flex-col rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <h3 className="text-sm font-medium">Shared notes</h3>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          {updatedBy && <span>Last edit by {updatedBy}</span>}
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"></button>
        </div>
      </div>
      <textarea
        ref={ta}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`# Meeting notes

Type here. Markdown supported.

- Action item 1
- Action item 2`}
        className="flex-1 resize-none bg-gray-950 p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
      />
      <div className="border-t border-gray-800 px-3 py-1.5 text-[11px] text-gray-500">
        Auto-saves · 800ms after typing
      </div>
    </div>
  );
}