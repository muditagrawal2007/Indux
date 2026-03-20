"use client";

// Counts from 0 to a target number with easing — used on the launcher
// for "30+ features", "120k calls today", etc.
import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  to,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const seenRef = useRef(false);
  const elRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (seenRef.current) return;
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !seenRef.current) {
            seenRef.current = true;
            obs.disconnect();
            const tick = (ts: number) => {
              if (startRef.current == null) startRef.current = ts;
              const t = Math.min(1, (ts - startRef.current) / duration);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - t, 3);
              setN(eased * to);
              if (t < 1) requestAnimationFrame(tick);
              else setN(to);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  const formatted =
    decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();

  return (
    <span ref={elRef} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}