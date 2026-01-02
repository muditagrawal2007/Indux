"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./components/CommandPalette";

export default function InduxLauncher() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [accent, setAccent] = useState("indigo");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Apply accent + density + motion
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
    document.documentElement.dataset.density = localStorage.getItem("indux_density") || "default";
    document.documentElement.dataset.motion = localStorage.getItem("indux_motion") || "full";
    setAccent(document.documentElement.dataset.accent);

    // Load Indux config (Jitsi-style)
    const s = document.createElement("script");
    s.src = "/api/config.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  function startWithName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    if (!slug) return;
    // Pass the display name through the URL so PreJoin pre-fills it
    router.push(`/u/${slug}?name=${encodeURIComponent(trimmed)}`);
  }

  function joinWithCode() {
    const cleaned = joinCode.trim();
    if (!cleaned) return;
    const c = cleaned
      .replace(/^https?:\/\/[^/]+\/meet\//, "")
      .replace(/^\/+/, "")
      .split("/")[0];
    if (c) router.push(`/meet/${c}`);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={
        (dark ? "dark " : "") +
        "min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200"
      }
    >
      <CommandPalette />

      {/* Aurora background */}
      <div className="aurora-bg" aria-hidden />

      {/* Top bar */}
      <header className="sticky top-0 z-20 glass border-b border-[color:var(--border)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
            >
              IX
            </div>
            <span className="text-sm font-semibold tracking-tight">Indux</span>
            <span className="text-xs text-[color:var(--text-tertiary)]">/ Meet</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link href="/schedule" className="btn-ghost">Schedule</Link>
            <Link href="/settings" className="btn-ghost">Settings</Link>
            <button
              onClick={() => copy(`indux-${Date.now().toString(36)}`)}
              className="btn-ghost"
              title="Copy something"
            >
              {copied ? "✓" : "Help"}
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.classList.toggle("dark", next);
                localStorage.setItem("indux_theme", next ? "dark" : "light");
              }}
              aria-label="Toggle theme"
              className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)]"
            >
              {dark ? "☀" : "🌙"}
            </button>
            <button
              onClick={() => {
                // Trigger command palette
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(e);
              }}
              className="hidden items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] md:flex"
            >
              <span>Quick actions</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[color:var(--brand-400)] to-[color:var(--brand-700)]" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex animate-fadeIn items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
            <span className="pulse-dot" />
            <span>Open source · Free for everyone · 30+ features</span>
          </div>
          <h1 className="animate-fadeIn stagger-1 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Video meetings,{" "}
            <span className="gradient-text">made simple.</span>
          </h1>
          <p className="animate-fadeIn stagger-2 mt-4 text-pretty text-base text-[color:var(--text-secondary)] md:text-lg">
            Secure HD video, screen share, breakout rooms, whiteboards, and AI summaries.
            No downloads. No accounts. No limits.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 animate-fadeIn stagger-3">
          <div className="lift relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Start
            </div>
            <h3 className="mt-1 text-base font-medium">New meeting</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startWithName()}
                placeholder="Your name"
                className="flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
              <button
                onClick={startWithName}
                className="btn-primary"
              >
                Start
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[color:var(--text-tertiary)]">
              Press <kbd>Enter</kbd> · URL becomes <code className="font-mono">indux.com/u/{name || "your-name"}</code>
            </p>
          </div>

          <div className="lift relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Join
            </div>
            <h3 className="mt-1 text-base font-medium">With a code or link</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinWithCode()}
                placeholder="indux.com/meet/abc-123-xyz"
                className="flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
              <button
                onClick={joinWithCode}
                className="btn-primary"
              >
                Join
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[color:var(--text-tertiary)]">
              Works on slow networks · audio-only mode kicks in
            </p>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4 animate-fadeIn stagger-4">
          <QuickTile href="/u/demo" icon="🎬" title="Demo room" desc="Try it now" />
          <QuickTile href="/u/team-standup" icon="👥" title="Team standup" desc="Daily" />
          <QuickTile href="/u/q3-review" icon="📊" title="Q3 review" desc="Friday" />
          <QuickTile href="/schedule" icon="📅" title="Schedule" desc="Plan ahead" />
        </div>

        {/* Recent meetings */}
        <section className="mt-16">
          <SectionHeader title="Recent" link="View all →" />
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)]">
            <RecentRow code="q3-product-review" title="Q3 Product Review" when="Today, 11:02" dur="42m" people={7} live />
            <RecentRow code="team-standup" title="Team Standup" when="Yesterday" dur="12m" people={5} />
            <RecentRow code="design-critique" title="Design Critique" when="2 days ago" dur="28m" people={4} />
            <RecentRow code="all-hands" title="All-hands" when="Last week" dur="1h 4m" people={42} />
          </div>
        </section>

        {/* Features grid */}
        <section className="mt-16">
          <SectionHeader title="What's included" subtitle="Free for everyone. Forever." />

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="📹"
              title="HD video + screen share"
              desc="WebRTC SFU, sub-200ms latency, 1080p when network allows"
            />
            <FeatureCard
              icon="✋"
              title="Waiting room + knock"
              desc="Lock the room, admit one by one, custom lobby messages"
            />
            <FeatureCard
              icon="💬"
              title="Chat + file sharing"
              desc="Persistent text chat, drag-drop any file, image previews"
            />
            <FeatureCard
              icon="🎉"
              title="Reactions + hand raise"
              desc="Floating emoji, raised-hand queue, ordered by time"
            />
            <FeatureCard
              icon="📊"
              title="Live polls + Q&A"
              desc="Audience votes, upvotes sort, host approves + answers"
            />
            <FeatureCard
              icon="🪟"
              title="Breakout rooms"
              desc="Pre-assign, move users, return all when done"
            />
            <FeatureCard
              icon="📝"
              title="Whiteboard + notes"
              desc="Collaborative drawing (tldraw) and shared Markdown notes"
            />
            <FeatureCard
              icon="📼"
              title="Recording + AI summary"
              desc="In-browser recording, server-side transcript, auto-summary"
            />
            <FeatureCard
              icon="🌐"
              title="Subtitles + translation"
              desc="Live captions, server transcript, 30+ languages"
            />
            <FeatureCard
              icon="🎛"
              title="Per-room settings"
              desc="Toggle any feature for this room — chat, polls, recording, etc."
            />
            <FeatureCard
              icon="📅"
              title="Schedule + ICS export"
              desc="Plan ahead, recurring meetings, .ics for any calendar"
            />
            <FeatureCard
              icon="🏠"
              title="Personal meeting room"
              desc="Stable URL like /u/alice — share it once, use forever"
            />
            <FeatureCard
              icon="🔌"
              title="Embed on any site"
              desc="iframe snippet, public config.js, mobile deep links"
            />
            <FeatureCard
              icon="🎨"
              title="Theme + accent"
              desc="Light, dark, 7 accent colors, motion controls"
            />
            <FeatureCard
              icon="🔒"
              title="Self-hosted · $0"
              desc="Apache 2.0 + MIT. No usage limits. Run on your own infra."
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[color:var(--border)] pt-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Product</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li><Link href="/" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">Meetings</Link></li>
                <li><Link href="/schedule" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">Schedule</Link></li>
                <li><Link href="/settings" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">Settings</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Resources</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li><a href="/api/config.js" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">Config</a></li>
                <li><a href="https://livekit.io" target="_blank" rel="noreferrer" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">LiveKit</a></li>
                <li><a href="https://docs.livekit.io" target="_blank" rel="noreferrer" className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">Docs</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Open source</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li><span className="text-[color:var(--text-secondary)]">Apache 2.0 / MIT</span></li>
                <li><span className="text-[color:var(--text-secondary)]">v1.0.0</span></li>
                <li><span className="text-[color:var(--text-secondary)]">No tracking</span></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Get started</div>
              <p className="mt-3 text-xs text-[color:var(--text-secondary)]">
                Press <kbd>⌘K</kbd> anywhere to open the command palette.
              </p>
              <Link href="/settings" className="mt-2 inline-block text-xs text-[color:var(--accent)] hover:underline">
                Customize appearance →
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-[color:var(--border)] py-6 text-xs text-[color:var(--text-tertiary)] sm:flex-row sm:items-center">
            <div>Indux Meet · Powered by LiveKit · Open source · Self-hosted</div>
            <div>Made for everyone. Especially you.</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function QuickTile({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="lift flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3 hover:border-[color:var(--border-strong)]"
    >
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-[11px] text-[color:var(--text-tertiary)]">{desc}</div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, subtitle, link }: { title: string; subtitle?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{subtitle}</p>}
      </div>
      {link && <span className="text-xs text-[color:var(--accent)] hover:underline">{link}</span>}
    </div>
  );
}

function RecentRow({ code, title, when, dur, people, live }: { code: string; title: string; when: string; dur: string; people: number; live?: boolean }) {
  return (
    <Link
      href={`/meet/${code}`}
      className="group flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[color:var(--bg-elevated)]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-md bg-gradient-to-br from-[color:var(--brand-400)] to-[color:var(--brand-700)] grid place-items-center text-xs font-semibold text-white">
          {title.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate text-sm font-medium">
            {title}
            {live && <span className="badge badge-success"><span className="pulse-dot" style={{ width: 6, height: 6 }} />live</span>}
          </div>
          <div className="truncate text-xs text-[color:var(--text-tertiary)]">/{code}</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-xs text-[color:var(--text-secondary)]">
        <span className="hidden sm:inline">{when}</span>
        <span className="hidden sm:inline tabular-nums">{dur}</span>
        <span className="flex items-center gap-1 tabular-nums">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-muted)]" />
          {people}
        </span>
        <span className="text-[color:var(--accent)] group-hover:underline">Join</span>
      </div>
    </Link>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="lift rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
      <div className="text-xl">{icon}</div>
      <div className="mt-2 text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{desc}</div>
    </div>
  );
}