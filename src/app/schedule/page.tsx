"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            ← Back
          </button>
          <h1 className="text-sm font-semibold">Schedule a meeting</h1>
          <div className="w-12" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-gray-200 bg-white/80 p-6 dark:border-gray-800 dark:bg-gray-900/60">
          <h2 className="text-lg font-semibold">New meeting</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q3 product review"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Start time</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Duration (min)</span>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={5}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Recurring</span>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as "none" | "daily" | "weekly" | "monthly")}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="none">One time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Host email</span>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
          </div>
          <button
            onClick={create}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Schedule
          </button>
        </div>

        <h2 className="mt-10 text-sm font-medium">Upcoming for {host}</h2>
        <ul className="mt-3 space-y-2">
          {list.length === 0 && (
            <li className="text-xs text-gray-500 dark:text-gray-400">No meetings scheduled.</li>
          )}
          {list.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/60"
            >
              <div>
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(m.starts_at).toLocaleString()} · {m.duration_min} min · {m.recurring}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/calendar/${m.id}.ics`}
                  className="rounded border border-gray-300 px-2 py-1 text-[11px] hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  .ics
                </a>
                <a
                  href={`/meet/${m.room}`}
                  className="rounded bg-gray-900 px-2 py-1 text-[11px] text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                >
                  Join
                </a>
                <button
                  onClick={() => cancel(m.id)}
                  className="rounded border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}