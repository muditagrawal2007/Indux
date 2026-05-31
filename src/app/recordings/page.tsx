"use client";

// Recordings library — list all recordings with playback and download.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icons";

type Recording = {
  id: string;
  room: string;
  started_by: string;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  file_size: number | null;
  status: string;
};

export default function RecordingsPage() {
  const [list, setList] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<Recording | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem("indux_theme");
    const isDark = stored === "dark" || (stored !== "light" && mql.matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.accent = localStorage.getItem("indux_accent") || "indigo";

    fetch("/api/recordings/all")
      .then((r) => r.json())
      .then((data) => {
        setList(data.recordings ?? []);
        if ((data.recordings ?? []).length > 0) setActive(data.recordings[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      r.room.toLowerCase().includes(q) ||
      r.started_by.toLowerCase().includes(q)
    );
  }, [list, filter]);

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-200">
      <div className="aurora-bg" />

      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">
            <Icon.Arrow size={14} /> Back
          </Link>
          <h1 className="text-sm font-semibold">Recordings</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <section className="animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
            <Icon.Record size={12} />
            Library
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">All recordings.</h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--text-secondary)]">
            Every meeting that was recorded in Indux. Play in browser or download as .webm.
          </p>
        </section>

        {/* Search + count */}
        <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Icon.Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by room or host…"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] py-2.5 pl-10 pr-4 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
            />
          </div>
          <div className="text-xs text-[color:var(--text-muted)]">
            {loading ? "Loading…" : `${filtered.length} of ${list.length}`}
          </div>
        </section>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-[color:var(--bg-sunken)]">
              <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            {/* List */}
            <div className="space-y-2">
              {filtered.map((r) => (
                <RecordingCard
                  key={r.id}
                  rec={r}
                  active={active?.id === r.id}
                  onClick={() => setActive(r)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg-elevated)]/50 p-8 text-center text-sm text-[color:var(--text-muted)]">
                  No recordings match &quot;{filter}&quot;.
                </div>
              )}
            </div>

            {/* Player */}
            <div className="sticky top-20 self-start">
              <Player rec={active} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RecordingCard({
  rec, active, onClick,
}: {
  rec: Recording;
  active: boolean;
  onClick: () => void;
}) {
  const dur = rec.duration_ms ? humanize(rec.duration_ms) : "—";
  const size = rec.file_size ? humanizeSize(rec.file_size) : "—";
  const when = new Date(rec.started_at).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    <button
      onClick={onClick}
      className={
        "w-full rounded-xl border p-4 text-left transition-all " +
        (active
          ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 shadow-md"
          : "border-[color:var(--border)] bg-[color:var(--bg)] hover:border-[color:var(--border-strong)] hover:shadow-sm")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon.Video size={14} className="shrink-0 text-[color:var(--accent)]" />
            <span className="truncate font-mono text-sm font-medium">/{rec.room}</span>
          </div>
          <div className="mt-1 text-xs text-[color:var(--text-muted)]">
            by {rec.started_by} · {when}
          </div>
        </div>
        {active && (
          <span className="rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Playing
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-[color:var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <Icon.Clock size={10} />
          {dur}
        </span>
        <span className="flex items-center gap-1">
          <Icon.FileText size={10} />
          {size}
        </span>
        <span className={
          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase " +
          (rec.status === "stopped" ? "bg-emerald-500/10 text-emerald-600" :
           rec.status === "recording" ? "bg-red-500/10 text-red-500" :
           "bg-gray-500/10 text-gray-500")
        }>
          {rec.status}
        </span>
      </div>
    </button>
  );
}

function Player({ rec }: { rec: Recording | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [rec?.id]);

  if (!rec) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg-elevated)]/50 p-12 text-center text-sm text-[color:var(--text-muted)]">
        Select a recording to play.
      </div>
    );
  }

  const src = `/api/recordings/${rec.id}`;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-black overflow-hidden shadow-xl animate-fadeIn">
      <video
        ref={videoRef}
        src={src}
        controls
        className="aspect-video w-full bg-black"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          setDuration(v.duration || rec.duration_ms! / 1000);
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.duration) setDuration(v.duration);
        }}
        preload="metadata"
      />
      <div className="flex items-center justify-between gap-2 bg-[#0a0a0f] p-3 text-white">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm font-medium">/{rec.room}</div>
          <div className="text-[10px] text-white/50">
            {formatTime(currentTime)} / {formatTime(duration || rec.duration_ms! / 1000)}
          </div>
        </div>
        <a
          href={`/api/recordings/${rec.id}?download=1`}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition-colors"
          download
        >
          <Icon.Send size={11} /> Download
        </a>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg-elevated)]/50 p-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--bg)]">
        <Icon.Record size={28} className="text-[color:var(--text-muted)]" />
      </div>
      <h3 className="mt-4 text-lg font-medium">No recordings yet</h3>
      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
        Recordings will appear here after you record a meeting from the in-meeting toolbar.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex items-center gap-2 !py-2.5">
        <Icon.Video size={14} /> Start a meeting
      </Link>
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function humanize(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function humanizeSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}