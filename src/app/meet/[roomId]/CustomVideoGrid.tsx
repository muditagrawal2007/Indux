"use client";

// Custom video grid — tile/stage views with:
// - Active speaker ring + audio waves
// - Per-participant hover quick-actions (mute/pin/spotlight)
// - Picture-in-picture for self-view
// - Touch-up filter for self
// - Better empty/connecting states

import { useEffect, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import {
  Track,
  Room,
  RoomEvent,
  Participant,
  LocalParticipant,
} from "livekit-client";
import { Icon } from "../../components/Icons";
import { AudioWave } from "../../components/AudioWave";

type Background = "none" | "blur" | "sunset" | "office" | "forest" | "beach";

export function CustomVideoGrid({
  viewMode,
  userName,
  background = "none",
  touchUp = false,
  spotlightSid,
  onSpotlight,
  isAdmin,
  identity,
  roomId,
}: {
  viewMode: "tile" | "stage";
  userName: string;
  background?: Background;
  touchUp?: boolean;
  spotlightSid?: string | null;
  onSpotlight?: (sid: string | null) => void;
  isAdmin?: boolean;
  identity?: string;
  roomId?: string;
}) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const all = [localParticipant, ...remotes].filter(Boolean) as Participant[];

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

  if (!all.length) return <EmptyState />;

  const stage = viewMode === "stage" && all.length > 1 ? all[0] : null;

  return (
    <div className="h-full w-full p-2 sm:p-3">
      {stage ? (
        <StageView
          stage={stage}
          others={all.slice(1)}
          userName={userName}
          activeSid={activeSid}
          spotlightSid={spotlightSid}
          onSpotlight={onSpotlight}
          isAdmin={!!isAdmin}
          identity={identity ?? userName}
          roomId={roomId ?? ""}
          background={background}
          touchUp={touchUp}
        />
      ) : (
        <TileView
          all={all}
          userName={userName}
          activeSid={activeSid}
          spotlightSid={spotlightSid}
          onSpotlight={onSpotlight}
          isAdmin={!!isAdmin}
          identity={identity ?? userName}
          roomId={roomId ?? ""}
          background={background}
          touchUp={touchUp}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <div className="animate-fadeIn">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/5 animate-pulse">
          <Icon.Users size={28} className="text-white/30" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white/60">
          Waiting for others to join
        </h3>
        <p className="mt-1 text-sm text-white/30">
          Share the code or link to invite people
        </p>
      </div>
    </div>
  );
}

function TileView(props: any) {
  if (props.all.length === 1) {
    return (
      <div className="flex h-full w-full items-center justify-center p-3">
        <div className="aspect-video w-full max-w-4xl">
          <ParticipantTile
            key={props.all[0].sid || props.all[0].identity}
            participant={props.all[0]}
            isLocal={props.all[0].isLocal || props.all[0].identity === props.userName}
            isSpeaking={props.activeSid === props.all[0].sid}
            isSpotlighted={props.spotlightSid === props.all[0].sid}
            isAdmin={props.isAdmin}
            identity={props.identity}
            roomId={props.roomId}
            onSpotlight={props.onSpotlight}
            background={props.background}
            touchUp={props.touchUp && (props.all[0].isLocal || props.all[0].identity === props.userName)}
          />
        </div>
      </div>
    );
  }
  return (
    <div
      className={"grid h-full w-full gap-1.5 sm:gap-2 " + getGridClass(props.all.length)}
    >
      {props.all.map((p: any) => (
        <ParticipantTile
          key={p.sid || p.identity}
          participant={p}
          isLocal={p.isLocal || p.identity === props.userName}
          isSpeaking={props.activeSid === p.sid}
          isSpotlighted={props.spotlightSid === p.sid}
          isAdmin={props.isAdmin}
          identity={props.identity}
          roomId={props.roomId}
          onSpotlight={props.onSpotlight}
          background={props.background}
          touchUp={props.touchUp && (p.isLocal || p.identity === props.userName)}
        />
      ))}
    </div>
  );
}

function StageView(props: any) {
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex-1 min-h-0">
        <ParticipantTile
          participant={props.stage}
          isLocal={props.stage.isLocal || props.stage.identity === props.userName}
          isSpeaking={props.activeSid === props.stage.sid}
          isSpotlighted={props.spotlightSid === props.stage.sid}
          isAdmin={props.isAdmin}
          identity={props.identity}
          roomId={props.roomId}
          onSpotlight={props.onSpotlight}
          background={props.background}
          touchUp={props.touchUp && props.stage.isLocal}
          large
        />
      </div>
      {props.others.length > 0 && (
        <div className="flex h-20 sm:h-24 gap-2 overflow-x-auto pb-1">
          {props.others.map((p: any) => (
            <div
              key={p.sid || p.identity}
              className="h-20 sm:h-24 w-28 sm:w-32 shrink-0"
            >
              <ParticipantTile
                participant={p}
                isLocal={p.isLocal || p.identity === props.userName}
                isSpeaking={props.activeSid === p.sid}
                isSpotlighted={props.spotlightSid === p.sid}
                isAdmin={props.isAdmin}
                identity={props.identity}
                roomId={props.roomId}
                onSpotlight={props.onSpotlight}
                background={props.background}
                touchUp={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getGridClass(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-2 sm:grid-cols-3";
  if (n <= 9) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

function BackgroundStyle({
  background,
  children,
}: {
  background?: Background;
  children: React.ReactNode;
}) {
  if (!background || background === "none") return <>{children}</>;
  if (background === "blur") {
    return (
      <div className="absolute inset-0 backdrop-blur-3xl bg-white/5">
        {children}
      </div>
    );
  }
  const gradients: Record<string, string> = {
    sunset:
      "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)",
    office:
      "linear-gradient(135deg, #475569 0%, #94a3b8 50%, #cbd5e1 100%)",
    forest:
      "linear-gradient(135deg, #064e3b 0%, #10b981 60%, #84cc16 100%)",
    beach:
      "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #fde68a 100%)",
  };
  return (
    <div
      className="absolute inset-0"
      style={{
        background: gradients[background] ?? gradients.sunset,
      }}
    >
      {children}
    </div>
  );
}

function ParticipantTile({
  participant,
  isLocal,
  isSpeaking,
  isSpotlighted,
  isAdmin,
  identity,
  roomId,
  onSpotlight,
  background,
  touchUp,
  large,
}: {
  participant: any;
  isLocal: boolean;
  isSpeaking?: boolean;
  isSpotlighted?: boolean;
  isAdmin?: boolean;
  identity?: string;
  roomId?: string;
  onSpotlight?: (sid: string | null) => void;
  background?: Background;
  touchUp?: boolean;
  large?: boolean;
}) {
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!participant) return;
    let camPub: any = null;
    let micPub: any = null;
    let muteHandler: any;
    let unmuteHandler: any;
    let micMuteHandler: any;
    let micUnmuteHandler: any;
    try {
      camPub = participant.getTrackPublication?.(Track.Source.Camera);
      micPub = participant.getTrackPublication?.(Track.Source.Microphone);
      if (camPub?.track) {
        camPub.track.attach(videoRef.current);
        setHasVideo(!camPub.track.isMuted);
        muteHandler = () => setHasVideo(false);
        unmuteHandler = () => setHasVideo(true);
        camPub.track.on("muted", muteHandler);
        camPub.track.on("unmuted", unmuteHandler);
      }
      if (micPub) {
        setIsMuted(!!micPub.isMuted || !micPub.isMuted === undefined);
        micMuteHandler = () => setIsMuted(true);
        micUnmuteHandler = () => setIsMuted(false);
        micPub.on?.("muted", micMuteHandler);
        micPub.on?.("unmuted", micUnmuteHandler);
      } else {
        // No mic track at all → treat as muted (e.g. permission denied)
        setIsMuted(true);
      }
    } catch {}
    return () => {
      try {
        camPub?.track?.detach(videoRef.current);
        if (muteHandler) camPub?.track?.off("muted", muteHandler);
        if (unmuteHandler) camPub?.track?.off("unmuted", unmuteHandler);
      } catch {}
    };
  }, [participant]);

  const name = participant.name || participant.identity || "User";
  const initials = name[0]?.toUpperCase() || "?";

  async function act(action: string) {
    if (!roomId || !participant) return;
    await fetch(`/api/rooms/${roomId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, identity: participant.identity }),
    });
  }

  const isOtherParticipant = !isLocal;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        "group relative overflow-hidden rounded-xl transition-all duration-200 " +
        (isSpeaking
          ? "ring-2 ring-emerald-400/80 shadow-[0_0_28px_rgba(16,185,129,0.25)]"
          : isSpotlighted
            ? "ring-2 ring-amber-300/80 shadow-[0_0_24px_rgba(252,211,77,0.2)]"
            : "ring-1 ring-white/5") +
        " " +
        (large ? "" : "aspect-video") +
        " bg-[#111118]"
      }
    >
      <BackgroundStyle background={isLocal ? background : undefined}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={
            "h-full w-full object-cover transition-all duration-300 " +
            (hasVideo ? "" : "hidden") +
            (touchUp ? " contrast-[1.05] saturate-[1.15] brightness-[1.04]" : "")
          }
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a24] to-[#111118]">
            <div
              className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full text-2xl font-semibold text-white shadow-xl"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--brand-600))",
              }}
            >
              {initials}
            </div>
          </div>
        )}
      </BackgroundStyle>

      {/* Active speaker audio waves overlay */}
      {isSpeaking && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-emerald-400/20 px-2 py-1 backdrop-blur-sm">
          <AudioWave bars={4} className="h-3 text-emerald-400" />
        </div>
      )}

      {/* Spotlight badge */}
      {isSpotlighted && !isSpeaking && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-1 text-amber-200 backdrop-blur-sm">
          <Icon.Star size={11} />
          <span className="text-[9px] font-semibold uppercase tracking-wide">
            Spotlight
          </span>
        </div>
      )}

      {/* Hover quick-actions — admin only, for other participants */}
      {isAdmin && isOtherParticipant && hovered && (
        <div className="absolute top-3 left-3 z-20 flex gap-1 rounded-lg border border-white/10 bg-black/70 p-1 backdrop-blur-xl animate-fadeIn">
          <button
            onClick={() => act("mute")}
            title="Mute"
            className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Icon.MicOff size={13} />
          </button>
          <button
            onClick={() => onSpotlight?.(participant.sid)}
            title="Spotlight"
            className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Icon.Star size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${name}?`)) act("kick");
            }}
            title="Remove"
            className="grid h-7 w-7 place-items-center rounded-md text-red-300/80 hover:bg-red-500/20 hover:text-red-300"
          >
            <Icon.Trash size={13} />
          </button>
        </div>
      )}

      {/* Bottom name bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 pt-6">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "h-2 w-2 rounded-full " +
              (isSpeaking
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]"
                : isMuted
                  ? "bg-red-400"
                  : "bg-white/30")
            }
          />
          <span className="text-[11px] font-medium text-white/90 drop-shadow">
            {name}
            {isLocal && " (You)"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMuted && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-red-500/80 backdrop-blur-sm">
              <Icon.MicOff size={10} className="text-white" />
            </span>
          )}
          {touchUp && (
            <span
              className="grid h-5 w-5 place-items-center rounded-full backdrop-blur-sm"
              style={{ background: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
              title="Touch-up on"
            >
              <Icon.Sparkles size={10} className="text-white" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}