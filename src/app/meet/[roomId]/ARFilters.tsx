"use client";

// ARFilters — overlay layer above the user's self-view.
// Strategy:
//   1) Try the browser's native FaceDetector API (Chrome/Edge on Android).
//   2) Fallback to a simple "face center heuristic": sample the user's
//      camera stream on a tiny canvas, find the brightest skin-tone blob,
//      use it as a coarse face box. Good enough for static overlays.
//   3) If neither works, just put the prop centered at the top.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

export type FilterKind =
  | "none"
  | "sunglasses"
  | "halo"
  | "crown"
  | "dog_ears"
  | "mustache"
  | "fire_breath"
  | "rainbow"
  | "blur"
  | "vhs"
  | "matrix"
  | "cyberpunk";

type FaceBox = { x: number; y: number; w: number; h: number };

export function ARFilters({
  filter, videoStream, targetSelector,
}: {
  filter: FilterKind;
  videoStream: MediaStream;
  targetSelector: string; // CSS selector of the <video> element to overlay onto
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [face, setFace] = useState<FaceBox | null>(null);
  const [supported, setSupported] = useState<"native" | "heuristic" | "none">("none");
  const intervalRef = useRef<number | null>(null);

  // Detect face — try native API, fallback to heuristic
  useEffect(() => {
    if (!videoStream) return;
    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) return;

    let detector: { detect: () => Promise<unknown[]> } | null = null;
    let cancelled = false;

    async function setup() {
      // Native path
      if (typeof window !== "undefined" && (window as any).FaceDetector) {
        try {
          detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          setSupported("native");
          if (cancelled) return;
          tick();
          return;
        } catch {}
      }
      // Heuristic path
      try {
        detector = await makeHeuristicDetector(videoStream);
        setSupported("heuristic");
        if (cancelled) return;
        tick();
      } catch {
        setSupported("none");
      }
    }

    async function tick() {
      if (cancelled || !videoStream || !detector) return;
      try {
        const f = await detector.detect();
        if (f && f.length) {
          const box = f[0];
          // Map to overlay coords (overlay covers the whole self-view tile)
          setFace(normalizeBox(box));
        } else {
          setFace(null);
        }
      } catch {
        setFace(null);
      }
      intervalRef.current = window.setTimeout(tick, 200);
    }

    setup();
    return () => {
      cancelled = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [videoStream]);

  // CSS filter effects apply to the video itself
  useEffect(() => {
    const target = document.querySelector<HTMLVideoElement>(targetSelector);
    if (!target) return;
    target.style.filter = cssFilterFor(filter);
    return () => {
      try { target.style.filter = ""; } catch {}
    };
  }, [filter, targetSelector]);

  if (filter === "none") return null;

  const fx = filterFx(filter);
  const useFace = fx.anchor === "face" && face;

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {useFace ? (
        <div
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: `${face.x * 100}%`,
            top: `${face.y * 100}%`,
            width: `${face.w * 100}%`,
            height: `${face.h * 100}%`,
            transform: fx.transform,
          }}
        >
          {fx.render()}
        </div>
      ) : fx.anchor === "face" ? (
        // Anchor centered on top quarter when no face detected
        <div className="absolute left-1/2 top-[18%] -translate-x-1/2 transition-opacity duration-200">
          {fx.render()}
        </div>
      ) : (
        // Full-screen effects
        <div className="absolute inset-0">
          {fx.render()}
        </div>
      )}

      {/* Subtle indicator in corner */}
      {supported !== "native" && (
        <div className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] text-white/40 backdrop-blur-sm">
          {supported === "heuristic" ? "approx" : "css-only"}
        </div>
      )}
    </div>
  );
}

function cssFilterFor(f: FilterKind): string {
  switch (f) {
    case "blur": return "blur(8px) saturate(1.2)";
    case "vhs": return "contrast(1.2) saturate(0.8) hue-rotate(-10deg)";
    case "matrix": return "contrast(1.4) saturate(0.5) hue-rotate(80deg) brightness(0.9)";
    case "cyberpunk": return "contrast(1.2) saturate(1.5) hue-rotate(280deg) brightness(1.1)";
    case "rainbow": return "saturate(1.8) hue-rotate(20deg)";
    default: return "";
  }
}

