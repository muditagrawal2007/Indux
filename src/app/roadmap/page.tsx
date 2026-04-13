"use client";

// /roadmap — public status board for every feature. Auto-loaded from a JSON
// manifest so additions to FEATURES update the page without code changes.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../components/Icons";

type Status = "shipped" | "beta" | "soon" | "idea";

type Feature = {
  id: string;
  title: string;
  desc: string;
  category: string;
  status: Status;
  href?: string;
};

const FEATURES: Feature[] = [
  // Core video
  { id: "video-hd", title: "HD Video & Audio", desc: "WebRTC SFU, sub-200ms latency.", category: "Core", status: "shipped" },
  { id: "prejoin", title: "Camera Preview", desc: "Live preview + mic level meter before joining.", category: "Core", status: "shipped" },
  { id: "view-toggle", title: "Tiles / Stage View", desc: "Switch between gallery and stage layouts.", category: "Core", status: "shipped" },
  { id: "screen-share", title: "Screen Share", desc: "Share apps, tabs, or windows.", category: "Core", status: "shipped" },
  { id: "backgrounds", title: "Virtual Backgrounds", desc: "Blur + 4 stock images.", category: "Core", status: "shipped" },
  { id: "touch-up", title: "Touch-up Filter", desc: "Subtle contrast/saturation enhancement.", category: "Core", status: "shipped" },
  { id: "pip", title: "Picture-in-Picture", desc: "Mini self-view floating above other apps.", category: "Core", status: "shipped" },
  { id: "quality", title: "Quality Presets", desc: "Auto / HD / SD / Low / Audio-only.", category: "Core", status: "shipped" },

  // Moderation
  { id: "lobby", title: "Waiting Room (Lobby)", desc: "Knock-to-join with admit/deny.", category: "Moderation", status: "shipped" },
  { id: "mute-all", title: "Mute All / Mute Individual", desc: "Server-side via RoomServiceClient.", category: "Moderation", status: "shipped" },
  { id: "kick", title: "Remove Participant", desc: "Server-side kick + banned list.", category: "Moderation", status: "shipped" },
  { id: "cohost", title: "Co-hosts", desc: "Multi-host support with full admin rights.", category: "Moderation", status: "shipped" },
  { id: "lock", title: "Lock / Unlock Room", desc: "Prevent new joiners.", category: "Moderation", status: "shipped" },
  { id: "rename", title: "Rename Participants", desc: "Server-side display name updates.", category: "Moderation", status: "shipped" },
  { id: "spotlight", title: "Spotlight (Pin)", desc: "Pin a participant's video for everyone.", category: "Moderation", status: "shipped" },

  // Collaboration
  { id: "chat", title: "Persistent Chat", desc: "Saved across joins, file upload, reactions.", category: "Collaboration", status: "shipped" },
  { id: "reactions", title: "Live Emoji Reactions", desc: "Floating particles, 6 reactions.", category: "Collaboration", status: "shipped" },
  { id: "hand", title: "Raise Hand Queue", desc: "Ordered queue with toast notifications.", category: "Collaboration", status: "shipped" },
  { id: "polls", title: "Live Polls", desc: "Multi-choice, animated count-up.", category: "Collaboration", status: "shipped" },
  { id: "qa", title: "Q&A Mode", desc: "Audience submits, host approves.", category: "Collaboration", status: "shipped" },
  { id: "whiteboard", title: "Whiteboard (tldraw)", desc: "Free-form drawing, sticky notes, undo.", category: "Collaboration", status: "shipped" },
  { id: "notes", title: "Shared Notes", desc: "Markdown auto-save, real-time sync.", category: "Collaboration", status: "shipped" },
  { id: "breakouts", title: "Breakout Rooms", desc: "Pre-assign, move, return all.", category: "Collaboration", status: "shipped" },

  // Recording + AI
  { id: "recording-browser", title: "In-browser Recording", desc: "MediaRecorder-based local capture.", category: "Recording", status: "shipped" },
  { id: "recording-server", title: "Server-side Recording (Egress)", desc: "LiveKit Egress for MP4 + S3.", category: "Recording", status: "soon" },
  { id: "recording-playback", title: "Recording Playback", desc: "In-browser player with timeline.", category: "Recording", status: "beta" },
  { id: "captions", title: "Live Captions (Web Speech)", desc: "Browser SpeechRecognition overlay.", category: "Recording", status: "shipped" },
  { id: "transcript", title: "Server Transcripts", desc: "Whisper-based per-room transcripts.", category: "Recording", status: "soon" },
  { id: "ai-summary", title: "AI Meeting Summary", desc: "Extract action items, decisions, blockers.", category: "Recording", status: "beta" },

  // Schedule + Personal
  { id: "schedule", title: "Schedule Meetings", desc: "Create upcoming meetings with date/time.", category: "Productivity", status: "shipped" },
  { id: "recurring", title: "Recurring Meetings", desc: "Daily / weekly / monthly patterns.", category: "Productivity", status: "shipped" },
  { id: "ics", title: "ICS Calendar Export", desc: "Add to Google / Apple / Outlook.", category: "Productivity", status: "shipped" },
  { id: "personal-room", title: "Personal Room URL", desc: "Stable /u/[slug] short link.", category: "Productivity", status: "shipped" },
  { id: "embed", title: "Embed Widget", desc: "iframe for any website.", category: "Productivity", status: "shipped" },

  // Network + Customization
  { id: "low-bandwidth", title: "Low-bandwidth Mode", desc: "Auto audio-only on slow networks.", category: "Network", status: "shipped" },
  { id: "network-stats", title: "Network Stats", desc: "Bitrate, packet loss, jitter overlay.", category: "Network", status: "shipped" },
  { id: "themes", title: "Theme / Accent / Density", desc: "7 accent colors, 3 densities, light/dark.", category: "Customization", status: "shipped" },
  { id: "command-palette", title: "Command Palette (Cmd+K)", desc: "Quick actions across the app.", category: "Customization", status: "shipped" },
  { id: "shortcuts", title: "Keyboard Shortcuts", desc: "M, V, C, P, Q, N, R, W, S, ?.", category: "Customization", status: "shipped" },
  { id: "push-to-talk", title: "Push-to-Talk", desc: "Hold Space to unmute.", category: "Customization", status: "shipped" },

  // Account + Auth
  { id: "auth", title: "Email + Password Auth", desc: "bcryptjs + JWT in httpOnly cookies.", category: "Account", status: "shipped" },
  { id: "profile", title: "Profile + Personal Room", desc: "Avatar, personal link, QR code.", category: "Account", status: "shipped" },
  { id: "sso", title: "SSO + SAML (Enterprise)", desc: "OIDC/SAML for org logins.", category: "Account", status: "soon" },

  // Future
  { id: "breakout-timer", title: "Breakout Countdown", desc: "Auto-return when breakout timer ends.", category: "Collaboration", status: "soon" },
  { id: "noise-suppression", title: "Noise Suppression", desc: "rnnoise-based cleanup.", category: "Core", status: "soon" },
  { id: "translation", title: "Real-time Translation", desc: "Captions in 50+ languages.", category: "AI", status: "idea" },
  { id: "voice-agents", title: "Voice Agents", desc: "LiveKit Agents framework integration.", category: "AI", status: "idea" },
];

