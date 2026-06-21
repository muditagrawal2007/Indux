"use client";

// TranslatedCaptions — listens to live transcript lines, batches them,
// and translates to a chosen target language. Renders the most recent line
// with a fade-in + the previous line fading out.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

const LANGS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  nl: "Dutch",
  tr: "Turkish",
  pl: "Polish",
};

type Line = { id: number; original: string; translated: string; speaker: string; ts: number };

export function TranslatedCaptions({
  roomId, className,
}: {
  roomId: string;
  identity: string;
  className?: string;
}) {
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("indux_caption_lang") || "en";
  });
  const [enabled, setEnabled] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("indux_caption_lang", lang);
  }, [lang]);

  // Poll transcripts and translate any new ones
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let sinceId = 0;

    async function fetchOnce() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/transcripts?since=${sinceId}`);
        const d = await r.json();
        if (cancelled || !d.lines?.length) return;
        sinceId = d.lines[d.lines.length - 1].id;

        const newOnes = (d.lines as any[]).slice(-5).map((l) => ({
          id: l.id,
          original: l.text,
          translated: l.text,
          speaker: l.name || l.identity,
          ts: l.ts_ms ?? Date.now(),
        }));

        setLines((prev) => {
          const merged = [...prev, ...newOnes].slice(-10);
          return merged;
        });

        if (lang !== "en" && newOnes.length) {
          setBusy(true);
          try {
            const tr = await fetch(`/api/translate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lines: newOnes.map((n) => n.original), langs: [lang] }),
            });
            const td = await tr.json();
            const translatedLines = td?.translations?.[lang] ?? [];
            setLines((prev) =>
              prev.map((p) => {
                const idx = newOnes.findIndex((n) => n.id === p.id);
                if (idx >= 0 && translatedLines[idx]) {
                  return { ...p, translated: translatedLines[idx] };
                }
                return p;
              })
            );
          } catch {} finally {
            setBusy(false);
          }
        }
      } catch {}
    }

    fetchOnce();
    const t = setInterval(fetchOnce, 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [enabled, lang, roomId]);

  const visible = lines.slice(-2);

  if (!enabled) {
    return (
      <div className={"relative " + (className ?? "")}>
        <button
          onClick={() => setEnabled(true)}
          className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/50 backdrop-blur-sm hover:bg-black/70 hover:text-white/70 transition-colors"
          title="Translated captions"
        >
          <Icon.Globe size={11} />
          <span className="font-mono">CC</span>
        </button>
      </div>
    );
  }

  return (
    <div className={"relative " + (className ?? "")}>
      {/* Caption strip */}
      {visible.length > 0 && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 max-w-[80vw] space-y-1">
          {visible.slice(-1).map((l) => (
            <div
              key={l.id}
              className="animate-fadeIn rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-center text-sm text-white shadow-2xl backdrop-blur-md"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{l.speaker}</div>
              <div className="mt-0.5 leading-relaxed">
                {lang === "en" ? l.original : (l.translated || l.original)}
              </div>
              {busy && lang !== "en" && l.translated === l.original && (
                <div className="mt-1 text-[9px] text-white/30">translating…</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Control pill */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2 py-1 text-[10px] font-medium text-cyan-200 backdrop-blur-sm hover:bg-cyan-500/30"
          title="Translation language"
        >
          <Icon.Globe size={11} />
          <span>{LANGS[lang] ?? lang}</span>
        </button>
        <button
          onClick={() => setEnabled(false)}
          className="rounded-lg bg-black/50 px-1.5 py-1 text-[10px] text-white/50 backdrop-blur-sm hover:bg-black/70 hover:text-white/70"
          title="Hide captions"
          aria-label="Hide captions"
        >
          <Icon.Close size={9} />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-white/10 bg-[#16161e]/95 p-1 shadow-2xl backdrop-blur-xl animate-scaleIn">
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(LANGS).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setPickerOpen(false); }}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors " +
                    (lang === code
                      ? "bg-cyan-500/15 text-cyan-200"
                      : "text-white/60 hover:bg-white/5 hover:text-white")
                  }
                >
                  <span>{name}</span>
                  {lang === code && <Icon.Check size={11} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}