"use client";

// Profile page with avatar picker, personal room link, QR code,
// meeting history.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Icon } from "../components/Icons";

type User = {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
  created_at: number;
};

type Meeting = {
  room: string;
  numParticipants: number;
  isActive: boolean;
  creationTimeMs: number;
};

const COLORS: { id: string; label: string; preview: string }[] = [
  { id: "indigo", label: "Indigo", preview: "linear-gradient(135deg,#6366f1,#4f46e5)" },
  { id: "violet", label: "Violet", preview: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
  { id: "rose", label: "Rose", preview: "linear-gradient(135deg,#f43f5e,#e11d48)" },
  { id: "amber", label: "Amber", preview: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "emerald", label: "Emerald", preview: "linear-gradient(135deg,#10b981,#059669)" },
  { id: "cyan", label: "Cyan", preview: "linear-gradient(135deg,#06b6d4,#0891b2)" },
  { id: "sky", label: "Sky", preview: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
  { id: "teal", label: "Teal", preview: "linear-gradient(135deg,#14b8a6,#0d9488)" },
  { id: "lime", label: "Lime", preview: "linear-gradient(135deg,#84cc16,#65a30d)" },
  { id: "orange", label: "Orange", preview: "linear-gradient(135deg,#f97316,#ea580c)" },
  { id: "pink", label: "Pink", preview: "linear-gradient(135deg,#ec4899,#db2777)" },
  { id: "slate", label: "Slate", preview: "linear-gradient(135deg,#475569,#334155)" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [savingColor, setSavingColor] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.push("/login");
      })
      .finally(() => setLoading(false));

    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => setRecentMeetings((data.conversations ?? []).slice(0, 6)))
      .catch(() => {});
  }, [router]);

  // QR code for personal room
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const slug = user.email.split("@")[0].toLowerCase();
    const url = `${window.location.origin}/u/${slug}`;
    QRCode.toString(url, { type: "svg", margin: 1, width: 144 })
      .then((svg) => { if (!cancelled) setQrSvg(svg); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function changeColor(color: string) {
    if (!user) return;
    setSavingColor(true);
    // Optimistic UI
    setUser({ ...user, avatar_color: color });
    try {
      await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
    } catch {}
    setSavingColor(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)]">
        <div className="h-2 w-32 overflow-hidden rounded-full bg-[color:var(--bg-sunken)]">
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  const slug = user.email.split("@")[0].toLowerCase();
  const personalRoomLink = `/u/${slug}`;
  const personalUrl = typeof window !== "undefined" ? `${window.location.origin}${personalRoomLink}` : personalRoomLink;

  const currentGrad =
    COLORS.find((c) => c.id === user.avatar_color)?.preview ||
    "linear-gradient(135deg,#6366f1,#4f46e5)";

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <div className="aurora-bg" />

      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">
            <Icon.Arrow size={14} /> Back
          </Link>
          <h1 className="text-sm font-semibold">Profile</h1>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
          >
            <Icon.Logout size={12} /> Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-16">
        {/* Header */}
        <section className="animate-fadeIn flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <div
              className="grid h-24 w-24 place-items-center rounded-2xl text-3xl font-semibold text-white shadow-xl ring-4 ring-[color:var(--bg)]"
              style={{ background: currentGrad }}
            >
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[color:var(--bg)] shadow-md">
              <Icon.Sparkles size={12} className="text-[color:var(--accent)]" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{user.email}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
              <Icon.ShieldCheck size={12} />
              <span suppressHydrationWarning>Joined {new Date(user.created_at).toLocaleDateString("en-US")}</span>
            </div>
          </div>
        </section>

        {/* Avatar picker + QR */}
        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Color picker */}
          <div className="animate-fadeIn stagger-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
                <Icon.Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Avatar color</h2>
                <p className="text-xs text-[color:var(--text-secondary)]">Pick a gradient that feels like you.</p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {COLORS.map((c) => {
                const selected = user.avatar_color === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => changeColor(c.id)}
                    disabled={savingColor}
                    className={
                      "group relative h-10 rounded-lg transition-all " +
                      (selected
                        ? "ring-2 ring-[color:var(--accent)] ring-offset-2 ring-offset-[color:var(--bg)] scale-105"
                        : "hover:scale-105 ring-1 ring-[color:var(--border)]")
                    }
                    style={{ background: c.preview }}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {selected && (
                      <Icon.Check
                        size={14}
                        className="absolute inset-0 m-auto text-white drop-shadow"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-[color:var(--text-muted)]">
              {savingColor ? "Saving…" : "Saved automatically"}
            </p>
          </div>

          {/* QR code + personal room */}
          <div className="animate-fadeIn stagger-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
                <Icon.Video size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Your personal room</h2>
                <p className="text-xs text-[color:var(--text-secondary)]">Share this link. Anyone with it can join.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2.5">
                  <Icon.Link size={14} className="shrink-0 text-[color:var(--text-muted)]" />
                  <code className="flex-1 truncate font-mono text-sm">{personalRoomLink}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(personalUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="btn-ghost !px-2.5 !py-1 !text-xs flex items-center gap-1.5"
                  >
                    {copied ? <><Icon.Check size={12} /> Copied</> : <><Icon.Copy size={12} /> Copy</>}
                  </button>
                </div>
                <Link
                  href={personalRoomLink}
                  className="btn-primary !w-full !py-2 !text-sm flex items-center justify-center gap-2"
                >
                  <Icon.Video size={14} /> Open room
                </Link>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-white p-2.5">
                {qrSvg ? (
                  <div
                    className="h-36 w-36 [&_svg]:h-36 [&_svg]:w-36"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="h-36 w-36 animate-pulse rounded bg-gray-200" />
                )}
              </div>
            </div>
            <p className="mt-3 text-[10px] text-[color:var(--text-muted)]">
              Scan to join from a phone. The link is permanent and tied to your account.
            </p>
          </div>
        </section>

        {/* Recent meetings */}
        <section className="mt-8 animate-fadeIn stagger-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Recent meetings
            </h2>
            <Link
              href="/"
              className="text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            >
              Join or create new →
            </Link>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] divide-y divide-[color:var(--border)] overflow-hidden">
            {recentMeetings.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-[color:var(--text-muted)]">
                No meetings yet. Start your first from the launcher.
              </div>
            )}
            {recentMeetings.map((m) => {
              const ago = humanizeAgo(Date.now() - m.creationTimeMs);
              return (
                <Link
                  key={m.room}
                  href={`/meet/${m.room}`}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[color:var(--bg-elevated)]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
                    <Icon.Video size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-medium truncate">/{m.room}</div>
                    <div className="text-xs text-[color:var(--text-muted)]">
                      {m.isActive ? "Active now" : ago}
                    </div>
                  </div>
                  {m.numParticipants > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                      <span className="relative inline-flex h-1.5 w-1.5">
                        <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span>{m.numParticipants} live</span>
                    </div>
                  ) : (
                    <Icon.Arrow size={14} className="text-[color:var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-8 animate-fadeIn stagger-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickLink href="/settings" icon={<Icon.Settings size={16} />} title="Appearance" desc="Theme, accent, density" />
          <QuickLink href="/schedule" icon={<Icon.Calendar size={16} />} title="Schedule" desc="Plan meetings" />
          <QuickLink href="/roadmap" icon={<Icon.Rocket size={16} />} title="Roadmap" desc="What's next" />
          <QuickLink href="/docs" icon={<Icon.FileText size={16} />} title="Docs" desc="How-tos" />
        </section>
      </main>
    </div>
  );
}

function humanizeAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(Date.now() - ms).toLocaleDateString("en-US");
}

function QuickLink({
  href, icon, title, desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)] hover:shadow-sm"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--text-tertiary)]">{desc}</div>
      </div>
    </Link>
  );
}