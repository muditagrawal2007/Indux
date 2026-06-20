"use client";

// Subtle Web Audio feedback for key in-meeting events.
// All sounds are generated procedurally — no asset files needed.
// Volume + master toggle persisted to localStorage.

let ctx: AudioContext | null = null;
let masterEnabled = true;
let volume = 0.4;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  // Restore preferences
  try {
    const stored = localStorage.getItem("indux_sfx");
    if (stored) {
      const v = JSON.parse(stored);
      masterEnabled = v.enabled ?? true;
      volume = v.volume ?? 0.4;
    }
  } catch {}
  return ctx;
}

export function setSfxEnabled(on: boolean) {
  masterEnabled = on;
  try { localStorage.setItem("indux_sfx", JSON.stringify({ enabled: masterEnabled, volume })); } catch {}
}

export function setSfxVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem("indux_sfx", JSON.stringify({ enabled: masterEnabled, volume })); } catch {}
}

export function isSfxEnabled() {
  return masterEnabled;
}

export function getSfxVolume() {
  return volume;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 1) {
  if (!masterEnabled) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(volume * gain, t0 + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(env);
  env.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.05);
}

export const sfx = {
  join: () => {
    tone(660, 90, "sine", 0.6);
    setTimeout(() => tone(880, 100, "sine", 0.5), 70);
  },
  leave: () => {
    tone(880, 80, "sine", 0.5);
    setTimeout(() => tone(660, 100, "sine", 0.4), 70);
  },
  reaction: () => {
    tone(1200, 60, "triangle", 0.5);
  },
  hand: () => {
    tone(523, 60, "sine", 0.6);
    setTimeout(() => tone(659, 80, "sine", 0.5), 60);
  },
  poll: () => {
    tone(440, 70, "square", 0.4);
    setTimeout(() => tone(660, 80, "square", 0.3), 80);
  },
  message: () => {
    tone(880, 50, "sine", 0.3);
  },
  confetti: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 80, "triangle", 0.5), i * 70));
  },
  ai: () => {
    tone(880, 60, "sine", 0.3);
    setTimeout(() => tone(1175, 80, "sine", 0.3), 60);
  },
};