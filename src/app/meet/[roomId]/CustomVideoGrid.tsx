"use client";

// Custom video grid — no LiveKit default styles
// Renders local + remote participants in tiles
// Supports tile (grid) and stage (focused) views

import { useEffect, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Icon } from "../../components/Icons";

export function CustomVideoGrid({ viewMode, userName }: { viewMode: "tile" | "stage"; userName: string }) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const all = [localParticipant, ...remotes].filter(Boolean);
  const camTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  const stage = viewMode === "stage" && all.length > 1 ? all[0] : null;

  if (!all.length) {
    return <EmptyState />;
  }

  return (
    <div className="h-full w-full p-4">
      {stage ? (
        <StageView stage={stage} others={all.slice(1)} userName={userName} />
      ) : (
        <TileView all={all} userName={userName} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/5">
          <Icon.Users size={28} className="text-white/40" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white/80">Waiting for others to join</h3>
        <p className="mt-1 text-sm text-white/40">Share the code or link to invite people</p>
      </div>
    </div>
  );
}

function TileView({ all, userName }: { all: any[]; userName: string }) {
  return (
    <div className={
      "grid h-full w-full gap-3 " +
      getGridClass(all.length)
    }>
      {all.map((p) => (
        <ParticipantTile key={p.sid || p.identity} participant={p} isLocal={p.isLocal || p === all.find((x: any) => x.identity === userName)} />
      ))}
    </div>
  );
}

function StageView({ stage, others, userName }: { stage: any; others: any[]; userName: string }) {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex-1 min-h-0">
        <ParticipantTile participant={stage} isLocal={false} large />
      </div>
      {others.length > 0 && (
        <div className="flex h-24 gap-2 overflow-x-auto">
          {others.map((p) => (
            <div key={p.sid || p.identity} className="h-24 w-32 shrink-0">
              <ParticipantTile participant={p} isLocal={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getGridClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 2) return "grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-3";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

function ParticipantTile({ participant, isLocal, large }: { participant: any; isLocal: boolean; large?: boolean }) {
  const [hasVideo, setHasVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subscribe to camera track
  useEffect(() => {
    if (!participant) return;
    let cam: any = null;
    try {
      cam = participant.getTrackPublication?.(Track.Source.Camera)?.track;
      if (cam?.videoTrack) {
        cam.videoTrack.attach(videoRef.current);
        setHasVideo(!cam.isMuted);
      }
    } catch {}
    return () => {
      try { cam?.videoTrack?.detach(videoRef.current); } catch {}
    };
  }, [participant]);

  const name = participant.name || participant.identity || "User";
  const initials = name[0]?.toUpperCase() || "?";

  return (
    <div className={
      "relative overflow-hidden rounded-xl border border-white/10 bg-[#15151b] " +
      (large ? "" : "aspect-video")
    }>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={"h-full w-full object-cover " + (hasVideo ? "" : "hidden")}
      />
      {/* Avatar fallback */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a25] to-[#0a0a0f]">
          <div className="grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white"
               style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}>
            {initials}
          </div>
        </div>
      )}
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-white">{name}{isLocal && " (You)"}</span>
        </div>
      </div>
    </div>
  );
}

import { useRef } from "react";
