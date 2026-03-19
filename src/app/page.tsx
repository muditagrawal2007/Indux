"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./components/CommandPalette";
import { Icon } from "./components/Icons";

type RecentRoom = {
  name: string;
  numParticipants: number;
  isActive: boolean;
  creationTimeMs: number;
};

export default function InduxLauncher() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [user, setUser] = useState<{ id: string; email: string; name: string; avatar_color: string } | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

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
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
    document.documentElement.dataset.density = localStorage.getItem("indux_density") || "default";
    document.documentElement.dataset.motion = localStorage.getItem("indux_motion") || "full";

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
      router.push(`/u/${user.email.split("@")[0].toLowerCase()}?name=${encodeURIComponent(user.name)}&admin=1`);
      return;
    }
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

  const greeting = currentTime.getHours() < 12 ? "Good morning" : currentTime.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <CommandPalette />
      <div className="aurora-bg" />

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
              className="hidden items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] md:flex transition-colors"
            >
              <span>Quick actions</span>
              <kbd><Icon.Command size={12} /></kbd>
            </button>
            <Link href="/schedule" className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] transition-colors">
              Schedule
            </Link>
            <Link href="/settings" className="rounded-md px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] transition-colors">
              Settings
            </Link>
            {user ? (
              <Link href="/profile" className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1 hover:bg-[color:var(--bg-elevated)] transition-colors">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: user.avatar_color === "rose" ? "linear-gradient(135deg,#f43f5e,#e11d48)" :
                    user.avatar_color === "violet" ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" :
                    user.avatar_color === "amber" ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                    user.avatar_color === "emerald" ? "linear-gradient(135deg,#10b981,#059669)" :
                    user.avatar_color === "cyan" ? "linear-gradient(135deg,#06b6d4,#0891b2)" :
                    "linear-gradient(135deg,#6366f1,#4f46e5)" }}
                >
                  {user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
                </span>
                <span className="text-xs font-medium">{user.name.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link href="/login" className="btn-primary !py-1.5 !px-3 !text-sm">
                Sign in
              </Link>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="ml-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)] transition-colors"
            >
              <span className="block dark:hidden"><Icon.Moon size={16} /></span>
              <span className="hidden dark:block"><Icon.Sun size={16} /></span>
            </button>
          </nav>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] p-1.5 hover:bg-[color:var(--bg-elevated)] md:hidden transition-colors"
          >
            <span className="block dark:hidden"><Icon.Moon size={16} /></span>
            <span className="hidden dark:block"><Icon.Sun size={16} /></span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-24">
        {/* Hero */}
        <div className="text-center animate-fadeIn">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] shadow-sm">
            <span className="pulse-dot" />
            Free for everyone · 30+ features
          </div>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            {user ? (
              <>{greeting}, <span className="gradient-text">{user.name.split(" ")[0]}</span></>
            ) : (
              <>Meetings, <span className="gradient-text">made simple.</span></>
            )}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--text-secondary)] md:text-lg leading-relaxed">
            {user
              ? "Jump into a meeting or share your personal room link."
              : "Crystal-clear video, screen share, whiteboards, AI summaries. Open source. $0."
            }
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 animate-fadeIn stagger-2">
          {/* Start a meeting */}
          <div className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-all duration-300 hover:border-[color:var(--accent)]/30 hover:shadow-lg hover:shadow-[color:var(--accent)]/5">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
              <Icon.Video size={10} />
              Start
            </div>
            <h2 className="text-xl font-semibold">New meeting</h2>
            <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-relaxed">
              {user
                ? "Start instantly with your personal room."
                : "Get a personal room URL you can share with anyone."
              }
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
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Press <kbd>Enter</kbd> to start
            </p>
          </div>

          {/* Join a meeting */}
          <div className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-8 transition-all duration-300 hover:border-[color:var(--accent)]/30 hover:shadow-lg hover:shadow-[color:var(--accent)]/5">
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
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Works on any device, even slow networks
            </p>
          </div>
        </div>

        {/* Recent meetings or Quick rooms */}
        {recentRooms.length > 0 ? (
          <div className="mt-12 animate-fadeIn stagger-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
                Recent meetings
              </div>
              <button
                onClick={() => fetch("/api/conversations").then(r => r.json()).then(d => setRecentRooms(d.conversations?.slice(0, 6) || []))}
                className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] transition-colors"
              >
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
                    <div className="truncate text-sm font-medium">{room.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                      {room.isActive ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:success]" />
                          <span>{room.numParticipants} in room</span>
                        </>
                      ) : (
                        <span>Active now</span>
                      )}
                    </div>
                  </div>
                  <Icon.Arrow size={14} className="shrink-0 text-[color:var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 animate-fadeIn stagger-3">
            <div className="mb-4 text-xs font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Quick rooms
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RoomCard href="/u/demo" title="Demo" desc="Try it now" icon="video" />
              <RoomCard href="/u/team" title="Team" desc="Daily standup" icon="users" />
              <RoomCard href="/u/standup" title="Standup" desc="This week" icon="clock" />
              <RoomCard href="/u/all-hands" title="All-hands" desc="Monthly" icon="globe" />
            </div>
          </div>
        )}

        {/* Features grid */}
        <div className="mt-20 animate-fadeIn stagger-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Everything you need</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Professional video conferencing, completely free and open source.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Feature icon={<Icon.Video size={18} />} title="HD Video" desc="Crystal-clear calls" />
            <Feature icon={<Icon.Share size={18} />} title="Screen Share" desc="Present anything" />
            <Feature icon={<Icon.Pencil size={18} />} title="Whiteboard" desc="Draw together" />
            <Feature icon={<Icon.FileText size={18} />} title="AI Transcript" desc="Live captions" />
            <Feature icon={<Icon.MessageSquare size={18} />} title="Chat" desc="In-meeting chat" />
            <Feature icon={<Icon.BarChart size={18} />} title="Polls & Q&A" desc="Engage your team" />
            <Feature icon={<Icon.Lock size={18} />} title="Secure" desc="Encrypted rooms" />
            <Feature icon={<Icon.Settings size={18} />} title="Admin Controls" desc="Full control" />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 border-t border-[color:var(--border)] pt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-[color:var(--text-tertiary)]">
            <div
              className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
            >
              IX
            </div>
            <span>Indux Meet · Powered by LiveKit · Open source · $0</span>
          </div>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Made for everyone · <Link href="/schedule" className="hover:text-[color:var(--text-secondary)] transition-colors">Schedule</Link> · <Link href="/settings" className="hover:text-[color:var(--text-secondary)] transition-colors">Settings</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function RoomCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    video: <Icon.Video size={14} />,
    users: <Icon.Users size={14} />,
    clock: <Icon.Clock size={14} />,
    globe: <Icon.Globe size={14} />,
  };
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)] hover:shadow-sm"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
        {icon ? iconMap[icon] || <Icon.Video size={14} /> : <Icon.Video size={14} />}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--text-tertiary)]">{desc}</div>
      </div>
    </Link>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-[color:var(--text-tertiary)]">{desc}</div>
    </div>
  );
}
