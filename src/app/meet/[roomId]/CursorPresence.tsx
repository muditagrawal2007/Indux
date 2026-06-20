"use client";

// Cursor Presence — overlays every participant's mouse position as a colored
// cursor with their name tag. Uses LiveKit data channel for low-latency sync.
// Falls back to /api/rooms/[r]/cursors polling if data channel isn't ready.

import { useEffect, useRef } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";

type Cursor = {
  identity: string;
  name: string;
  x: number;
  y: number;
  ts: number;
};

const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16"];
const STALE_MS = 4000;

export function CursorPresence({
  roomId, identity, userName, room,
}: {
  roomId: string;
  identity: string;
  userName: string;
  room: Room | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorsRef = useRef<Map<string, Cursor>>(new Map());
  const rafRef = useRef<number | null>(null);

  // Subscribe to live cursors over LiveKit data channel
  useEffect(() => {
    if (!room) return;

    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.kind !== "cursor") return;
        const sid = participant?.identity ?? msg.identity ?? "?";
        cursorsRef.current.set(sid, {
          identity: sid,
          name: msg.name ?? sid,
          x: msg.x,
          y: msg.y,
          ts: Date.now(),
        });
      } catch {}
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  // Publish my cursor at ~24fps (throttled)
  useEffect(() => {
    let lastSent = 0;
    function onMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastSent < 42) return;
      lastSent = now;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      cursorsRef.current.set(identity, { identity, name: userName, x, y, ts: Date.now() });
      if (room && room.localParticipant) {
        const msg = JSON.stringify({ kind: "cursor", identity, name: userName, x, y });
        const data = new TextEncoder().encode(msg);
        room.localParticipant.publishData(data, { reliable: false }).catch(() => {});
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [room, identity, userName]);

  // Render loop
  useEffect(() => {
    function tick() {
      draw(canvasRef.current, cursorsRef.current, identity);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [identity]);

  // Fallback poll if LiveKit data channel is quiet
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${roomId}/cursors`);
        const d = await r.json();
        for (const c of d.cursors ?? []) {
          if (c.identity === identity) continue;
          const existing = cursorsRef.current.get(c.identity);
          if (!existing || Date.now() - existing.ts > 1500) {
            cursorsRef.current.set(c.identity, {
              identity: c.identity,
              name: c.name ?? c.identity,
              x: c.x,
              y: c.y,
              ts: Date.now(),
            });
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [roomId, identity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30"
      aria-hidden="true"
    />
  );
}

function draw(canvas: HTMLCanvasElement | null, cursors: Map<string, Cursor>, selfId: string) {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== window.innerWidth * dpr) {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const now = Date.now();
  const liveCursors: Cursor[] = [];
  for (const c of cursors.values()) {
    if (now - c.ts < STALE_MS) liveCursors.push(c);
  }

  for (const c of liveCursors) {
    const x = c.x * window.innerWidth;
    const y = c.y * window.innerHeight;
    const colorIdx = hashColor(c.identity);
    const color = COLORS[colorIdx % COLORS.length];

    // Trail
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cursor arrow (simple triangle pointing up-left)
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(4, 11);
    ctx.lineTo(7, 18);
    ctx.lineTo(10, 17);
    ctx.lineTo(7, 10);
    ctx.lineTo(12, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Name tag
    const isMe = c.identity === selfId;
    const label = isMe ? "You" : c.name;
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    const padding = 6;
    const textW = ctx.measureText(label).width;
    const tagX = x + 12;
    const tagY = y + 18;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    roundRect(ctx, tagX, tagY, textW + padding * 2, 18, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.fillText(label, tagX + padding, tagY + 12);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hashColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfffffff;
  return h;
}