"use client";

// Schedule page — month-view calendar with click-to-create modal,
// upcoming list, recurring patterns, .ics export.

import { useEffect, useMemo, useState } from "react";
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
  const [list, setList] = useState<Scheduled[]>([]);
  const [host, setHost] = useState("admin@indux.com");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStart, setComposerStart] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // form fields
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(60);
  const [recurring, setRecurring] = useState<"none" | "daily" | "weekly" | "monthly">("none");

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";
  }, []);

  async function refresh() {
    const r = await fetch(`/api/schedule?host=${encodeURIComponent(host)}`);
    const data = await r.json();
    setList(data.scheduled ?? []);
  }

  useEffect(() => { refresh(); }, [host]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = new Date(viewMonth);
    const firstDay = monthStart.getDay();
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    ).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      cells.push({ date: dt, key: `d-${d}` });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `tail-${cells.length}` });
    return cells;
  }, [viewMonth]);

  const monthName = new Date(viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group meetings by day for the current view
  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Scheduled[]>();
    for (const m of list) {
      const d = new Date(m.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [list]);

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function openComposer(d: Date | null) {
    if (!d) return;
    const dt = new Date(d);
    dt.setHours(10, 0, 0, 0);
    setStartsAt(dt.toISOString().slice(0, 16));
    setComposerStart(dt.getTime());
    setComposerOpen(true);
  }

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
      setComposerOpen(false);
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
      <div className="aurora-bg" />

      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">
            <Icon.Arrow size={14} /> Back
          </Link>
          <h1 className="text-sm font-semibold">Schedule</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Title row */}
        <section className="animate-fadeIn flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
              <Icon.Calendar size={12} />
              Calendar
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Plan a meeting.
            </h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Click any day to add a meeting, or use the form to schedule one.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="host@example.com"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Calendar */}
          <section className="animate-fadeIn stagger-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth).setMonth(new Date(viewMonth).getMonth() - 1)
                  )
                }
                className="rounded-md p-1.5 text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
                title="Previous month"
              >
                <Icon.ChevronDown size={16} className="rotate-90" />
              </button>
              <h2 className="text-base font-semibold">{monthName}</h2>
              <button
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth).setMonth(new Date(viewMonth).getMonth() + 1)
                  )
                }
                className="rounded-md p-1.5 text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
                title="Next month"
              >
                <Icon.ChevronDown size={16} className="-rotate-90" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {DAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, key }) => {
                if (!date) return <div key={key} className="aspect-square" />;
                const isToday = date.getTime() === today.getTime();
                const k = dayKey(date);
                const dayMeetings = meetingsByDay.get(k) ?? [];
                return (
                  <button
                    key={key}
                    onClick={() => openComposer(date)}
                    className={
                      "relative flex aspect-square flex-col items-start rounded-lg border p-1.5 text-left transition-all " +
                      (isToday
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 ring-1 ring-[color:var(--accent)]/20"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elevated)]")
                    }
                  >
                    <span
                      className={
                        "text-[10px] font-semibold " +
                        (isToday
                          ? "text-[color:var(--accent)]"
                          : "text-[color:var(--text-secondary)]")
                      }
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-0.5 flex w-full flex-col gap-0.5 overflow-hidden">
                      {dayMeetings.slice(0, 2).map((m) => (
                        <div
                          key={m.id}
                          className={
                            "truncate rounded px-1 py-0.5 text-[9px] font-medium " +
                            (m.recurring !== "none"
                              ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
                              : "bg-[color:var(--bg-sunken)] text-[color:var(--text-secondary)]")
                          }
                          title={m.title}
                        >
                          {m.title}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-[9px] text-[color:var(--text-muted)]">
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Upcoming list */}
          <section className="animate-fadeIn stagger-2">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Upcoming for {host}
            </h2>
            <div className="space-y-2">
              {list.length === 0 && (
                <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg)] p-8 text-center">
                  <Icon.Calendar size={24} className="mx-auto mb-2 text-[color:var(--text-muted)]" />
                  <p className="text-sm text-[color:var(--text-secondary)]">No meetings scheduled yet.</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">Click any day on the calendar to start.</p>
                </div>
              )}
              {list.slice(0, 12).map((m) => {
                const isPast = m.starts_at + m.duration_min * 60000 < now;
                const timeDiff = m.starts_at - now;
                const isSoon = timeDiff > 0 && timeDiff < 30 * 60 * 1000;
                return (
                  <div
                    key={m.id}
                    className={
                      "group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 " +
                      (isPast
                        ? "border-[color:var(--border)] bg-[color:var(--bg-elevated)] opacity-60"
                        : "border-[color:var(--border)] bg-[color:var(--bg)] hover:border-[color:var(--accent)]/20 hover:shadow-sm")
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors " +
                        (isPast ? "bg-[color:var(--bg-sunken)] text-[color:var(--text-muted)]" :
                         isSoon ? "bg-amber-500/15 text-amber-500" :
                         "bg-[color:var(--accent)]/10 text-[color:var(--accent)]")
                      }>
                        <Icon.Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                          <span>{new Date(m.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <span>·</span>
                          <span>{m.duration_min}m</span>
                          {m.recurring !== "none" && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{m.recurring}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/api/calendar/${m.id}.ics`}
                        className="rounded-md p-1.5 text-[color:var(--text-muted)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
                        title="Download .ics"
                      >
                        <Icon.Calendar size={12} />
                      </a>
                      <a
                        href={`/meet/${m.room}`}
                        className="rounded-md bg-[color:var(--accent)] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[color:var(--accent)]/90"
                      >
                        Join
                      </a>
                      <button
                        onClick={() => cancel(m.id)}
                        className="rounded-md p-1.5 text-[color:var(--text-muted)] hover:bg-red-500/10 hover:text-red-500"
                        title="Cancel"
                      >
                        <Icon.Close size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Composer modal */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur animate-fadeIn" onClick={() => setComposerOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[28rem] max-w-[94vw] rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 shadow-2xl animate-scaleIn"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">New meeting</h2>
                <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                  {composerStart
                    ? new Date(composerStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : "Set up a meeting for later"}
                </p>
              </div>
              <button onClick={() => setComposerOpen(false)} className="rounded p-1.5 text-[color:var(--text-muted)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]">
                <Icon.Close size={14} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Title</span>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Q3 product review"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Start</span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Duration (min)</span>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">Recurring</span>
                <div className="flex gap-1 rounded-lg bg-[color:var(--bg-sunken)] p-1">
                  {(["none", "daily", "weekly", "monthly"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRecurring(r)}
                      className={
                        "flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition-all " +
                        (recurring === r
                          ? "bg-[color:var(--bg)] text-[color:var(--text-primary)] shadow-sm"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]")
                      }
                    >
                      {r === "none" ? "Once" : r}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-[color:var(--text-muted)]">
                Will be created as {host}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setComposerOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]">
                  Cancel
                </button>
                <button
                  onClick={create}
                  disabled={busy || !title}
                  className="rounded-lg bg-[color:var(--accent)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[color:var(--accent)]/90 disabled:opacity-40"
                >
                  {busy ? "Scheduling…" : "Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}