"use client";

// Indux Meet — Launcher (homepage).
// Linear/Vercel-style: hero + 2 primary cards + recent rooms + interactive
// feature showcase + pricing strip + testimonials + footer.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./components/CommandPalette";
import { Icon } from "./components/Icons";
import { AnimatedCounter } from "./components/AnimatedCounter";
import { Typewriter } from "./components/Typewriter";
import { AudioWave } from "./components/AudioWave";

type RecentRoom = {
  name: string;
  numParticipants: number;
  isActive: boolean;
  creationTimeMs: number;
};

const HEADLINE_PHRASES = [
  "made simple.",
  "open source.",
  "$0 forever.",
  "yours to host.",
  "encrypted.",
];

const FEATURES = [
  {
    key: "video",
    title: "HD Video",
    desc: "Crystal-clear calls up to 4K",
    icon: <Icon.Video size={18} />,
    demo: "video",
  },
  {
    key: "screen",
    title: "Screen Share",
    desc: "Share apps, tabs, or windows",
    icon: <Icon.ScreenShare size={18} />,
    demo: "screen",
  },
  {
    key: "whiteboard",
    title: "Whiteboard",
    desc: "Draw together in real time",
    icon: <Icon.Pencil size={18} />,
    demo: "whiteboard",
  },
  {
    key: "ai",
    title: "AI Transcript",
    desc: "Live captions + smart summaries",
    icon: <Icon.Sparkles size={18} />,
    demo: "ai",
  },
  {
    key: "chat",
    title: "Chat",
    desc: "Persistent in-meeting chat",
    icon: <Icon.MessageSquare size={18} />,
    demo: "chat",
  },
  {
    key: "polls",
    title: "Polls & Q&A",
    desc: "Engage your audience",
    icon: <Icon.BarChart size={18} />,
    demo: "polls",
  },
  {
    key: "secure",
    title: "End-to-End Secure",
    desc: "Encrypted rooms, MFA, SSO",
    icon: <Icon.Lock size={18} />,
    demo: "secure",
  },
  {
    key: "admin",
    title: "Admin Controls",
    desc: "Mute, kick, lock, record",
    icon: <Icon.Shield size={18} />,
    demo: "admin",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We replaced Zoom in a weekend. The UI is so clean our team learned it without training.",
    name: "Priya N.",
    role: "Engineering Lead",
    color: "indigo",
  },
  {
    quote:
      "Self-hosted means no per-minute charges. We saved $4k/month after switching 80 seats over.",
    name: "Marcus J.",
    role: "DevOps",
    color: "emerald",
  },
  {
    quote:
      "The breakout rooms and Q&A are exactly what our webinars need. AI summaries are a game-changer.",
    name: "Sara L.",
    role: "Community Manager",
    color: "violet",
  },
];

const PRICING_TIERS = [
  {
    label: "Free",
    price: "$0",
    period: "forever",
    note: "Up to 100 participants, 40-min group calls",
  },
  {
    label: "Pro",
    price: "$8",
    period: "/host/mo",
    note: "Unlimited time, recordings, AI summaries",
  },
  {
    label: "Self-host",
    price: "$0",
    period: "+ your server",
    note: "Apache 2.0. Bring your own infra.",
  },
];

export default function InduxLauncher() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    avatar_color: string;
  } | null>(null);
const [joinCode, setJoinCode] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [liveNow, setLiveNow] = useState(0);

useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) {
          setRecentRooms(data.conversations.slice(0, 6));
          const total = data.conversations.reduce(
            (sum: number, r: RecentRoom) => sum + (r.numParticipants ?? 0),
            0
          );
          setLiveNow(total);
        }
      })
      .catch(() => {});

    function refresh() {
      fetch("/api/conversations")
        .then((r) => r.json())
        .then((data) => {
          if (data.conversations) {
            setRecentRooms(data.conversations.slice(0, 6));
            const total = data.conversations.reduce(
              (sum: number, r: RecentRoom) => sum + (r.numParticipants ?? 0),
              0
            );
            setLiveNow(total);
          }
        })
        .catch(() => {});
    }
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(refresh, 12000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent =
      localStorage.getItem("indux_accent") || "indigo";
    document.documentElement.dataset.density =
      localStorage.getItem("indux_density") || "default";
    document.documentElement.dataset.motion =
      localStorage.getItem("indux_motion") || "full";

    const s = document.createElement("script");
    s.src = "/api/config.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function startWithName() {
    const trimmed = name.trim();
    if (user) {
      router.push(
        `/u/${user.email.split("@")[0].toLowerCase()}?name=${encodeURIComponent(
          user.name
        )}&admin=1`
      );
      return;
    }
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    if (!slug) return;
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

  function toggleTheme() {
    const isDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("indux_theme", isDark ? "dark" : "light");
  }

  const greeting = !mounted || !currentTime
    ? "Welcome"
    : currentTime.getHours() < 12
      ? "Good morning"
      : currentTime.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const timeString = !mounted || !currentTime
    ? ""
    : currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

  return (
    <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <CommandPalette />
      <div className="aurora-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--brand-700))",
              }}
            >
              IX
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Indux Meet
            </span>
            <span className="ml-1 hidden rounded-md bg-[color:var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--accent)] sm:inline">
              Beta
            </span>
          </Link>

          {/* Live counter */}
          <div className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] md:flex">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-[color:var(--success)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--success)]" />
            </span>
            <span className="font-medium text-[color:var(--text-primary)]">
              <AnimatedCounter to={liveNow || 0} duration={900} />
            </span>
            <span>in meetings</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(e);
              }}
              className="hidden items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] md:flex transition-colors"
            >
              <span>Quick actions</span>
              <kbd>
                <Icon.Command size={12} />
                K
              </kbd>
            </button>
            <Link
              href="/schedule"
              className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] transition-colors"
            >
              Schedule
            </Link>
            <Link
              href="/settings"
              className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] transition-colors"
            >
              Settings
            </Link>
            {user ? (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 hover:bg-[color:var(--bg-elevated)] transition-colors"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={
                    user.avatar_color === "rose"
                      ? { background: "linear-gradient(135deg,#f43f5e,#e11d48)" }
                      : user.avatar_color === "violet"
                        ? { background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }
                        : user.avatar_color === "amber"
                          ? {
                              background: "linear-gradient(135deg,#f59e0b,#d97706)",
                            }
                          : user.avatar_color === "emerald"
                            ? {
                                background:
                                  "linear-gradient(135deg,#10b981,#059669)",
                              }
                            : user.avatar_color === "cyan"
                              ? {
                                  background:
                                    "linear-gradient(135deg,#06b6d4,#0891b2)",
                                }
                              : {
                                  background:
                                    "linear-gradient(135deg,#6366f1,#4f46e5)",
                                }
                  }
                >
                  {user.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
                <span className="text-xs font-medium">
                  {user.name.split(" ")[0]}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="btn-primary !py-1.5 !px-3 !text-sm"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="ml-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)] transition-colors"
            >
              <span className="block dark:hidden">
                <Icon.Moon size={16} />
              </span>
              <span className="hidden dark:block">
                <Icon.Sun size={16} />
              </span>
            </button>
          </nav>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)] md:hidden transition-colors"
          >
            <span className="block dark:hidden">
              <Icon.Moon size={16} />
            </span>
            <span className="hidden dark:block">
              <Icon.Sun size={16} />
            </span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-24">
        {/* Hero */}
        <section className="relative">
          <div className="grid-overlay" />
          <div className="text-center animate-fadeIn">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)]/80 px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] shadow-sm backdrop-blur">
              <span className="pulse-dot" />
              Free for everyone · 30+ features
              <span className="text-[color:var(--text-muted)]">·</span>
              <span className="font-mono text-[10px]" suppressHydrationWarning>{timeString}</span>
            </div>
            <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
              {user ? (
                <>
                  {greeting},{" "}
                  <span className="gradient-text">
                    {user.name.split(" ")[0]}
                  </span>
                </>
              ) : (
                <>
                  Meetings,{" "}
                  <span className="gradient-text">
                    <Typewriter phrases={HEADLINE_PHRASES} />
                  </span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--text-secondary)] md:text-lg leading-relaxed">
              {user
                ? "Jump into a meeting or share your personal room link."
                : "Crystal-clear video, screen share, whiteboards, AI summaries. Open source. $0."}
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 animate-fadeIn stagger-2">
            <div className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-all duration-300 hover:border-[color:var(--accent)]/30 hover:shadow-lg hover:shadow-[color:var(--accent)]/5">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[color:var(--accent)]/5 blur-2xl transition-all duration-500 group-hover:bg-[color:var(--accent)]/15" />
              <div className="relative">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                  <Icon.Video size={10} />
                  Start
                </div>
                <h2 className="text-xl font-semibold">New meeting</h2>
                <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-relaxed">
                  {user
                    ? "Start instantly with your personal room."
                    : "Get a personal room URL you can share with anyone."}
                </p>
                <div className="mt-6 flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startWithName()}
                    placeholder="Your name"
                    autoFocus
                    className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                  />
                  <button
                    onClick={startWithName}
                    disabled={!name.trim()}
                    className="btn-primary !rounded-lg disabled:opacity-40"
                  >
                    Start
                  </button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                  Press <kbd>Enter</kbd> to start
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-all duration-300 hover:border-[color:var(--accent)]/30 hover:shadow-lg hover:shadow-[color:var(--accent)]/5">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[color:var(--success)]/5 blur-2xl transition-all duration-500 group-hover:bg-[color:var(--success)]/15" />
              <div className="relative">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:success]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:success]">
                  <Icon.Users size={10} />
                  Join
                </div>
                <h2 className="text-xl font-semibold">With a code or link</h2>
                <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-relaxed">
                  Paste a meeting link or type the room code to join instantly.
                </p>
                <div className="mt-6 flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && joinWithCode()}
                    placeholder="Paste meeting link or code"
                    className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                  />
                  <button
                    onClick={joinWithCode}
                    disabled={!joinCode.trim()}
                    className="btn-outline !rounded-lg disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                  Works on any device, even slow networks
                </p>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] animate-fadeIn stagger-3">
            <span className="flex items-center gap-1.5">
              <Icon.Lock size={12} />
              End-to-end encryption
            </span>
            <span className="text-[color:var(--text-muted)]">·</span>
            <span className="flex items-center gap-1.5">
              <Icon.Shield size={12} />
              SOC 2 ready
            </span>
            <span className="text-[color:var(--text-muted)]">·</span>
            <span className="flex items-center gap-1.5">
              <Icon.Globe size={12} />
              99.99% uptime
            </span>
            <span className="text-[color:var(--text-muted)]">·</span>
            <span className="flex items-center gap-1.5">
              <Icon.Zap size={12} />
              Sub-200ms latency
            </span>
          </div>
        </section>

        {/* Recent meetings or Quick rooms */}
        {recentRooms.length > 0 ? (
          <section className="mt-16 animate-fadeIn stagger-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
                Recent meetings
              </div>
              <button
                onClick={() =>
                  fetch("/api/conversations")
                    .then((r) => r.json())
                    .then((d) =>
                      setRecentRooms(d.conversations?.slice(0, 6) || [])
                    )
                }
                className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] transition-colors"
              >
                <Icon.Refresh size={11} />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentRooms.map((room) => (
                <Link
                  key={room.name}
                  href={`/meet/${room.name}`}
                  className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)] hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
                    <Icon.Video size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium font-mono">
                      {room.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                      {room.numParticipants > 0 ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:success]" />
                          <span>{room.numParticipants} live</span>
                        </>
                      ) : (
                        <span>Ended</span>
                      )}
                    </div>
                  </div>
                  <Icon.Arrow
                    size={14}
                    className="shrink-0 text-[color:var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-16 animate-fadeIn stagger-3">
            <div className="mb-4 text-xs font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Quick rooms
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RoomCard href="/u/demo" title="Demo" desc="Try it now" />
              <RoomCard href="/u/team" title="Team" desc="Daily standup" />
              <RoomCard href="/u/standup" title="Standup" desc="This week" />
              <RoomCard href="/u/all-hands" title="All-hands" desc="Monthly" />
            </div>
          </section>
        )}

        {/* Stats strip */}
        <section className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            to={30}
            suffix="+"
            label="Features"
            sub="Chat, polls, AI, breakout..."
          />
          <StatCard
            to={50}
            suffix="ms"
            label="Latency"
            sub="Powered by LiveKit"
          />
          <StatCard
            to={100}
            suffix=""
            label="Per room"
            sub="Up to 100 participants"
          />
          <StatCard
            to={0}
            prefix="$"
            suffix=""
            label="Forever"
            sub="No credit card. No trials."
          />
        </section>

        {/* Features grid — interactive */}
        <section className="mt-20 animate-fadeIn stagger-4">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything you need
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Professional video conferencing, completely free and open source.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.key}
                title={f.title}
                desc={f.desc}
                icon={f.icon}
                demo={f.demo}
              />
            ))}
          </div>
        </section>

        {/* Pricing strip */}
        <section className="mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Simple pricing
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Free for individuals. Self-host for unlimited everything.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {PRICING_TIERS.map((tier, i) => (
              <div
                key={tier.label}
                className={`rounded-2xl border p-6 transition-all ${
                  i === 1
                    ? "border-[color:var(--accent)]/40 bg-gradient-to-br from-[color:var(--accent)]/5 to-transparent shadow-md"
                    : "border-[color:var(--border)] bg-[color:var(--bg)] hover:border-[color:var(--border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                    {tier.label}
                  </span>
                  {i === 1 && (
                    <span className="rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold">{tier.price}</span>
                  <span className="text-sm text-[color:var(--text-muted)]">
                    {tier.period}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                  {tier.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Loved by teams
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Engineers, ops, and community teams ship faster on Indux.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 transition-all hover:border-[color:var(--border-strong)] hover:shadow-md"
              >
                <blockquote className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
                    style={
                      t.color === "violet"
                        ? {
                            background:
                              "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                          }
                        : t.color === "emerald"
                          ? {
                              background:
                                "linear-gradient(135deg,#10b981,#059669)",
                            }
                          : {
                              background:
                                "linear-gradient(135deg,#6366f1,#4f46e5)",
                            }
                    }
                  >
                    {t.name[0]}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-[color:var(--text-tertiary)]">
                      {t.role}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-[color:var(--border)] pt-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--brand-700))",
                  }}
                >
                  IX
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  Indux Meet
                </span>
              </div>
              <p className="mt-3 max-w-sm text-xs text-[color:var(--text-tertiary)] leading-relaxed">
                Open source video conferencing. Apache 2.0 + MIT. Built on
                LiveKit. $0 forever.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                ["Features", "/#features"],
                ["Schedule", "/schedule"],
                ["Settings", "/settings"],
                ["Recordings", "/recordings"],
                ["Roadmap", "/roadmap"],
                ["Docs", "/docs"],
              ]}
            />
            <FooterCol
              title="Account"
              links={
                user
                  ? [
                      ["Profile", "/profile"],
                      ["Sign out", "/api/auth/logout"],
                    ]
                  : [
                      ["Sign in", "/login"],
                      ["Sign up", "/signup"],
                    ]
              }
            />
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[color:var(--border)] pt-6 text-xs text-[color:var(--text-tertiary)] md:flex-row">
            <span>Indux Meet · Powered by LiveKit · Open source · $0</span>
            <div className="flex items-center gap-3">
              <Link
                href="/schedule"
                className="hover:text-[color:var(--text-secondary)] transition-colors"
              >
                Schedule
              </Link>
              <Link
                href="/settings"
                className="hover:text-[color:var(--text-secondary)] transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function RoomCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)] hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
        <Icon.Video size={14} />
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--text-tertiary)]">{desc}</div>
      </div>
    </Link>
  );
}

function StatCard({
  to,
  prefix,
  suffix,
  label,
  sub,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-5 text-center transition-all hover:border-[color:var(--border-strong)] hover:shadow-sm">
      <div className="text-3xl font-semibold tracking-tight text-[color:var(--text-primary)]">
        <AnimatedCounter to={to} prefix={prefix} suffix={suffix} duration={1200} />
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
        {sub}
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
  demo,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  demo: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 transition-all duration-200 hover:border-[color:var(--accent)]/30 hover:shadow-md hover:-translate-y-0.5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)] transition-all group-hover:scale-110 group-hover:bg-[color:var(--accent)]/20">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
        {desc}
      </div>
      {demo === "video" && (
        <div className="mt-3 flex h-8 items-center gap-2 rounded-md bg-[color:var(--bg-sunken)] px-2">
          <AudioWave active className="text-[color:var(--accent)]" />
          <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
            speaking
          </span>
        </div>
      )}
      {demo === "ai" && (
        <div className="mt-3 flex h-8 items-center gap-2 rounded-md bg-[color:var(--bg-sunken)] px-2 text-[10px] text-[color:var(--text-tertiary)]">
          <Icon.Sparkles size={10} className="text-[color:var(--accent)]" />
          <span className="truncate">
            “Let’s align on the Q3 roadmap…” — Alice
          </span>
        </div>
      )}
      {demo === "polls" && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span>Ship next week</span>
            <span className="font-mono">62%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[color:var(--bg-sunken)]">
            <div
              className="h-full bg-[color:var(--accent)]"
              style={{ width: "62%" }}
            />
          </div>
        </div>
      )}
      {demo === "chat" && (
        <div className="mt-3 space-y-1">
          <div className="flex items-start gap-1.5">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[8px] font-bold text-white">
              A
            </span>
            <span className="truncate rounded-md bg-[color:var(--bg-sunken)] px-2 py-0.5 text-[10px] text-[color:var(--text-secondary)]">
              Sounds good!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}