"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState as LKState } from "livekit-client";

type Quality = "auto" | "low" | "medium" | "high" | "audio-only";

export function QualityControl() {
  const [quality, setQuality] = useState<Quality>("auto");
  const { localParticipant } = useLocalParticipant();
  const connState = useConnectionState();
  const [autoMode, setAutoMode] = useState(true);

  // Apply quality settings to the local video track
  useEffect(() => {
    if (!localParticipant) return;
    const track = localParticipant.getTrackPublication()?.videoTrack;
    if (!track) return;

    // Map connection state → quality
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

    // Set simulcast layers
    const layers =
      effective === "audio-only" ? [] :
      effective === "low" ? ["q"] :
      effective === "medium" ? ["q", "h"] :
      ["q", "h", "f"]; // high: all layers

    try {
      (track as any).setPublishingLayers?.(layers);
      (track as any).setPublishingQuality?.(effective);
      // Mute video entirely for audio-only
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
      ? `Auto (${connState === LKState.Connected ? "HD" : isLowQuality ? "low" : "SD"})`
      : quality === "audio-only" ? "Audio only"
      : quality === "low" ? "Low (180p)"
      : quality === "medium" ? "SD (360p)"
      : "HD (720p)";

  return (
    <div className="relative">
      <button
        onClick={() => setAutoMode((v) => !v)}
        title="Click to change quality"
        className={
          "rounded-md px-2.5 py-1 text-xs " +
          (quality === "audio-only" || isLowQuality
            ? "bg-yellow-900/40 text-yellow-300 border border-yellow-700"
            : "border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700")
        }
      >
        {qualityLabel}
      </button>
      {autoMode && (
        <div className="absolute bottom-full right-0 mb-1 w-48 rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs shadow-xl">
          <div className="mb-1 px-1 text-[10px] uppercase tracking-wide text-gray-500">Quality</div>
          {(["auto", "high", "medium", "low", "audio-only"] as Quality[]).map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q);
                setAutoMode(false);
                if (q === "auto") setAutoMode(true);
              }}
              className={
                "block w-full rounded px-2 py-1 text-left hover:bg-gray-800 " +
                (quality === q ? "bg-gray-800 text-white" : "text-gray-300")
              }
            >
              {q === "auto" ? "Auto (recommended)" :
               q === "audio-only" ? "Audio only (lowest)" :
               q === "low" ? "Low — 180p" :
               q === "medium" ? "SD — 360p" :
               "HD — 720p"}
            </button>
          ))}
          <p className="mt-1 border-t border-gray-800 px-1 pt-1 text-[10px] text-gray-500">
            Auto-adjusts to your network
          </p>
        </div>
      )}
    </div>
  );
}