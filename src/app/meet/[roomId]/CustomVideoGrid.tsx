"use client";

// Custom video grid — tile/stage views with:
// - Active speaker ring + audio waves
// - Per-participant hover quick-actions (mute/pin/spotlight)
// - Picture-in-picture for self-view
// - Touch-up filter for self
// - Better empty/connecting states
//
// Aesthetic notes:
// - Tiles use a layered gradient border that animates on speak/spotlight
// - Name pill is glass + glow + per-participant accent color
// - Active speaker gets an emerald ring + breathing glow
// - Spotlight gets an amber ring + star icon
// - Hover reveals a translucent toolbar that doesn't move tile content

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track, Room, RoomEvent, RemoteParticipant } from "livekit-client";
import { Icon } from "../../components/Icons";
import { AudioWave } from "../../components/AudioWave";

// Reactive accessor: returns the participant's publication for a given source
function useTrackRef(participant: any, source: Track.Source) {
  const all = useTracks([source], { onlySubscribed: false });
  if (!participant) return null;
  return all.find((t) => {
    const p = (t as any).participant;
    return p && p.sid === participant.sid;
  })?.publication ?? null;
}

type Background = "none" | "blur" | "sunset" | "office" | "forest" | "beach";

// Per-identity accent color so each tile has a distinct feel
function accentFor(id: string): string {
  const palette = [
    ["#6366f1", "#a855f7"],
    ["#ec4899", "#f59e0b"],
    ["#10b981", "#06b6d4"],
    ["#f97316", "#ec4899"],
    ["#3b82f6", "#8b5cf6"],
    ["#ef4444", "#f59e0b"],
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length].join(" → ");
}

