"use client";

// SpatialVoiceRoom — "Clubhouse for video calls".
// Participants are placed in a 2D circle/grid; their audio is panned left/right
// based on x position. Drag your own tile to move. Everyone else hears you
// from a different direction.
//
// We do client-side spatial audio via Web Audio's StereoPannerNode, tapping
// each remote participant's audio track. This is independent of LiveKit's
// transport and works with any SFU.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track, RemoteParticipant, RemoteAudioTrack } from "livekit-client";
import { Icon } from "../../components/Icons";
import { sfx } from "./sfx";

type Pos = { x: number; y: number };

export function SpatialVoiceRoom({
  roomId, userName, onClose,
}: {
  roomId: string;
  userName: string;
  onClose: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const all = useMemo(() => [localParticipant, ...remotes].filter(Boolean), [localParticipant, remotes]);
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });

  // Layout: 2D grid auto-positioned on entry; user can drag their own tile
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const positionsRef = useRef<Record<string, Pos>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pulled, setPulled] = useState(false);

  // Fetch / save positions from server
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/spatial`);
        const d = await r.json();
        if (cancelled) return;
        const map: Record<string, Pos> = {};
        for (const p of d.positions ?? []) map[p.identity] = { x: p.x, y: p.y };
        positionsRef.current = map;
        setPositions({ ...map });
      } catch {}
    }
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  // Auto-place new joiners in a circle that hasn't been taken
  useEffect(() => {
    setPositions((cur) => {
      const next = { ...cur };
      let added = false;
      const used = new Set(Object.keys(next));
      for (const p of all) {
        const id = p.identity;
        if (!next[id]) {
          const idx = used.size + (added ? 1 : 0);
          next[id] = ringPosition(idx, all.length);
          added = true;
          used.add(id);
        }
      }
      if (added) {
        positionsRef.current = next;
        // Persist new positions
        for (const [id, pos] of Object.entries(next)) {
          fetch(`/api/rooms/${roomId}/spatial`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity: id, x: pos.x, y: pos.y }),
          }).catch(() => {});
        }
      }
      return next;
    });
  }, [all.length, roomId]);

  // Spatial audio engine — connect each remote audio track to a pan node
  const audioCtxRef = useRef<AudioContext | null>(null);
  const panNodesRef = useRef<Map<string, StereoPannerNode>>(new Map());

  useEffect(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    for (const t of tracks) {
      const pub = t.publication;
      if (!pub || pub.kind !== "audio") continue;
      const track = (pub as any).track as RemoteAudioTrack | undefined;
      if (!track || !track.mediaStream) continue;
      const id = (t.participant as RemoteParticipant)?.identity;
      if (!id) continue;

      let node = panNodesRef.current.get(id);
      if (!node) {
        node = ctx.createStereoPanner();
        node.connect(ctx.destination);
        panNodesRef.current.set(id, node);
      }
      // Avoid double-connecting
      try {
        const stream = track.mediaStream;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(node);
      } catch {}
    }

    return () => {};
  }, [tracks.length]);

  // Continuously update pan values based on positions
  useEffect(() => {
    const tick = setInterval(() => {
      for (const [id, node] of panNodesRef.current.entries()) {
        const pos = positionsRef.current[id];
        if (!pos) continue;
        // Pan: -1 (left) to 1 (right). Distance from center attenuates slightly.
        node.pan.setTargetAtTime(Math.max(-1, Math.min(1, pos.x)), audioCtxRef.current?.currentTime ?? 0, 0.08);
      }
    }, 80);
    return () => clearInterval(tick);
  }, []);

  // Drag handlers — relative to stage bounds
  function onMouseDown(e: React.MouseEvent, id: string) {
    if (id !== userName) return;
    e.preventDefault();
    setDragging(id);
    sfx.reaction();
  }

  useEffect(() => {
    if (!dragging) return;
    const dragId: string = dragging;
    function onMove(e: MouseEvent) {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      const clamped = { x: Math.max(-0.95, Math.min(0.95, x)), y: Math.max(-0.95, Math.min(0.95, y)) };
      positionsRef.current = { ...positionsRef.current, [dragId]: clamped };
      setPositions((p) => ({ ...p, [dragId]: clamped }));
    }
    function onUp() {
      const final = positionsRef.current[dragId];
      if (final) {
        fetch(`/api/rooms/${roomId}/spatial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: dragId, x: final.x, y: final.y }),
        }).catch(() => {});
      }
      setDragging(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, roomId]);

  function pullMeToCenter() {
    const cur = positionsRef.current[userName] ?? { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const start = performance.now();
    const dur = 600;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const interp = { x: cur.x + (target.x - cur.x) * ease, y: cur.y + (target.y - cur.y) * ease };
      positionsRef.current = { ...positionsRef.current, [userName]: interp };
      setPositions((p) => ({ ...p, [userName]: interp }));
      if (t < 1) requestAnimationFrame(step);
      else {
        fetch(`/api/rooms/${roomId}/spatial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: userName, x: 0, y: 0 }),
        }).catch(() => {});
      }
    };
    requestAnimationFrame(step);
    setPulled(true);
    setTimeout(() => setPulled(false), 800);
  }

  function spreadOut() {
    const ids = Object.keys(positionsRef.current);
    const n = ids.length;
    ids.forEach((id, i) => {
      const angle = (i / n) * Math.PI * 2;
      const r = 0.7;
      const pos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.7 };
      positionsRef.current = { ...positionsRef.current, [id]: pos };
      fetch(`/api/rooms/${roomId}/spatial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: id, x: pos.x, y: pos.y }),
      }).catch(() => {});
    });
    setPositions({ ...positionsRef.current });
  }

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#0a0a14]/95 via-[#10101c]/95 to-[#06060e]/95 backdrop-blur-xl animate-fadeIn">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl shadow-lg"
               style={{ background: "linear-gradient(135deg, var(--accent), #ec4899)" }}>
            <Icon.Volume size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold">Spatial Voice Room</div>
            <div className="text-[10px] text-white/40">Drag your tile · audio pans to match · {all.length} here</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={pullMeToCenter}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Icon.Pin size={11} /> Pull me to center
          </button>
          <button
            onClick={spreadOut}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Icon.Maximize size={11} /> Spread out
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <Icon.Close size={11} /> Exit spatial
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="absolute inset-0 select-none"
        style={{ cursor: dragging ? "grabbing" : "default" }}
      >
        {/* Center indicator (speaker) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <div className="absolute inset-0 -m-8 rounded-full border border-white/5 animate-pulse" />
        </div>

        {/* Y-axis label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 rotate-180 text-[10px] uppercase tracking-wider text-white/20 [writing-mode:vertical-lr]">
          ↑ louder
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-white/20 [writing-mode:vertical-lr]">
          louder ↑
        </div>

        {/* Tiles */}
        {all.map((p) => {
          const id = p.identity;
          const pos = positions[id] ?? { x: 0, y: 0 };
          const isMe = id === userName;
          const isLocal = p.isLocal || isMe;
          return (
            <SpatialTile
              key={id}
              participant={p}
              pos={pos}
              isLocal={isLocal}
              isMe={isMe}
              isDragging={dragging === id}
              pulled={pulled && isMe}
              onMouseDown={(e) => onMouseDown(e, id)}
            />
          );
        })}
      </div>

      {/* Hint pill */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-white/50 backdrop-blur-md animate-fadeIn">
        💡 Move closer to the center to be heard louder · left/right pans your audio for everyone
      </div>
    </div>
  );
}

