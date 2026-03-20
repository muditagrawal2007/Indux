"use client";

// Tiny animated audio-wave that loops — used as a speaking indicator
// on participant tiles and the toolbar.
export function AudioWave({
  bars = 4,
  className,
  active = true,
}: {
  bars?: number;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-end gap-[2px] ${className ?? ""}`}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`block w-[3px] rounded-sm bg-current ${
            active ? "animate-wave" : ""
          }`}
          style={{
            height: 10 + (i % 3) * 4,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </span>
  );
}