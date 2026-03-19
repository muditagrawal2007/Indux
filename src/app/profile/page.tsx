"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../components/Icons";

type User = {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
  created_at: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
  const personalRoomLink = `/u/${user.email.split("@")[0].toLowerCase()}`;

  const grad = {
    indigo: "linear-gradient(135deg, #6366f1, #4f46e5)",
    violet: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    rose: "linear-gradient(135deg, #f43f5e, #e11d48)",
    amber: "linear-gradient(135deg, #f59e0b, #d97706)",
    emerald: "linear-gradient(135deg, #10b981, #059669)",
    cyan: "linear-gradient(135deg, #06b6d4, #0891b2)",
  }[user.avatar_color] || "linear-gradient(135deg, #6366f1, #4f46e5)";

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">
            <Icon.Arrow size={14} />
            Back
          </Link>
          <h1 className="text-sm font-semibold">Profile</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-12 pb-16 space-y-6">
        {/* Profile header */}
        <div className="animate-fadeIn flex items-start gap-6">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl text-3xl font-semibold text-white shadow-lg"
            style={{ background: grad }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{user.email}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
              <Icon.ShieldCheck size={12} />
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-outline flex items-center gap-2"
          >
            <Icon.Logout size={14} />
            Sign out
          </button>
        </div>

        {/* Personal room */}
        <div className="animate-fadeIn stagger-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
              <Icon.Video size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Your personal room</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Share this link. Anyone with it can join your meeting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2.5">
            <Icon.Link size={14} className="shrink-0 text-[color:var(--text-muted)]" />
            <code className="flex-1 truncate font-mono text-sm text-[color:var(--text-primary)]">{personalRoomLink}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + personalRoomLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="btn-ghost !px-2.5 !py-1 !text-xs flex items-center gap-1.5"
            >
              {copied ? <><Icon.Check size={12} /> Copied</> : <><Icon.Copy size={12} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="animate-fadeIn stagger-2 grid grid-cols-2 gap-3">
          <Link
            href="/settings"
            className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
              <Icon.Settings size={16} />
            </div>
            <div>
              <div className="text-sm font-medium">Appearance</div>
              <div className="text-xs text-[color:var(--text-tertiary)]">Theme, accent, density</div>
            </div>
          </Link>
          <Link
            href="/schedule"
            className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--bg-sunken)] text-[color:var(--text-tertiary)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)] transition-colors">
              <Icon.Calendar size={16} />
            </div>
            <div>
              <div className="text-sm font-medium">Schedule</div>
              <div className="text-xs text-[color:var(--text-tertiary)]">Plan meetings</div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
