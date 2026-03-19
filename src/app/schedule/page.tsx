"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../components/Icons";

type Scheduled = {
  id: string;
  room: string;
  title: string;
  host: string;
  starts_at: number;
  duration_min: number;
  recurring: "none" | "daily" | "weekly" | "monthly";
};

export default function SchedulePage() {
  const router = useRouter();
  const [list, setList] = useState<Scheduled[]>([]);
  const [host, setHost] = useState("admin@indux.com");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(60);
  const [recurring, setRecurring] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await fetch(`/api/schedule?host=${encodeURIComponent(host)}`);
    const data = await r.json();
    setList(data.scheduled ?? []);
  }

  useEffect(() => { refresh(); }, [host]);

  async function create() {
    if (!title) return;
    setBusy(true);
    const r = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        host,
        starts_at: new Date(startsAt).getTime(),
        duration_min: duration,
        recurring,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setTitle("");
      refresh();
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this meeting?")) return;
    await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
    refresh();
  }

  const now = Date.now();

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">
            <Icon.Arrow size={14} />
            Back
          </Link>
          <h1 className="text-sm font-semibold">Schedule a meeting</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div className="animate-fadeIn">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
                <Icon.Calendar size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">New meeting</h2>
                <p className="text-xs text-[color:var(--text-secondary)]">Set up a meeting for later</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Q3 product review"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Start time</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Duration (min)</span>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={5}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Recurring</span>
                <select
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value as "none" | "daily" | "weekly" | "monthly")}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                >
                  <option value="none">One time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Host email</span>
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                />
              </label>
            </div>

            <button
              onClick={create}
              disabled={busy || !title}
              className="btn-primary mt-5 w-full disabled:opacity-40"
            >
              {busy ? "Scheduling..." : "Schedule meeting"}
            </button>
          </div>
        </div>

        <div className="animate-fadeIn stagger-1">
          <h2 className="mb-3 text-sm font-medium">Upcoming for {host}</h2>
          <div className="space-y-2">
            {list.length === 0 && (
              <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 text-center">
                <Icon.Calendar size={24} className="mx-auto mb-2 text-[color:var(--text-muted)]" />
                <p className="text-sm text-[color:var(--text-secondary)]">No meetings scheduled yet.</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">Create one above to get started.</p>
              </div>
            )}
            {list.map((m) => {
              const isPast = m.starts_at + m.duration_min * 60000 < now;
              const timeDiff = m.starts_at - now;
              const isSoon = timeDiff > 0 && timeDiff < 30 * 60 * 1000;
              return (
                <div
                  key={m.id}
                  className="group flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3 transition-all duration-200 hover:border-[color:var(--accent)]/20 hover:bg-[color:var(--bg-elevated)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isPast ? "bg-[color:var(--bg-sunken)] text-[color:var(--text-muted)]" :
                      isSoon ? "bg-[color:warning]/10 text-[color:warning]" :
                      "bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                    }`}>
                      <Icon.Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                        <span>{new Date(m.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>·</span>
                        <span>{m.duration_min} min</span>
                        {m.recurring !== "none" && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{m.recurring}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`/api/calendar/${m.id}.ics`}
                      className="btn-ghost !px-2 !py-1 !text-[11px] !gap-1"
                      title="Download .ics"
                    >
                      <Icon.Calendar size={12} />
                      .ics
                    </a>
                    <a
                      href={`/meet/${m.room}`}
                      className="btn-primary !px-3 !py-1 !text-[11px] !rounded-md"
                    >
                      Join
                    </a>
                    <button
                      onClick={() => cancel(m.id)}
                      className="btn-ghost !px-2 !py-1 !text-[11px] !text-[color:danger] hover:!bg-[color:danger]/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
