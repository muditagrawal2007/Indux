"use client";

// MusicRoom — collaborative lo-fi radio. Hosts queue tracks, anyone can vote-skip.
// The currently-playing audio is hosted by the FIRST user to play (client-side).
// Other clients listen via shared "now playing" track id; when their local audio
// element's src mismatches, they fetch and resume. This keeps it single-track.
// (Proper multi-host sync would use a server stream — out of scope.)

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type Track = {
  id: number;
  url: string;
  title: string;
  added_by: string;
  votes: number;
  played: boolean;
  created_at: number;
};

const CURATED: { url: string; title: string }[] = [
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", title: "SoundHelix · Song 1" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", title: "SoundHelix · Song 2" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", title: "SoundHelix · Song 3" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", title: "SoundHelix · Song 4" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", title: "SoundHelix · Song 5" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", title: "SoundHelix · Song 6" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", title: "SoundHelix · Song 7" },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", title: "SoundHelix · Song 8" },
];

export function MusicRoom({
  roomId, userName, onClose,
}: {
  roomId: string;
  userName: string;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showAdd, setShowAdd] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [voted, setVoted] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);

  // Refresh queue + current track
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/music`);
        const d = await r.json();
        if (cancelled) return;
        setQueue(d.queue ?? []);
        // Determine "now playing" — lowest id among non-played = head of queue
        const head = (d.queue ?? []).find((t: Track) => !t.played);
        if (!head && nowPlaying) {
          setNowPlaying(null);
          setProgress(0);
          setDuration(0);
        }
      } catch {}
    }
    load();
    const t = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  // Auto-load currently playing track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (nowPlaying && audio.src !== nowPlaying.url) {
      audio.src = nowPlaying.url;
      audio.volume = volume;
      audio.play().catch(() => {});
      sfx.poll();
    }
    if (!nowPlaying) {
      audio.pause();
      audio.src = "";
    }
  }, [nowPlaying?.url, volume]);

  // Advance queue when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (nowPlaying) {
        fetch(`/api/rooms/${roomId}/music`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "played", id: nowPlaying.id }),
        }).catch(() => {});
        const next = queue.find((t) => t.id > nowPlaying.id);
        setNowPlaying(next ?? null);
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [nowPlaying, queue, roomId]);

  // Progress tick
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
    };
  }, []);

  // Auto-play first track if queue is empty
  useEffect(() => {
    if (!nowPlaying && queue.length > 0 && queue[0]) {
      setNowPlaying(queue[0]);
    }
  }, [queue.length, nowPlaying]);

  async function addTrack(url: string, title: string) {
    try {
      const r = await fetch(`/api/rooms/${roomId}/music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", url, title, added_by: userName }),
      });
      const d = await r.json();
      if (d.track) setQueue((q) => [...q, d.track]);
      sfx.message();
      setShowAdd(false);
      setCustomUrl("");
    } catch {}
  }

  async function vote(id: number, delta: number) {
    if (voted.has(id)) return;
    setVoted((s) => new Set(s).add(id));
    setQueue((q) => q.map((t) => (t.id === id ? { ...t, votes: Math.max(0, t.votes + delta) } : t)));
    await fetch(`/api/rooms/${roomId}/music`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", id, delta }),
    });
  }

  function skip() {
    if (!nowPlaying) return;
    sfx.leave();
    fetch(`/api/rooms/${roomId}/music`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "played", id: nowPlaying.id }),
    });
    const next = queue.find((t) => t.id > nowPlaying.id);
    setNowPlaying(next ?? null);
  }

  function playTrack(t: Track) {
    sfx.poll();
    setNowPlaying(t);
  }

  async function submitCustom() {
    const url = customUrl.trim();
    if (!url) return;
    let title = url.split("/").pop()?.slice(0, 80) || "Untitled";
    if (title.endsWith(".mp3")) title = title.slice(0, -4);
    await addTrack(url, title);
  }

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0a0a14]/95 via-[#10101c]/95 to-[#06060e]/95 backdrop-blur-xl animate-fadeIn flex">
      <audio ref={audioRef} className="hidden" />

      {/* Main panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl shadow-lg animate-pulse"
                 style={{ background: "linear-gradient(135deg, #ec4899, #f59e0b)" }}>
              <span className="text-base">♪</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Music Room</div>
              <div className="text-[10px] text-white/40">Queue · vote to skip · everyone hears the same beat</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Icon.Plus size={11} /> Add track
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Icon.Close size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Now Playing */}
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a14] px-6 py-8">
          {/* Animated waveform bars */}
          {nowPlaying && (
            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
              {Array.from({ length: 48 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-cyan-400 to-fuchsia-400"
                  style={{
                    height: `${20 + Math.sin(i * 0.4 + progress * 2) * 30 + Math.cos(i * 0.7) * 20}%`,
                    animation: `pulse ${0.5 + (i % 5) * 0.1}s ease-in-out infinite`,
                    animationDelay: `${(i % 8) * 80}ms`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="relative">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Now playing</div>
            {nowPlaying ? (
              <>
                <div className="mt-1 text-2xl font-semibold truncate max-w-md">{nowPlaying.title}</div>
                <div className="mt-1 text-xs text-white/50">queued by {nowPlaying.added_by}</div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (audioRef.current?.paused) audioRef.current.play().catch(() => {});
                      else audioRef.current?.pause();
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full text-white shadow-lg transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #ec4899, #f59e0b)" }}
                  >
                    <span>▶</span>
                  </button>
                  <button
                    onClick={skip}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    title="Skip"
                  >
                    <span>⏭</span>
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full transition-all"
                           style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #ec4899, #f59e0b)" }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/40">
                      <span>{formatTime(progress)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon.Volume size={11} className="text-white/50" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setVolume(v);
                        if (audioRef.current) audioRef.current.volume = v;
                      }}
                      className="w-20 accent-pink-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-white/50">
                Queue empty. Click <span className="text-white/80">Add track</span> or pick a curated track on the right.
              </div>
            )}
          </div>
        </div>

        {/* Add panel */}
        {showAdd && (
          <div className="border-b border-white/10 bg-white/[0.03] px-5 py-3 animate-scaleIn">
            <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Custom URL</div>
            <div className="flex gap-2">
              <input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20"
              />
              <button
                onClick={submitCustom}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow"
                style={{ background: "linear-gradient(135deg, #ec4899, #f59e0b)" }}
              >
                Queue
              </button>
            </div>
            <div className="mt-1 text-[10px] text-white/30">Only direct .mp3 / .ogg links — most CDN links work.</div>
          </div>
        )}

        {/* Queue */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 text-[10px] uppercase tracking-wider text-white/40">Up next ({queue.filter((t) => !t.played).length})</div>
          {queue.filter((t) => !t.played).length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/40">
              No tracks queued. Pick one from the curated list →
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.filter((t) => !t.played).map((t, i) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-[10px] font-mono text-white/40 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{t.title}</div>
                    <div className="text-[10px] text-white/40">{t.added_by}</div>
                  </div>
                  <button
                    onClick={() => vote(t.id, 1)}
                    disabled={voted.has(t.id)}
                    className={
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all " +
                      (voted.has(t.id)
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")
                    }
                    title="Vote to play sooner"
                  >
                    <span>▲</span>
                    <span className="tabular-nums font-mono">{t.votes}</span>
                  </button>
                  <button
                    onClick={() => playTrack(t)}
                    className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Play now"
                  >
                    ▶
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Curated sidebar */}
      <div className="hidden md:flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/30">
        <div className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-wider text-white/40">
          Curated · click to queue
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {CURATED.map((c) => (
            <button
              key={c.url}
              onClick={() => addTrack(c.url, c.title)}
              className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left text-xs text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white transition-all"
            >
              <span className="text-pink-400">♪</span>
              <span className="flex-1 truncate">{c.title}</span>
              <Icon.Plus size={10} className="opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}