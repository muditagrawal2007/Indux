"use client";

// Live captions — real Web Speech API overlay.
// Shows captions as a bottom-center floating karaoke-style overlay.
// Speaker name is "You" (no speaker diarization without server processing).

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function LiveCaptions({ enabled, setEnabled }: { enabled: boolean; setEnabled: (v: boolean) => void }) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
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
        setText((prev) => (prev + " " + finalText).trim().slice(-500));
        setInterim("");
      } else if (interimText) {
        setInterim(interimText);
      }
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access denied");
        setEnabled(false);
      }
    };
    r.onend = () => {
      if (recogRef.current && enabled) {
        try {
          r.start();
        } catch {
          // ignore
        }
      }
    };
    recogRef.current = r;
    return () => {
      try {
        r.stop();
      } catch {}
      recogRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recogRef.current) return;
    if (enabled) {
      setError(null);
      try {
        recogRef.current.start();
      } catch {
        // already started
      }
    } else {
      try {
        recogRef.current.stop();
      } catch {}
    }
  }, [enabled]);

  if (!supported) {
    return (
      <button
        title={error ?? "Not supported"}
        className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/40 backdrop-blur-sm"
      >
        <Icon.Info size={10} />
        No captions
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setEnabled(!enabled)}
        className={
          "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors " +
          (enabled
            ? "bg-amber-500/20 text-amber-300"
            : "bg-black/50 text-white/50 hover:bg-black/70 hover:text-white/70")
        }
        title={error ?? "Live captions"}
      >
        <span
          className={
            "h-1.5 w-1.5 rounded-full " +
            (enabled ? "bg-amber-400 animate-pulse" : "bg-white/30")
          }
        />
        {enabled ? "CC on" : "Captions"}
      </button>
      {enabled && (text || interim) && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 max-w-2xl -translate-x-1/2 animate-fadeIn">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-5 py-3 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wide text-white/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              <span>You</span>
              <span>· live captions</span>
            </div>
            <p className="text-base leading-relaxed text-white">
              {text}
              {interim && <span className="text-white/50">{interim}</span>}
            </p>
          </div>
        </div>
      )}
    </>
  );
}