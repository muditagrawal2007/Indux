"use client";

// Emoji bubble stream — a continuous, ambient stream of emoji bubbles
// that float up from the bottom of the screen, drifting and rotating.
// Users can add bubbles by clicking; bubbles also auto-appear at intervals
// when reactions are fired in the room.

import { useEffect, useState } from "react";

type Bubble = {
  id: number;
  emoji: string;
  left: number; // percentage
  drift: number;
  rotate: number;
  size: number;
  duration: number;
  delay: number;
};

const EMOJI_POOL = ["❤️", "👍", "🎉", "🚀", "💡", "✨", "🔥", "👏", "🤝", "💯", "🌟", "🙌"];

let nextId = 0;

export function EmojiBubbleStream({
  running = true,
  ambient = true,
}: {
  running?: boolean;
  ambient?: boolean;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // Ambient bubbles — drop one every few seconds for a lively feel
  useEffect(() => {
    if (!running || !ambient) return;
    const t = setInterval(() => {
      const b = makeBubble();
      setBubbles((cur) => [...cur, b]);
      setTimeout(() => {
        setBubbles((cur) => cur.filter((x) => x.id !== b.id));
      }, b.duration * 1000 + b.delay);
    }, 4500);
    return () => clearInterval(t);
  }, [running, ambient]);

  if (!running) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[60vh] overflow-hidden">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="bubble-rise absolute bottom-0 select-none"
          style={
            {
              left: `${b.left}%`,
              fontSize: `${b.size}px`,
              "--drift": `${b.drift}px`,
              "--rotate": `${b.rotate}deg`,
              "--rise-duration": `${b.duration}s`,
              animationDelay: `${b.delay}ms`,
            } as React.CSSProperties
          }
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

function makeBubble(): Bubble {
  return {
    id: ++nextId,
    emoji: EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)],
    left: 5 + Math.random() * 90,
    drift: (Math.random() - 0.5) * 200,
    rotate: (Math.random() - 0.5) * 60,
    size: 18 + Math.random() * 18,
    duration: 3 + Math.random() * 2,
    delay: 0,
  };
}