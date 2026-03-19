"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState as LKState, Track } from "livekit-client";
import { Icon } from "../../components/Icons";

type Stats = {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  resolution: string;
  frameRate: number;
};

export function NetworkStats() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({ bitrate: 0, packetLoss: 0, jitter: 0, resolution: "—", frameRate: 0 });
  const { localParticipant } = useLocalParticipant();
  const connState = useConnectionState();

  useEffect(() => {
    if (!localParticipant) return;
    const t = setInterval(async () => {
      try {
        const pub = localParticipant.getTrackPublication(Track.Source.Camera as any);
        const videoTrack = pub?.videoTrack;
        const audioTrack = pub?.audioTrack;

        let bitrate = 0;
        let packetLoss = 0;
        let jitter = 0;
        let resolution = "—";
        let frameRate = 0;

        if (videoTrack && (videoTrack as any).sender) {
          const rtc = await (videoTrack as any).sender.getStats();
          rtc.forEach((r: any) => {
            if (r.type === "outbound-rtp" && r.kind === "video") {
              bitrate += (r.bytesSent || 0) * 8 / 1000;
              packetLoss = r.packetsLost || 0;
              if (r.framesPerSecond) frameRate = Math.round(r.framesPerSecond);
            }
          });
        }
        if (audioTrack && (audioTrack as any).sender) {
          const rtc = await (audioTrack as any).sender.getStats();
          rtc.forEach((r: any) => {
            if (r.type === "outbound-rtp" && r.kind === "audio") {
              bitrate += (r.bytesSent || 0) * 8 / 1000;
              jitter = r.jitter || 0;
            }
          });
        }
        setStats({ bitrate: Math.round(bitrate), packetLoss, jitter: Math.round(jitter * 1000), resolution, frameRate });
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [localParticipant]);

  const qualityLabel =
    connState === LKState.Connected ? "Good"
    : connState === LKState.Connecting ? "Connecting..."
    : connState === LKState.Reconnecting ? "Reconnecting..."
    : "Disconnected";

  const qualityColor =
    connState === LKState.Connected ? "text-green-400"
    : connState === LKState.Connecting ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/50 backdrop-blur-sm hover:bg-black/70 hover:text-white/70 transition-colors"
        title="Network stats"
      >
        <Icon.Wifi size={10} />
        <span className={qualityColor}>{qualityLabel}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-3 text-xs shadow-2xl backdrop-blur-xl">
          <div className="mb-2 font-medium text-white/70">Connection</div>
          <Row k="State" v={connState} />
          <Row k="Bitrate" v={`${stats.bitrate} kbps`} />
          <Row k="Packet loss" v={`${stats.packetLoss}`} />
          <Row k="Jitter" v={`${stats.jitter} ms`} />
          <Row k="Frame rate" v={`${stats.frameRate} fps`} />
          <p className="mt-2 text-[10px] text-white/25">
            Updates every 1.5s · auto-adjusts on poor network
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 py-1.5">
      <span className="text-white/35">{k}</span>
      <span className="text-white/70">{v}</span>
    </div>
  );
}
