"use client";

// Confetti — lightweight canvas-based particle system for celebrations.
// Triggered on milestones (10th participant, poll close, big reaction bursts).

import { useEffect } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
  shape: "rect" | "circle" | "star";
};

const PALETTES = {
  default: ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"],
  rainbow: ["#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#a855f7"],
  warm: ["#f97316", "#eab308", "#ef4444", "#ec4899"],
};

export function fireConfetti(
  origin: { x: number; y: number } | "center" | "left" | "right",
  opts: { count?: number; palette?: keyof typeof PALETTES; spread?: number } = {}
) {
  const canvas = ensureCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = PALETTES[opts.palette ?? "default"];
  const count = opts.count ?? 80;
  const spread = opts.spread ?? 1;
  const o = origin === "center"
    ? { x: canvas.width / 2, y: canvas.height / 2 }
    : origin === "left"
      ? { x: canvas.width * 0.2, y: canvas.height / 2 }
      : origin === "right"
        ? { x: canvas.width * 0.8, y: canvas.height / 2 }
        : origin;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 0.6) - Math.PI * 0.3 + (Math.random() < 0.5 ? Math.PI : 0);
    const speed = (3 + Math.random() * 6) * spread;
    particles.push({
      x: o.x + (Math.random() - 0.5) * 40,
      y: o.y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed * (Math.random() * 0.6 + 0.7),
      vy: Math.sin(angle) * speed - Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 1,
      shape: (["rect", "circle", "star"] as const)[Math.floor(Math.random() * 3)],
    });
  }

  bursts.push({ particles, start: performance.now() });
}

let canvasRef: HTMLCanvasElement | null = null;
let bursts: { particles: Particle[]; start: number }[] = [];
let rafId: number | null = null;

function ensureCanvas(): HTMLCanvasElement {
  if (canvasRef && canvasRef.isConnected) return canvasRef;
  const canvas = document.createElement("canvas");
  canvas.id = "indux-confetti";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);
  canvasRef = canvas;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  loop();
  return canvas;
}

function resizeCanvas() {
  if (!canvasRef) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasRef.width = window.innerWidth * dpr;
  canvasRef.height = window.innerHeight * dpr;
  const ctx = canvasRef.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  if (!canvasRef) return;
  const ctx = canvasRef.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

  const now = performance.now();
  bursts = bursts.filter((b) => now - b.start < 3000);

  for (const burst of bursts) {
    const age = (now - burst.start) / 1000;
    for (const p of burst.particles) {
      p.vy += 0.18;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - age / 2.5);
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const r = p.size / 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          const a2 = a + Math.PI / 5;
          ctx.lineTo(Math.cos(a2) * r * 0.5, Math.sin(a2) * r * 0.5);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (bursts.length > 0) {
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = null;
  }
}

export function ConfettiCanvas() {
  useEffect(() => {
    ensureCanvas();
    return () => {
      // leave canvas in place; re-render is cheap
    };
  }, []);
  return null;
}