function filterFx(f: FilterKind): { anchor: "face" | "screen"; render: () => React.ReactNode; transform?: string } {
  switch (f) {
    case "sunglasses":
      return {
        anchor: "face",
        render: () => (
          <svg viewBox="0 0 100 30" className="h-full w-full">
            <defs>
              <linearGradient id="lens" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#1f2937" />
                <stop offset="1" stopColor="#000" />
              </linearGradient>
            </defs>
            <ellipse cx="25" cy="15" rx="20" ry="11" fill="url(#lens)" stroke="#111" strokeWidth="2" />
            <ellipse cx="75" cy="15" rx="20" ry="11" fill="url(#lens)" stroke="#111" strokeWidth="2" />
            <line x1="45" y1="15" x2="55" y2="15" stroke="#111" strokeWidth="3" />
            <ellipse cx="20" cy="11" rx="3" ry="2" fill="rgba(255,255,255,0.4)" />
            <ellipse cx="70" cy="11" rx="3" ry="2" fill="rgba(255,255,255,0.4)" />
          </svg>
        ),
      };
    case "halo":
      return {
        anchor: "face",
        transform: "translate(-50%, -130%)",
        render: () => (
          <svg viewBox="0 0 200 60" className="h-[40%] w-full">
            <defs>
              <linearGradient id="halo" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#fde68a" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fde68a" stopOpacity="1" />
                <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="30" rx="92" ry="14" fill="none" stroke="url(#halo)" strokeWidth="6" />
            <ellipse cx="100" cy="30" rx="96" ry="18" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.4" />
          </svg>
        ),
      };
    case "crown":
      return {
        anchor: "face",
        transform: "translate(-50%, -120%)",
        render: () => (
          <svg viewBox="0 0 100 50" className="h-[50%] w-full">
            <polygon points="10,40 25,15 40,30 50,8 60,30 75,15 90,40" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
            <circle cx="25" cy="15" r="3" fill="#ef4444" />
            <circle cx="50" cy="8" r="3" fill="#3b82f6" />
            <circle cx="75" cy="15" r="3" fill="#10b981" />
            <rect x="10" y="38" width="80" height="6" fill="#92400e" />
          </svg>
        ),
      };
    case "dog_ears":
      return {
        anchor: "face",
        transform: "translate(-50%, -85%)",
        render: () => (
          <svg viewBox="0 0 200 100" className="h-[50%] w-full">
            <path d="M20,80 Q15,30 50,20 Q60,50 50,80 Z" fill="#8b5cf6" stroke="#4c1d95" strokeWidth="2" />
            <path d="M180,80 Q185,30 150,20 Q140,50 150,80 Z" fill="#8b5cf6" stroke="#4c1d95" strokeWidth="2" />
            <path d="M25,75 Q22,40 45,30 Q52,55 50,75 Z" fill="#a78bfa" />
            <path d="M175,75 Q178,40 155,30 Q148,55 150,75 Z" fill="#a78bfa" />
          </svg>
        ),
      };
    case "mustache":
      return {
        anchor: "face",
        transform: "translate(-50%, 30%)",
        render: () => (
          <svg viewBox="0 0 100 30" className="h-[20%] w-full">
            <path d="M10,15 Q15,5 35,12 Q50,18 65,12 Q85,5 90,15 Q80,28 50,22 Q20,28 10,15 Z" fill="#1f2937" stroke="#000" strokeWidth="1" />
            <path d="M15,15 Q20,12 30,14 M85,15 Q80,12 70,14" stroke="#000" strokeWidth="1" fill="none" />
          </svg>
        ),
      };
    case "fire_breath":
      return {
        anchor: "face",
        transform: "translate(-30%, 60%)",
        render: () => (
          <div className="relative h-[80%] w-[80%]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="absolute left-0 top-0 h-full w-full"
                style={{
                  background: "radial-gradient(ellipse at 0% 50%, rgba(255,100,0,0.95) 0%, rgba(255,200,0,0.7) 30%, rgba(255,80,0,0) 60%)",
                  filter: "blur(8px)",
                  animation: `ar-fire-${i} 1.${i + 2}s ease-out infinite`,
                  animationDelay: `${i * 120}ms`,
                  mixBlendMode: "screen",
                }}
              />
            ))}
          </div>
        ),
      };
    case "rainbow":
      return {
        anchor: "screen",
        render: () => (
          <>
            <div className="absolute inset-x-0 top-0 h-1/3 opacity-30"
                 style={{ background: "linear-gradient(180deg, rgba(255,0,0,0.4) 0%, transparent 100%)" }} />
            <div className="absolute inset-x-0 top-1/3 h-1/3 opacity-30"
                 style={{ background: "linear-gradient(180deg, rgba(0,255,0,0.4) 0%, transparent 100%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 opacity-30"
                 style={{ background: "linear-gradient(0deg, rgba(0,0,255,0.4) 0%, transparent 100%)" }} />
          </>
        ),
      };
    case "vhs":
      return {
        anchor: "screen",
        render: () => (
          <>
            <div className="absolute inset-0 pointer-events-none"
                 style={{
                   background: "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0) 4px)",
                   mixBlendMode: "multiply",
                 }} />
            <div className="absolute inset-x-0 h-1/3 animate-pulse"
                 style={{
                   top: "20%",
                   background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)",
                 }} />
          </>
        ),
      };
    case "matrix":
      return {
        anchor: "screen",
        render: () => (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 animate-matrix-fall font-mono text-[10px] leading-none text-emerald-400/40">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="whitespace-nowrap" style={{ animation: `matrix-col ${3 + Math.random() * 4}s linear infinite`, animationDelay: `${Math.random() * 3}s` }}>
                  {Array.from({ length: 60 }).map((__, j) => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join("")}
                </div>
              ))}
            </div>
          </div>
        ),
      };
    case "cyberpunk":
      return {
        anchor: "screen",
        render: () => (
          <>
            <div className="absolute inset-0 pointer-events-none"
                 style={{ boxShadow: "inset 0 0 80px rgba(236, 72, 153, 0.4), inset 0 0 160px rgba(56, 189, 248, 0.3)" }} />
            <div className="absolute inset-x-0 top-1/4 h-px bg-cyan-400/40" />
            <div className="absolute inset-x-0 bottom-1/4 h-px bg-fuchsia-400/40" />
          </>
        ),
      };
    default:
      return { anchor: "screen", render: () => null };
  }
}

