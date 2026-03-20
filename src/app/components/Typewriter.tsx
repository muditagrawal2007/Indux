"use client";

// Cycles through strings with a typewriter effect.
import { useEffect, useState } from "react";

export function Typewriter({
  phrases,
  cycleMs = 3200,
  className,
}: {
  phrases: string[];
  cycleMs?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">(
    "typing"
  );

  useEffect(() => {
    const phrase = phrases[idx] ?? "";
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (text.length < phrase.length) {
        timer = setTimeout(
          () => setText(phrase.slice(0, text.length + 1)),
          55 + Math.random() * 30
        );
      } else {
        timer = setTimeout(() => setPhase("holding"), 0);
      }
    } else if (phase === "holding") {
      timer = setTimeout(() => setPhase("erasing"), 1100);
    } else if (phase === "erasing") {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, -1)), 28);
      } else {
        setPhase("typing");
        setIdx((i) => (i + 1) % phrases.length);
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, idx, phrases]);

  return (
    <span className={`cursor inline-block ${className ?? ""}`}>
      {text || "\u00A0"}
    </span>
  );
}