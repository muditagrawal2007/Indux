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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}
            >
              IX
            </div>
            <span className="text-sm font-semibold">Indux Meet</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-16 pb-16">
        <div className="flex items-start gap-6">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl text-3xl font-semibold text-white"
            style={{ background: grad }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="mt-1 text-sm text-white/60">{user.email}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <Icon.ShieldCheck size={12} />
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            <Icon.Logout size={14} />
            Sign out
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#15151b] p-6">
          <h2 className="text-base font-semibold">Your personal room</h2>
          <p className="mt-1 text-sm text-white/60">
            Share this link. Anyone with it can join your meeting.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a0a0f] px-3 py-2">
            <Icon.Link size={14} className="text-white/40" />
            <code className="flex-1 truncate font-mono text-sm text-white/80">{personalRoomLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.origin + personalRoomLink)}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
            >
              <Icon.Copy size={12} />
              Copy
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
