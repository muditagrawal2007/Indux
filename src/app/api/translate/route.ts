import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// MyMemory translation API — free, no key, ~5000 chars/day per IP
// Docs: https://mymemory.translated.net/doc/spec.php
async function translate(text: string, lang: string): Promise<string> {
  if (!text || !lang || lang === "en") return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|${encodeURIComponent(lang)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return text;
    const d = await r.json();
    const out = d?.responseData?.translatedText;
    if (typeof out === "string" && out && !out.toLowerCase().includes("invalid language")) return out;
    return text;
  } catch {
    return text;
  }
}

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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<{ text: string; lang: string; lines: string[]; langs: string[] }>;
  const langs = Array.isArray(body.langs) ? body.langs.filter((l) => LANGS[l]).slice(0, 12) : body.lang ? [body.lang] : [];

  if (Array.isArray(body.lines)) {
    const out: Record<string, string[]> = {};
    for (const lang of langs) {
      out[lang] = await Promise.all(body.lines.slice(0, 60).map((l) => translate(l, lang)));
    }
    return NextResponse.json({ translations: out, supported: LANGS });
  }

  if (body.text && body.lang) {
    const translated = await translate(body.text, body.lang);
    return NextResponse.json({ translated, supported: LANGS });
  }

  return NextResponse.json({ error: "text+lang or lines+langs required" }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ supported: LANGS });
}