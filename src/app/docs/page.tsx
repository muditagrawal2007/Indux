"use client";

// /docs — searchable documentation index. Each feature has a how-to.
// All static — no API calls needed.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icons";

type Doc = {
  id: string;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  shortcut?: string;
};

const DOCS: Doc[] = [
  {
    id: "join",
    title: "Join a meeting",
    category: "Getting started",
    summary: "Three ways to join: name, link, or personal room URL.",
    steps: [
      "Open the launcher at the home page.",
      "Type your name and click Start to spin up a new room — you'll get a personal URL.",
      "To join someone else's meeting, paste their link or type the room code and click Join.",
    ],
  },
  {
    id: "share",
    title: "Share your screen",
    category: "In a meeting",
    summary: "Share apps, tabs, or your entire screen.",
    steps: [
      "Click the screen-share button in the bottom toolbar.",
      "Pick what to share: a window, a tab, or your whole screen.",
      "Click Stop sharing when done — your video tile restores automatically.",
    ],
    shortcut: "S",
  },
  {
    id: "chat",
    title: "Send a chat message",
    category: "In a meeting",
    summary: "Persistent text chat survives across reconnects.",
    steps: [
      "Press C or click the chat icon in the toolbar.",
      "Type your message and hit Enter or the send icon.",
      "Hover any message to react with an emoji.",
    ],
    shortcut: "C",
  },
  {
    id: "reactions",
    title: "Send a live reaction",
    category: "In a meeting",
    summary: "Six reactions float up the screen for everyone.",
    steps: [
      "Click the thumbs-up icon in the toolbar.",
      "Pick one of the six reactions.",
      "Watch it float across the screen — yours and everyone else's.",
    ],
  },
  {
    id: "hand",
    title: "Raise your hand",
    category: "In a meeting",
    summary: "Queue up to speak in a large meeting.",
    steps: [
      "Press R or open the More menu and click Raise hand.",
      "The host sees your name in the queue with a hand icon.",
      "Lower your hand the same way once acknowledged.",
    ],
    shortcut: "R",
  },
  {
    id: "backgrounds",
    title: "Use a virtual background",
    category: "Customization",
    summary: "Blur your background or pick one of 4 stock images.",
    steps: [
      "Click the image icon in the bottom toolbar.",
      "Pick None, Blur, Sunset, Office, Forest, or Beach.",
      "Optionally toggle Touch-up for a subtle contrast boost.",
    ],
  },
  {
    id: "touch-up",
    title: "Touch-up appearance",
    category: "Customization",
    summary: "Subtle contrast/saturation boost to your video.",
    steps: [
      "Open the Background menu (image icon).",
      "Toggle the Touch-up switch.",
      "Your video gains contrast, saturation, and brightness — instantly.",
    ],
  },
  {
    id: "ptt",
    title: "Push to talk",
    category: "Customization",
    summary: "Hold Space to unmute, release to mute.",
    steps: [
      "Mute yourself with the mic button (M).",
      "Hold the Space bar — your mic turns on while held.",
      "Release Space — mic mutes again.",
      "Useful for noisy rooms or shared spaces.",
    ],
    shortcut: "Space",
  },
  {
    id: "polls",
    title: "Run a poll",
    category: "Moderation",
    summary: "Engage your audience with a multi-choice vote.",
    steps: [
      "As host, open the People panel and click Polls.",
      "Type a question and 2-4 options, click Launch.",
      "Vote results animate count-up after you close the poll.",
    ],
  },
  {
    id: "lobby",
    title: "Enable the waiting room",
    category: "Moderation",
    summary: "Admit people one at a time. Zoom-style.",
    steps: [
      "As host, open the Manage panel (shield icon in header).",
      "Toggle Lock room.",
      "New joiners see a Waiting screen; admit or deny from the People panel.",
    ],
  },
  {
    id: "breakouts",
    title: "Run breakout rooms",
    category: "Moderation",
    summary: "Split participants into smaller groups.",
    steps: [
      "As host, open Manage → Breakouts.",
      "Pick auto-assign (round-robin) or pre-assign names to rooms.",
      "Set a duration timer — participants auto-return when it ends.",
    ],
  },
  {
    id: "whiteboard",
    title: "Use the whiteboard",
    category: "Collaboration",
    summary: "Free-form drawing with sticky notes and shapes.",
    steps: [
      "Press W or open More → Whiteboard.",
      "Pick a tool from the toolbar: pen, shapes, sticky notes, eraser.",
      "Use Ctrl+Z to undo, Ctrl+Shift+Z to redo.",
    ],
    shortcut: "W",
  },
  {
    id: "schedule",
    title: "Schedule a meeting",
    category: "Productivity",
    summary: "Send a calendar invite to attendees.",
    steps: [
      "Open the Schedule page.",
      "Click New meeting.",
      "Pick a start time, duration, and recurring pattern.",
      "Download the .ics file and email it to attendees.",
    ],
  },
  {
    id: "embed",
    title: "Embed in a website",
    category: "Productivity",
    summary: "Add a Join button to any site.",
    steps: [
      "Copy this iframe into your site: <iframe src='https://meet.indux.com/embed/your-room' />",
      "Visitors get a one-click join experience with no sign-up.",
      "Pass ?embed=1 to hide chrome.",
    ],
  },
  {
    id: "record",
    title: "Record a meeting",
    category: "Recording",
    summary: "In-browser recording saved to your account.",
    steps: [
      "Open the More menu.",
      "Click Record — pick the screen/window to capture.",
      "Click Stop when done. The recording uploads and appears in your library.",
    ],
  },
  {
    id: "ai-summary",
    title: "Get an AI summary",
    category: "AI",
    summary: "Extracts action items, decisions, and blockers.",
    steps: [
      "After a meeting ends, open the room page.",
      "Click AI Summary.",
      "View structured output: action items, decisions, blockers, next steps.",
    ],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(DOCS.map((d) => d.category)))];

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOCS.filter((d) => {
      if (cat !== "All" && d.category !== cat) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.steps.join(" ").toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)]">
      <div className="aurora-bg" />

      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            ← Back
          </Link>
          <h1 className="text-sm font-semibold">Documentation</h1>
          <Link
            href="/roadmap"
            className="text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            Roadmap →
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        <section className="animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
            <Icon.FileText size={12} />
            Documentation
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            How to do anything.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--text-secondary)]">
            {DOCS.length} guides covering setup, in-meeting, customization, and
            integrations. Search or filter by category.
          </p>
        </section>

        <section className="mt-8 flex flex-col gap-4">
          <div className="relative">
            <Icon.Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] py-3 pl-10 pr-4 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all " +
                  (cat === c
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                    : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-3">
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-[color:var(--text-muted)]">
              No results. Try a different search.
            </p>
          )}
          {filtered.map((d) => (
            <details
              key={d.id}
              className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5 transition-all hover:border-[color:var(--border-strong)] open:shadow-md"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <div>
                  <h3 className="text-base font-semibold">{d.title}</h3>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {d.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {d.shortcut && (
                    <kbd className="bg-[color:var(--bg-sunken)]">
                      {d.shortcut}
                    </kbd>
                  )}
                  <span className="rounded-full bg-[color:var(--bg-sunken)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-tertiary)]">
                    {d.category}
                  </span>
                  <Icon.ChevronDown
                    size={14}
                    className="text-[color:var(--text-muted)] transition-transform group-open:rotate-180"
                  />
                </div>
              </summary>
              <ol className="mt-4 space-y-2 border-t border-[color:var(--border)] pt-4">
                {d.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-[color:var(--text-secondary)]"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--accent)]/10 text-[10px] font-bold text-[color:var(--accent)]">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </section>
      </main>
    </div>
  );
}