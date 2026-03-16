"use client";

import { useEffect, useRef, useState } from "react";

type Line = { id: number; text: string; ts_ms: number; identity: string; name: string | null };

export function TranscriptPanel({
  roomId,
  identity,
  userName,
  onClose,
}: {
  roomId: string;
  identity: string;
  userName: string;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recogRef = useRef<any>(null);
  const lastSentRef = useRef(0);
  const sinceRef = useRef(0);

  // Poll server-side transcripts
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/transcripts?since=${sinceRef.current}`);
        const data = await r.json();
        if (data.transcripts?.length && !cancelled) {
          sinceRef.current = data.transcripts[data.transcripts.length - 1].id;
          setLines((prev) => {
            const seen = new Set(prev.map((l) => l.id));
            return [...prev, ...data.transcripts.filter((l: Line) => !seen.has(l.id))];
          });
        }
      } catch {}
    }
    poll();
    const t = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  useEffect(() => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }
      if (finalText && Date.now() - lastSentRef.current > 500) {
        lastSentRef.current = Date.now();
        const text = finalText.trim();
        if (text.length > 2) {
          fetch(`/api/rooms/${roomId}/transcripts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity, name: userName, text, ts_ms: Date.now() }),
          });
        }
      }
    };
    r.onerror = (e: any) => setError(e.error || "speech error");
    r.onend = () => {
      if (enabled) {
        try { r.start(); } catch {}
      }
    };
    recogRef.current = r;
    return () => { try { r.stop(); } catch {} };
  }, [enabled, identity, userName, roomId]);

  const toggle = () => {
    if (!recogRef.current) return;
    if (enabled) {
      recogRef.current.stop();
      setEnabled(false);
    } else {
      setError(null);
      recogRef.current.start();
      setEnabled(true);
    }
  };

  return (
    <div className="absolute right-4 top-12 z-40 flex h-[28rem] w-[36rem] max-w-[90vw] flex-col rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Live transcript</h3>
          {enabled && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className={
              "rounded-md px-2.5 py-1 text-xs font-medium " +
              (enabled ? "bg-red-600 text-white hover:bg-red-700" : "border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700")
            }
          >
            {enabled ? "Stop" : error ? "Unavailable" : "Start transcribing"}
          </button>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"></button>
        </div>
      </div>
      {error && (
        <div className="border-b border-yellow-800 bg-yellow-900/20 px-3 py-1.5 text-[11px] text-yellow-300">
          {error}
        </div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {lines.length === 0 && (
          <p className="text-center text-xs text-gray-500">
            {enabled ? "Speak to see live captions..." : "Click Start transcribing to enable captions for the whole room."}
          </p>
        )}
        {lines.map((l) => (
          <div key={l.id} className="break-words">
            <span className="text-[11px] font-medium text-gray-400">{l.name || l.identity}:</span>{" "}
            <span className="text-gray-200">{l.text}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 px-3 py-1.5 text-[11px] text-gray-500">
        Server-side · everyone in the room sees your words · works best in Chrome
      </div>
    </div>
  );
}