function SpatialTile({
  participant, pos, isLocal, isMe, isDragging, pulled, onMouseDown,
}: {
  participant: any;
  pos: Pos;
  isLocal: boolean;
  isMe: boolean;
  isDragging: boolean;
  pulled: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const camPub = participant.getTrackPublication?.(Track.Source.Camera);
    if (camPub?.track && audioRef.current?.parentElement) {
      camPub.track.attach(audioRef.current);
      setHasVideo(!camPub.track.isMuted);
    }
    return () => {
      try { camPub?.track?.detach(audioRef.current); } catch {}
    };
  }, [participant]);

  const name = participant.name || participant.identity || "User";
  const initials = name[0]?.toUpperCase() || "?";

  // Convert pos (-1..1) to percent within stage
  const left = `${(pos.x + 1) * 50}%`;
  const top = `${(pos.y + 1) * 50}%`;

  // Volume scaling: closer to center = larger tile + brighter ring
  const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  const scale = 1 - Math.min(0.35, dist * 0.3);
  const ringColor = isMe
    ? "rgba(99, 102, 241, 0.6)"
    : isLocal
      ? "rgba(168, 85, 247, 0.5)"
      : "rgba(255, 255, 255, 0.15)";

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
      style={{
        left,
        top,
        transform: `translate(-50%, -50%) scale(${scale})`,
        zIndex: isDragging ? 50 : Math.round((1 - dist) * 10),
        cursor: isMe ? (isDragging ? "grabbing" : "grab") : "default",
      }}
    >
      <div
        className="relative h-28 w-28 sm:h-36 sm:w-36 overflow-hidden rounded-2xl shadow-2xl ring-2 transition-all"
        style={{ boxShadow: `0 0 32px ${ringColor}` }}
      >
        <video
          ref={audioRef as any}
          autoPlay
          playsInline
          muted
          className={"h-full w-full object-cover " + (hasVideo ? "" : "hidden")}
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ background: `linear-gradient(135deg, ${ringColor}, rgba(0,0,0,0.6))` }}>
            <span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{initials}</span>
          </div>
        )}

        {/* Name pill */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm whitespace-nowrap">
          {name}{isMe && " (You)"}
        </div>

        {/* Pan indicator (L/R bar) */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center gap-0.5">
          <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-cyan-400/80 transition-all duration-200"
              style={{ width: `${50 + pos.x * 50}%` }}
            />
          </div>
        </div>
        <div className="absolute top-3 right-1.5 text-[8px] font-mono text-white/50 tabular-nums">
          {pos.x < 0 ? "L" : pos.x > 0 ? "R" : "·"}
        </div>
      </div>

      {pulled && (
        <div className="absolute -inset-2 rounded-2xl border-2 border-cyan-400/60 animate-ping pointer-events-none" />
      )}
    </div>
  );
}

function ringPosition(i: number, total: number): Pos {
  if (total <= 1) return { x: 0, y: 0 };
  const angle = (i / total) * Math.PI * 2;
  const r = 0.55;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.65 };
}