const STATUS_BADGES: Record<Status, { label: string; cls: string }> = {
  shipped: { label: "Shipped", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  beta: { label: "Beta", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  soon: { label: "Coming soon", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  idea: { label: "On roadmap", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

export default function RoadmapPage() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [cat, setCat] = useState<string>("All");

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
  }, []);

  const categories = ["All", ...Array.from(new Set(FEATURES.map((f) => f.category)))];

  const visible = FEATURES.filter((f) => {
    if (filter !== "all" && f.status !== filter) return false;
    if (cat !== "All" && f.category !== cat) return false;
    return true;
  });

  const counts = {
    shipped: FEATURES.filter((f) => f.status === "shipped").length,
    beta: FEATURES.filter((f) => f.status === "beta").length,
    soon: FEATURES.filter((f) => f.status === "soon").length,
    idea: FEATURES.filter((f) => f.status === "idea").length,
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)]">
      <div className="aurora-bg" />

      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            ← Back
          </Link>
          <h1 className="text-sm font-semibold">Roadmap</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <section className="animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
            <Icon.Rocket size={12} />
            Building in public
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            What we&apos;re shipping next.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--text-secondary)] leading-relaxed">
            Every feature in Indux Meet, with status. Updated as we ship.
            Vote on what we should build next in our Discord.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Shipped" to={counts.shipped} color="text-emerald-500" />
          <Stat label="Beta" to={counts.beta} color="text-amber-500" />
          <Stat label="Coming soon" to={counts.soon} color="text-sky-500" />
          <Stat label="On roadmap" to={counts.idea} color="text-violet-500" />
        </section>

        <section className="mt-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Status
            </span>
            {(["all", "shipped", "beta", "soon", "idea"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all " +
                  (filter === s
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                    : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]")
                }
              >
                {s === "all" ? "All" : STATUS_BADGES[s].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Category
            </span>
            {categories.map((c) => (
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

        <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <div
              key={f.id}
              className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5 transition-all hover:border-[color:var(--border-strong)] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                    STATUS_BADGES[f.status].cls
                  }
                >
                  {STATUS_BADGES[f.status].label}
                </span>
                <span className="rounded-full bg-[color:var(--bg-sunken)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-tertiary)]">
                  {f.category}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  to,
  color,
}: {
  label: string;
  to: number;
  color: string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const dur = 900;
    function tick(ts: number) {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      setN(Math.round((1 - Math.pow(1 - t, 3)) * to));
      if (t < 1) requestAnimationFrame(tick);
      else setN(to);
    }
    const r = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        requestAnimationFrame(tick);
        r.disconnect();
      }
    });
    const el = document.getElementById(`stat-${label}`);
    if (el) r.observe(el);
    return () => r.disconnect();
  }, [to, label]);

  return (
    <div
      id={`stat-${label}`}
      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5"
    >
      <div className={"text-3xl font-semibold tabular-nums " + color}>
        {n}
      </div>
      <div className="mt-1 text-xs font-medium text-[color:var(--text-secondary)]">
        {label}
      </div>
    </div>
  );
}