export function CustomVideoGrid({
  viewMode, userName, background = "none", touchUp = false,
  spotlightSid, onSpotlight, isAdmin, identity, roomId,
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
  const all = useMemo(
    () => [localParticipant, ...remotes].filter(Boolean) as any[],
    [localParticipant, remotes]
  );

  const [activeSid, setActiveSid] = useState<string | null>(null);

  useEffect(() => {
    const room = (localParticipant as any)?.room as Room | undefined;
    if (!room) return;
    const onActiveSpeakers = (speakers: any[]) => {
      setActiveSid(speakers.length > 0 ? speakers[0].sid : null);
    };
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers);
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers); };
  }, [localParticipant]);

  if (!all.length) return <EmptyState />;

  const stage = viewMode === "stage" && all.length > 1 ? all[0] : null;

  return (
    <div className="h-full w-full p-3 sm:p-4">
      {stage ? (
        <StageView
          stage={stage}
          others={all.slice(1)}
          userName={userName}
          activeSid={activeSid}
          spotlightSid={spotlightSid ?? null}
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
          spotlightSid={spotlightSid ?? null}
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
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-white/8 to-white/3 ring-1 ring-white/10 animate-pulse">
          <Icon.Users size={28} className="text-white/40" />
        </div>
        <h3 className="text-lg font-medium text-white/70">
          Waiting for others to join
        </h3>
        <p className="mt-1 text-sm text-white/35">
          Share the code or link to invite people
        </p>
      </div>
    </div>
  );
}

function TileView(props: any) {
  return (
    <div
      className={"grid h-full w-full gap-2 sm:gap-3 " + getGridClass(props.all.length)}
    >
      {props.all.map((p: any) => (
        <ParticipantTile
          key={p.sid || p.identity}
          participant={p}
          isLocal={p.isLocal || p.identity === props.userName}
          isAdmin={props.isAdmin}
          identity={props.identity}
          roomId={props.roomId}
          onSpotlight={props.onSpotlight}
          background={props.background}
          touchUp={props.touchUp && (p.isLocal || p.identity === props.userName)}
          activeSid={props.activeSid}
          spotlightSid={props.spotlightSid}
        />
      ))}
    </div>
  );
}

function StageView(props: any) {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex-1 min-h-0">
        <ParticipantTile
          participant={props.stage}
          isLocal={props.stage.isLocal || props.stage.identity === props.userName}
          isAdmin={props.isAdmin}
          identity={props.identity}
          roomId={props.roomId}
          onSpotlight={props.onSpotlight}
          background={props.background}
          touchUp={props.touchUp && props.stage.isLocal}
          large
          activeSid={props.activeSid}
          spotlightSid={props.spotlightSid}
        />
      </div>
      {props.others.length > 0 && (
        <div className="flex h-24 sm:h-28 gap-2 overflow-x-auto pb-1 px-1 snap-x">
          {props.others.map((p: any) => (
            <div
              key={p.sid || p.identity}
              className="h-24 sm:h-28 w-32 sm:w-36 shrink-0 snap-start"
            >
              <ParticipantTile
                participant={p}
                isLocal={p.isLocal || p.identity === props.userName}
                isAdmin={props.isAdmin}
                identity={props.identity}
                roomId={props.roomId}
                onSpotlight={props.onSpotlight}
                background={props.background}
                touchUp={false}
                activeSid={props.activeSid}
                spotlightSid={props.spotlightSid}
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
    sunset: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)",
    office: "linear-gradient(135deg, #475569 0%, #94a3b8 50%, #cbd5e1 100%)",
    forest: "linear-gradient(135deg, #064e3b 0%, #10b981 60%, #84cc16 100%)",
    beach: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #fde68a 100%)",
  };
  return (
    <div
      className="absolute inset-0"
      style={{ background: gradients[background] ?? gradients.sunset }}
    >
      {children}
    </div>
  );
}

const ParticipantTile = memo(function ParticipantTile({
  participant,
  isLocal,
  isAdmin,
  identity,
  roomId,
  onSpotlight,
  background,
  touchUp,
  large,
  activeSid,
  spotlightSid,
}: {
  participant: any;
  isLocal: boolean;
  isAdmin?: boolean;
  identity?: string;
  roomId?: string;
  onSpotlight?: (sid: string | null) => void;
  background?: Background;
  touchUp?: boolean;
  large?: boolean;
  activeSid?: string | null;
  spotlightSid?: string | null;
}) {
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachedTrackRef = useRef<any>(null);

  const isSpeaking = activeSid != null && activeSid === (participant as any)?.sid;
  const isSpotlighted = spotlightSid != null && spotlightSid === (participant as any)?.sid;

  const room: Room | undefined = (participant as any)?.room;
  const cameraPub = useTrackRef(participant, Track.Source.Camera);
  const micPub = useTrackRef(participant, Track.Source.Microphone);

  useEffect(() => {
    const el = videoRef.current;
    const track: any = cameraPub?.track;
    if (!el || !track) return;
    if (attachedTrackRef.current && attachedTrackRef.current !== track) {
      try { attachedTrackRef.current.detach(el); } catch {}
      attachedTrackRef.current = null;
    }
    try {
      track.attach(el);
      attachedTrackRef.current = track;
      setHasVideo(!track.isMuted);
      const onMuted = () => setHasVideo(false);
      const onUnmuted = () => setHasVideo(true);
      track.on("muted", onMuted);
      track.on("unmuted", onUnmuted);
      try {
        el.muted = true;
        el.play().catch(() => {});
      } catch {}
      return () => {
        try { track.detach(el); } catch {}
        track.off("muted", onMuted);
        track.off("unmuted", onUnmuted);
        if (attachedTrackRef.current === track) attachedTrackRef.current = null;
      };
    } catch {}
  }, [cameraPub]);

  useEffect(() => {
    if (!room || !participant) return;
    const targetSid = participant.sid;
    const el = videoRef.current;
    if (!el) return;

    function tryAttach(track: any) {
      if (!track || track.source !== Track.Source.Camera) return;
      if (attachedTrackRef.current === track) return;
      try {
        track.attach(el);
        attachedTrackRef.current = track;
        setHasVideo(!track.isMuted);
        track.on("muted", () => setHasVideo(false));
        track.on("unmuted", () => setHasVideo(true));
        if (el) {
          el.muted = true;
          el.play().catch(() => {});
        }
      } catch {}
    }

    const onLocalPublished = (pub: any) => {
      if (pub?.track?.source !== Track.Source.Camera) return;
      tryAttach(pub.track);
    };
    const onSubscribed = (track: any, _pub: any) => {
      const p = (track as any)?.publisher;
      if (!p || p.sid !== targetSid) return;
      tryAttach(track);
    };
    const onUnpublished = (pub: any) => {
      if (attachedTrackRef.current && pub?.track === attachedTrackRef.current) {
        if (el) try { attachedTrackRef.current.detach(el); } catch {}
        attachedTrackRef.current = null;
        setHasVideo(false);
      }
    };

    room.on(RoomEvent.LocalTrackPublished, onLocalPublished);
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnpublished, onUnpublished);

    try {
      const pubs = participant.trackPublications;
      if (pubs) for (const pub of pubs.values()) if (pub?.track) tryAttach(pub.track);
    } catch {}

    return () => {
      room.off(RoomEvent.LocalTrackPublished, onLocalPublished);
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
      room.off(RoomEvent.TrackUnpublished, onUnpublished);
    };
  }, [room, participant]);

  useEffect(() => {
    const track: any = micPub?.track;
    if (micPub) {
      const muted = !!micPub.isMuted || track?.isMuted === true;
      setIsMuted(muted);
      const onMuted = () => setIsMuted(true);
      const onUnmuted = () => setIsMuted(false);
      micPub.on?.("muted", onMuted);
      micPub.on?.("unmuted", onUnmuted);
      return () => {
        micPub.off?.("muted", onMuted);
        micPub.off?.("unmuted", onUnmuted);
      };
    } else {
      setIsMuted(true);
    }
  }, [micPub]);

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
  const accent = accentFor(participant?.identity ?? name);

  // Build the outer ring class
  const ringState = isSpeaking
    ? "ring-2 ring-emerald-400/90 shadow-[0_0_36px_rgba(16,185,129,0.45)]"
    : isSpotlighted
      ? "ring-2 ring-amber-300/90 shadow-[0_0_28px_rgba(252,211,77,0.4)]"
      : "ring-1 ring-white/8 hover:ring-white/20";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        "group relative overflow-hidden rounded-2xl transition-all duration-300 " +
        ringState +
        " " +
        (large ? "" : "aspect-video") +
        " bg-gradient-to-br from-[#15151e] via-[#0d0d14] to-[#08080d]"
      }
    >
      {/* Subtle per-tile accent glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at top right, ${accent.split(" → ")[0]}33, transparent 60%)`,
          opacity: isSpeaking ? 0.6 : 0.3,
        }}
      />

      <BackgroundStyle background={isLocal ? background : undefined}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          data-lk-local={isLocal ? "true" : undefined}
          data-lk-participant={participant?.identity}
          className={
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " +
            (hasVideo ? "opacity-100" : "opacity-0") +
            (touchUp ? " contrast-[1.05] saturate-[1.15] brightness-[1.04]" : "")
          }
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Soft glow behind avatar */}
              <div
                className="absolute inset-0 -m-12 rounded-full blur-2xl opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${accent.split(" → ")[0]}, ${accent.split(" → ")[1]})`,
                }}
              />
              <div
                className="relative grid place-items-center rounded-full text-2xl sm:text-3xl font-bold text-white shadow-2xl ring-4 ring-white/10"
                style={{
                  width: large ? 112 : 80,
                  height: large ? 112 : 80,
                  background: `linear-gradient(135deg, ${accent})`,
                }}
              >
                {initials}
              </div>
            </div>
          </div>
        )}
      </BackgroundStyle>

      {/* Active speaker audio waves overlay */}
      {isSpeaking && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-1 backdrop-blur-sm ring-1 ring-emerald-400/30">
          <AudioWave bars={4} className="h-3 text-emerald-300" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-200">Speaking</span>
        </div>
      )}

      {/* Spotlight badge */}
      {isSpotlighted && !isSpeaking && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-1 backdrop-blur-sm ring-1 ring-amber-300/30">
          <Icon.Star size={9} className="text-amber-200" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-100">Spotlight</span>
        </div>
      )}

      {/* Hover quick-actions — admin only, for other participants */}
      {isAdmin && isOtherParticipant && hovered && (
        <div className="absolute top-3 right-3 z-20 flex gap-1 rounded-xl border border-white/10 bg-black/70 p-1 backdrop-blur-xl animate-fadeIn shadow-2xl">
          <button
            onClick={() => act("mute")}
            title="Mute"
            className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Icon.MicOff size={13} />
          </button>
          <button
            onClick={() => onSpotlight?.((participant as any).sid)}
            title="Spotlight"
            className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Icon.Star size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${name}?`)) act("kick");
            }}
            title="Remove"
            className="grid h-7 w-7 place-items-center rounded-md text-red-300/80 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <Icon.Trash size={13} />
          </button>
        </div>
      )}

      {/* Bottom name bar — glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 py-2.5 pt-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative inline-flex h-2 w-2 shrink-0">
            {isSpeaking && (
              <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-emerald-400 opacity-70" />
            )}
            <span
              className={
                "relative inline-block h-2 w-2 rounded-full " +
                (isSpeaking
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]"
                  : isMuted
                    ? "bg-red-400"
                    : "bg-white/40")
              }
            />
          </span>
          <span className="truncate text-[12px] font-semibold text-white/95 drop-shadow">
            {name}{isLocal && <span className="ml-1.5 text-[10px] font-medium text-white/60">· you</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isMuted && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-red-500/85 backdrop-blur-sm shadow-sm">
              <Icon.MicOff size={10} className="text-white" />
            </span>
          )}
          {touchUp && (
            <span
              className="grid h-5 w-5 place-items-center rounded-full backdrop-blur-sm shadow-sm"
              style={{ background: "color-mix(in srgb, var(--accent) 60%, transparent)" }}
              title="Touch-up on"
            >
              <Icon.Sparkles size={10} className="text-white" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.participant === next.participant &&
    prev.isLocal === next.isLocal &&
    prev.activeSid === next.activeSid &&
    prev.spotlightSid === next.spotlightSid &&
    prev.isAdmin === next.isAdmin &&
    prev.identity === next.identity &&
    prev.roomId === next.roomId &&
    prev.large === next.large &&
    prev.background === next.background &&
    prev.touchUp === next.touchUp
  );
});