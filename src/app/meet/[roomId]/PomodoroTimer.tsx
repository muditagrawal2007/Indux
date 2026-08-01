"use client";

// Pomodoro timer — productivity timer inside the call.
// Default: 25 minutes work, 5 minutes break.
// Visual progress ring that counts down; supports play/pause/skip/reset.
// When a session ends, plays a chime and shows confetti-like success.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

type Mode = "work" | "break";

const DURATIONS: Record<Mode, number> = {
  work: 25 * 60,
  break: 5 * 60,
};

export function PomodoroTimer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("work");
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // Cycle mode
          setMode((m) => {
            const next: Mode = m === "work" ? "break" : "work";
            if (m === "work") setSessions((s) => s + 1);
            try {
              const audio = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = audio.createOscillator();
              const g = audio.createGain();
              o.connect(g); g.connect(audio.destination);
              o.frequency.value = next === "break" ? 880 : 440;
              g.gain.setValueAtTime(0.18, audio.currentTime);
              g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.2);
              o.start(); o.stop(audio.currentTime + 1.2);
            } catch {}
            return next;
          });
          return DURATIONS[mode === "work" ? "break" : "work"];
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setRemaining(DURATIONS[mode]);
    }
  }, [open, mode]);

  if (!open) return null;

  const total = DURATIONS[mode];
  const progress = (total - remaining) / total;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const modeColor = mode === "work" ? "var(--accent)" : "#10b981";

  function reset() {
    setRemaining(DURATIONS[mode]);
    setRunning(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[360px] overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#15151c] to-[#0a0a10] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-scaleIn"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
        />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06]">
              <span className="text-base">⏱</span>
            </span>
            <div>
              <div className="text-sm font-semibold">Pomodoro</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {mode === "work" ? "Focus session" : "Take a break"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/45 hover:bg-white/[0.06] hover:text-white">
            <Icon.Close size={14} />
          </button>
        </div>

        {/* Progress ring */}
        <div className="relative mx-auto my-4 grid h-44 w-44 place-items-center">
          <svg width="160" height="160" className="absolute inset-0">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={modeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 600ms linear", filter: `drop-shadow(0 0 8px ${modeColor}55)` }}
            />
          </svg>
          <div className="text-center">
            <div className={"font-mono text-4xl font-bold tabular-nums " + (remaining < 30 && mode === "work" ? "text-amber-300" : "text-white")}>
              {timeStr}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/45">
              {remaining === 0 ? "Done!" : remaining < 30 ? "Wrap up" : "in progress"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setMode((m) => (m === "work" ? "break" : "work"))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            {mode === "work" ? "Switch to break" : "Switch to work"}
          </button>
          <button
            onClick={reset}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08] hover:text-white"
            title="Reset"
          >
            <Icon.Refresh size={11} />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: running ? "rgba(255,255,255,0.12)" : `linear-gradient(135deg, ${modeColor}, ${modeColor}dd)`,
              boxShadow: running ? "none" : `0 4px 16px ${modeColor}44, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            {running ? "Pause" : "Start"}
          </button>
        </div>

        {/* Session counter */}
        <div className="mt-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-white/40">
          <span>Sessions today</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.max(sessions, 4) }).map((_, i) => (
              <span
                key={i}
                className={"h-1.5 w-3 rounded-full " + (i < sessions ? "bg-[color:var(--accent)]" : "bg-white/10")}
                style={i < sessions ? { background: modeColor } : undefined}
              />
            ))}
          </div>
          <span className="font-mono text-white/65">{sessions}</span>
        </div>
      </div>
    </div>
  );
}