"use client";

// Reusable count-up hook — smoothly animates a number whenever `to` changes.
// Used by poll results, animated leaderboards, etc.

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;

    function tick(ts: number) {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

export function CountUp({
  to,
  duration = 600,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const v = useCountUp(to, duration);
  return (
    <span className={className}>
      {prefix}
      {Math.round(v).toLocaleString()}
      {suffix}
    </span>
  );
}
