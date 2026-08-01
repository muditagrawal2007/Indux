"use client";

// Welcome animation — when a new participant joins the meeting, show a
// big greeting card with a waving hand and confetti that fades out.
// Reuses the ActivityTicker's join events so we don't double-fire.

import { useEffect, useRef, useState } from "react";

type Greeting = {
  id: number;
  name: string;
};

export function WelcomeBanner({
  participants,
  currentName,
}: {
  participants: { identity: string; name?: string }[];
  currentName: string;
}) {
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set([currentName]));
  const idRef = useRef(0);

  useEffect(() => {
    const fresh: Greeting[] = [];
    for (const p of participants) {
      if (!knownIdsRef.current.has(p.identity) && p.identity !== currentName) {
        knownIdsRef.current.add(p.identity);
        idRef.current += 1;
        fresh.push({ id: idRef.current, name: p.name || p.identity });
      }
    }
    if (fresh.length > 0) {
      setGreetings((cur) => [...cur, ...fresh].slice(-3));
      setTimeout(() => {
        setGreetings((cur) => cur.filter((g) => !fresh.find((f) => f.id === g.id)));
      }, 4500);
    }
  }, [participants, currentName]);

  if (greetings.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-24 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {greetings.slice(-1).map((g) => (
        <div
          key={g.id}
          className="pointer-events-auto relative animate-bounceIn overflow-hidden rounded-2xl border border-white/[0.12] bg-black/55 px-5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(99,102,241,0.25)] backdrop-blur-2xl"
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 0% 50%, rgba(99,102,241,0.5), transparent 50%), radial-gradient(circle at 100% 50%, rgba(236,72,153,0.5), transparent 50%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-pink-400 text-xl shadow-lg ring-2 ring-white/20">
              <span className="wave-hand">👋</span>
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                Just joined
              </div>
              <div className="text-lg font-bold tracking-tight text-white">
                {g.name}
              </div>
            </div>
          </div>
          {/* Confetti specks */}
          <span className="absolute -top-1 left-1/4 h-1.5 w-1.5 rounded-full bg-amber-300 join-celebrate" style={{ animationDelay: "0ms" }} />
          <span className="absolute -top-1 left-2/4 h-1 w-1 rounded-full bg-pink-400 join-celebrate" style={{ animationDelay: "150ms" }} />
          <span className="absolute -top-1 left-3/4 h-1.5 w-1.5 rounded-full bg-emerald-300 join-celebrate" style={{ animationDelay: "300ms" }} />
          <span className="absolute -top-1 left-1/3 h-1 w-1 rounded-full bg-violet-300 join-celebrate" style={{ animationDelay: "450ms" }} />
        </div>
      ))}
    </div>
  );
}