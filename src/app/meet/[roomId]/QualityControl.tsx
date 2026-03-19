"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState as LKState, Track } from "livekit-client";

type Quality = "auto" | "low" | "medium" | "high" | "audio-only";

export function QualityControl() {
  const [quality, setQuality] = useState<Quality>("auto");
  const { localParticipant } = useLocalParticipant();
  const connState = useConnectionState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    const track = localParticipant.getTrackPublication(Track.Source.Camera as any)?.videoTrack;
    if (!track) return;

    const effective: Exclude<Quality, "auto"> =
      quality === "auto"
        ? (connState === LKState.Connected
            ? "high"
            : connState === LKState.Connecting
            ? "medium"
            : connState === LKState.Reconnecting
            ? "low"
            : "audio-only")
        : quality;

    const layers =
      effective === "audio-only" ? [] :
      effective === "low" ? ["q"] :
      effective === "medium" ? ["q", "h"] :
      ["q", "h", "f"];

    try {
      (track as any).setPublishingLayers?.(layers);
      (track as any).setPublishingQuality?.(effective);
      if (effective === "audio-only") {
        track.mute();
      } else {
        track.unmute();
      }
    } catch (e) {
      console.warn("Quality set failed:", e);
    }
  }, [quality, localParticipant, connState]);

  const isLowQuality = connState === LKState.Reconnecting || connState === LKState.Disconnected;
  const qualityLabel =
    quality === "auto"
      ? `Auto ${connState === LKState.Connected ? "HD" : isLowQuality ? "Low" : "SD"}`
      : quality === "audio-only" ? "Audio"
      : quality === "low" ? "180p"
      : quality === "medium" ? "360p"
      : "720p";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Click to change quality"
        className={
          "flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] backdrop-blur-sm transition-colors " +
          (quality === "audio-only" || isLowQuality
            ? "text-amber-400 hover:bg-amber-500/10"
            : "text-white/50 hover:bg-black/70 hover:text-white/70")
        }
      >
        {qualityLabel}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-2 text-xs shadow-2xl backdrop-blur-xl">
          <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-white/30">Quality</div>
          {(["auto", "high", "medium", "low", "audio-only"] as Quality[]).map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q);
                setOpen(false);
              }}
              className={
                "block w-full rounded-lg px-2 py-1.5 text-left transition-colors " +
                (quality === q ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/70")
              }
            >
              {q === "auto" ? "Auto (recommended)" :
               q === "audio-only" ? "Audio only" :
               q === "low" ? "Low — 180p" :
               q === "medium" ? "SD — 360p" :
               "HD — 720p"}
            </button>
          ))}
          <p className="mt-1 border-t border-white/5 px-2 pt-1 text-[10px] text-white/25">
            Auto-adjusts to your network
          </p>
        </div>
      )}
    </div>
  );
}
