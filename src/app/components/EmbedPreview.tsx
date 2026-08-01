"use client";

// Indux Meet — Embed preview.
// Shows what a meeting looks like when dropped into another site.
// Uses a real iframe pointing at /embed/[roomId].

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const SAMPLE_ROOMS = ["demo", "all-hands", "standup"] as const;

export function EmbedPreview() {
  const [room, setRoom] = useState<string>("demo");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  // Compute the origin only after mount so SSR and CSR markup match.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = origin ? `${origin}/embed/${room}` : `/embed/${room}`;
  const snippet = `<iframe src="${url}" width="100%" height="600" allow="camera; microphone; display-capture; autoplay" style="border-radius:12px;border:0"></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 sm:p-8">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
            <Icon.Link size={9} />
            Embed
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">
            Drop a meeting into any site
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-[color:var(--text-secondary)]">
            One iframe line. Powered by LiveKit, styled like your brand.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {SAMPLE_ROOMS.map((r) => (
            <button
              key={r}
              onClick={() => setRoom(r)}
              className={
                "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all " +
                (r === room
                  ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                  : "border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)]/30")
              }
            >
              /{r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sample article */}
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]">
          <div className="border-b border-[color:var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
            sample article
          </div>
          <div className="p-4">
            <h4 className="text-base font-semibold">Q3 Roadmap: What&apos;s next</h4>
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--text-secondary)]">
              Join the team Tuesday for a live walkthrough of the new agenda. Bring your
              questions for the Q&amp;A and demo at the end.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--text-secondary)]">
              RSVP via the embedded call below. No app install needed.
            </p>
          </div>
        </div>

        {/* The actual iframe */}
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-black lg:col-span-2">
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-zinc-900 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400/80" />
            <span className="h-2 w-2 rounded-full bg-yellow-400/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <span className="ml-2 truncate font-mono text-[10px] text-zinc-400">your-site.com/blog/q3</span>
          </div>
          <div className="relative aspect-[16/9] w-full bg-zinc-950">
            <iframe
              title="Indux meeting embed preview"
              src={`/embed/${room}?name=Visitor`}
              className="absolute inset-0 h-full w-full"
              allow="camera; microphone; display-capture; autoplay"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--border)] bg-zinc-950">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[10px] text-zinc-400">
          <span className="font-mono">embed.html</span>
          <button
            onClick={copy}
            className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/10 transition-colors"
          >
            {copied ? "Copied!" : "Copy snippet"}
          </button>
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
{snippet}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <Icon.Lock size={11} />
          Iframe inherits room lock settings, encryption, and branding.
        </span>
        <Link
          href="/docs#embed"
          className="text-[color:var(--accent)] hover:underline"
        >
          Read the embed docs →
        </Link>
      </div>
    </div>
  );
}
