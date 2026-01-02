"use client";

import { useEffect, useRef, useState } from "react";

// Browser-based live captions using SpeechRecognition API
// Supports Chrome (webkitSpeechRecognition) and Safari 14.1+
export function LiveCaptions() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + " ";
        else interimText += t;
      }
      if (finalText) {
        setText((prev) => prev + finalText);
        setInterim("");
      } else {
        setInterim(interimText);
      }
    };
    r.onerror = (e: any) => {
      setError(e.error || "speech recognition error");
      setEnabled(false);
    };
    r.onend = () => {
      // Auto-restart if still enabled
      if (enabled) {
        try { r.start(); } catch {}
      }
    };
    recogRef.current = r;
    return () => {
      try { r.stop(); } catch {}
    };
  }, [enabled]);

  const toggle = () => {
    if (!recogRef.current) return;
    if (enabled) {
      recogRef.current.stop();
      setEnabled(false);
    } else {
      setError(null);
      setText("");
      recogRef.current.start();
      setEnabled(true);
    }
  };

  const clear = () => {
    setText("");
    setInterim("");
  };

  if (error && !enabled) {
    return (
      <button
        title={error}
        className="rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700"
      >
        Captions
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggle}
        className={
          "rounded-md px-2.5 py-1 text-xs font-medium " +
          (enabled
            ? "bg-yellow-600 text-white hover:bg-yellow-700"
            : "border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700")
        }
      >
        {enabled ? "CC on" : "Captions"}
      </button>
      {enabled && text && (
        <button
          onClick={clear}
          className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] text-gray-400 hover:bg-gray-700"
          title="Clear captions"
        >
          ✕
        </button>
      )}
      {enabled && (text || interim) && (
        <div className="absolute bottom-16 left-1/2 max-w-2xl -translate-x-1/2 rounded-md bg-black/80 px-4 py-2 text-center text-sm text-white">
          {text}
          <span className="opacity-60">{interim}</span>
        </div>
      )}
    </div>
  );
}