function normalizeBox(box: any): FaceBox {
  // Native FaceDetector returns DOMRectReadOnly with x/y/width/height
  if (box && typeof box.width === "number") {
    return { x: box.x / 1000, y: box.y / 1000, w: box.width / 1000, h: box.height / 1000 };
  }
  // Heuristic returns normalized {x, y, w, h}
  return box;
}

async function makeHeuristicDetector(stream: MediaStream) {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play().catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no ctx");

  return {
    detect: async () => {
      if (!ctx || video.readyState < 2) return [];
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Crude skin tone detection in YCbCr-ish space
      let sumX = 0, sumY = 0, count = 0, minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const i = (y * canvas.width + x) * 4;
          const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
          // Loose skin tone: R > 95, G > 40, B > 20, R > G > B
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.max(r, g, b) - Math.min(r, g, b) > 15) {
            sumX += x; sumY += y; count++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (count < 80) return [];
      const cx = sumX / count, cy = sumY / count;
      const w = (maxX - minX) / canvas.width;
      const h = (maxY - minY) / canvas.height;
      // Translate to overlay coords (assume overlay covers the video element 1:1)
      return [{ x: cx / canvas.width - w / 2, y: cy / canvas.height - h / 2, w, h }];
    },
  };
}

export function ARFilterPicker({ filter, onFilterChange }: { filter: FilterKind; onFilterChange: (f: FilterKind) => void }) {
  const filters: { id: FilterKind; label: string; icon: React.ReactNode }[] = [
    { id: "none", label: "None", icon: <Icon.Close size={11} /> },
    { id: "sunglasses", label: "Shades", icon: <Icon.Eye size={11} /> },
    { id: "halo", label: "Halo", icon: <span className="text-[10px]">😇</span> },
    { id: "crown", label: "Crown", icon: <Icon.Crown size={11} /> },
    { id: "dog_ears", label: "Dog", icon: <span className="text-[10px]">🐶</span> },
    { id: "mustache", label: "Stache", icon: <span className="text-[10px]">👨</span> },
    { id: "fire_breath", label: "Fire", icon: <span className="text-[10px]">🔥</span> },
    { id: "rainbow", label: "Rainbow", icon: <span className="text-[10px]">🌈</span> },
    { id: "vhs", label: "VHS", icon: <span className="text-[10px]">📼</span> },
    { id: "matrix", label: "Matrix", icon: <span className="text-[10px]">🟢</span> },
    { id: "cyberpunk", label: "Cyber", icon: <span className="text-[10px]">🦾</span> },
  ];

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-xl animate-scaleIn">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all " +
            (filter === f.id
              ? "bg-white/15 text-white"
              : "text-white/50 hover:bg-white/8 hover:text-white")
          }
          title={f.label}
        >
          {f.icon}
          <span className="hidden sm:inline">{f.label}</span>
        </button>
      ))}
    </div>
  );
}