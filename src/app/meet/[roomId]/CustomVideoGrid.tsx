"use client";

// Custom video grid — tile/stage views with active speaker highlight
// Cleaner than LiveKit's default

import { useEffect, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track, Room, RoomEvent, Participant, RemoteParticipant } from "livekit-client";
import { Icon } from "../../components/Icons";

export function CustomVideoGrid({ viewMode, userName }: { viewMode: "tile" | "stage"; userName: string }) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const all = [localParticipant, ...remotes].filter(Boolean);

  // Active speaker tracking
  const [activeSid, setActiveSid] = useState<string | null>(null);

  useEffect(() => {
    const room = (localParticipant as any)?.room as Room | undefined;
    if (!room) return;
    const onActiveSpeakers = (speakers: Participant[]) => {
      if (speakers.length > 0) setActiveSid(speakers[0].sid);
    };
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers);
    };
  }, [localParticipant]);

  if (!all.length) {
    return <EmptyState />;
  }

  const stage = viewMode === "stage" && all.length > 1 ? all[0] : null;

  return (
    <div className="h-full w-full p-4">
      {stage ? (
        <StageView stage={stage} others={all.slice(1)} userName={userName} activeSid={activeSid} />
      ) : (
        <TileView all={all} userName={userName} activeSid={activeSid} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <div className="animate-fadeIn">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/5">
          <Icon.Users size={28} className="text-white/40" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white/80">Waiting for others to join</h3>
        <p className="mt-1 text-sm text-white/40">Share the code or link to invite people</p>
      </div>
    </div>
  );
}

function TileView({ all, userName, activeSid }: { all: any[]; userName: string; activeSid: string | null }) {
  return (
    <div className={"grid h-full w-full gap-3 " + getGridClass(all.length)}>
      {all.map((p) => (
        <ParticipantTile
          key={p.sid || p.identity}
          participant={p}
          isLocal={p.isLocal || p.identity === userName}
          isSpeaking={activeSid === p.sid}
        />
      ))}
    </div>
  );
}

function StageView({ stage, others, userName, activeSid }: { stage: any; others: any[]; userName: string; activeSid: string | null }) {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex-1 min-h-0">
        <ParticipantTile participant={stage} isLocal={false} isSpeaking={activeSid === stage.sid} large />
      </div>
      {others.length > 0 && (
        <div className="flex h-24 gap-2 overflow-x-auto pb-1">
          {others.map((p) => (
            <div key={p.sid || p.identity} className="h-24 w-32 shrink-0">
              <ParticipantTile participant={p} isLocal={p.identity === userName} isSpeaking={activeSid === p.sid} />
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

function ParticipantTile({ participant, isLocal, isSpeaking, large }: { participant: any; isLocal: boolean; isSpeaking?: boolean; large?: boolean }) {
  const [hasVideo, setHasVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subscribe to camera track
  useEffect(() => {
    if (!participant) return;
    let camPub: any = null;
    let micPub: any = null;
    try {
      camPub = participant.getTrackPublication?.(Track.Source.Camera);
      micPub = participant.getTrackPublication?.(Track.Source.Microphone);
      if (camPub?.track) {
        camPub.track.attach(videoRef.current);
        setHasVideo(!camPub.track.isMuted);
        camPub.track.on("muted", () => setHasVideo(false));
        camPub.track.on("unmuted", () => setHasVideo(true));
      }
      if (micPub) setIsMuted(!!micPub.isMuted);
    } catch {}
    return () => {
      try { camPub?.track?.detach(videoRef.current); } catch {}
    };
  }, [participant]);

  const name = participant.name || participant.identity || "User";
  const initials = name[0]?.toUpperCase() || "?";

  return (
    <div
      className={
        "relative overflow-hidden rounded-xl border bg-[#15151b] transition-all " +
        (isSpeaking
          ? "border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.3)]"
          : "border-white/10") +
        " " +
        (large ? "" : "aspect-video")
      }
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={"h-full w-full object-cover " + (hasVideo ? "" : "hidden")}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a25] to-[#0a0a0f]">
          <div
            className="grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {initials}
          </div>
        </div>
      )}

      {/* Speaking indicator overlay */}
      {isSpeaking && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-green-400/60" />
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "h-2 w-2 rounded-full " +
              (isSpeaking ? "bg-green-400 animate-pulse" : isMuted ? "bg-red-400" : "bg-white/40")
            }
          />
          <span className="text-xs font-medium text-white drop-shadow">
            {name}{isLocal && " (You)"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMuted && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-red-500/80">
              <Icon.MicOff size={10} className="text-white" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
