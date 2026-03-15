"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./components/CommandPalette";

export default function InduxLauncher() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);

    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
    document.documentElement.dataset.density = localStorage.getItem("indux_density") || "default";
    document.documentElement.dataset.motion = localStorage.getItem("indux_motion") || "full";

    // Load Jitsi-style config
    const s = document.createElement("script");
    s.src = "/api/config.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  function startWithName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
    if (!slug) return;
    router.push(`/u/${slug}?name=${encodeURIComponent(trimmed)}`);
  }

  function joinWithCode() {
    const cleaned = joinCode.trim();
    if (!cleaned) return;
    const c = cleaned.replace(/^https?:\/\/[^/]+\/meet\//, "").replace(/^\/+/, "").split("/")[0];
    if (c) router.push(`/meet/${c}`);
  }

  function toggleTheme() {
    const isDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("indux_theme", isDark ? "dark" : "light");
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <CommandPalette />

      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
            >
              IX
            </div>
            <span className="text-sm font-semibold tracking-tight">Indux Meet</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(e);
              }}
              className="hidden items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] md:flex"
            >
              <span>Quick actions</span>
              <kbd>⌘K</kbd>
            </button>
            <Link href="/schedule" className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]">
              Schedule
            </Link>
            <Link href="/settings" className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]">
              Settings
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="ml-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)]"
            >
              <span className="block dark:hidden">🌙</span>
              <span className="hidden dark:block">☀</span>
            </button>
          </nav>
          {/* Mobile theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)] md:hidden"
          >
            <span className="block dark:hidden">🌙</span>
            <span className="hidden dark:block">☀</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-20 pb-24">
        {/* Hero */}
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Free for everyone · 30+ features
          </div>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Meetings, made simple.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--text-secondary)] md:text-lg">
            Type your name to start a personal room. Or paste a code to join.
          </p>
        </div>

        {/* Primary CTAs — spacious */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Start a meeting */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-colors hover:border-[color:var(--border-strong)]">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bg-sunken)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Start
            </div>
            <h2 className="text-xl font-semibold">New meeting</h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Get a personal room URL you can share.
            </p>
            <div className="mt-6 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startWithName()}
                placeholder="Your name"
                autoFocus
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
              <button
                onClick={startWithName}
                disabled={!name.trim()}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                Start
              </button>
            </div>
            <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
              Press <kbd>Enter</kbd> to start
            </p>
          </div>

          {/* Join a meeting */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-colors hover:border-[color:var(--border-strong)]">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bg-sunken)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Join
            </div>
            <h2 className="text-xl font-semibold">With a code or link</h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Paste a meeting link or type the code.
            </p>
            <div className="mt-6 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinWithCode()}
                placeholder="indux.com/meet/abc-123-xyz"
                className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
              <button
                onClick={joinWithCode}
                disabled={!joinCode.trim()}
                className="rounded-lg bg-[color:var(--bg-elevated)] px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--bg-sunken)] disabled:opacity-40"
              >
                Join
              </button>
            </div>
            <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
              Works on slow networks too
            </p>
          </div>
        </div>

        {/* Personal room shortcuts */}
        <div className="mt-8">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
            Quick rooms
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RoomCard href="/u/demo" title="Demo" desc="Try it now" />
            <RoomCard href="/u/team" title="Team" desc="Daily standup" />
            <RoomCard href="/u/standup" title="Standup" desc="This week" />
            <RoomCard href="/u/all-hands" title="All-hands" desc="Monthly" />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 border-t border-[color:var(--border)] pt-8 text-center">
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Indux Meet · Powered by LiveKit · Open source · $0
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Made for everyone · <Link href="/schedule" className="hover:text-[color:var(--text-secondary)]">Schedule</Link> · <Link href="/settings" className="hover:text-[color:var(--text-secondary)]">Settings</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function RoomCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elevated)]"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-[color:var(--text-tertiary)]">{desc}</div>
    </Link>
  );
}