"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState as LKState } from "livekit-client";

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
        const pub = localParticipant.getTrackPublication();
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

  // Use connection state as a proxy for quality
  const qualityIcon =
    connState === LKState.Connected ? "●●●●"
    : connState === LKState.Connecting ? "●●●○"
    : connState === LKState.Reconnecting ? "●●○○"
    : "●○○○";

  const qualityColor =
    connState === LKState.Connected ? "text-green-400"
    : connState === LKState.Connecting ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs hover:bg-gray-700"
        title="Network stats"
      >
        <span className={qualityColor}>{qualityIcon}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-64 rounded-lg border border-gray-700 bg-gray-950 p-3 text-xs shadow-xl">
          <div className="mb-2 font-medium">Connection</div>
          <Row k="State" v={connState} />
          <Row k="Bitrate" v={`${stats.bitrate} kbps`} />
          <Row k="Packet loss" v={`${stats.packetLoss}`} />
          <Row k="Jitter" v={`${stats.jitter} ms`} />
          <Row k="Frame rate" v={`${stats.frameRate} fps`} />
          <p className="mt-2 text-[10px] text-gray-500">
            Updates every 1.5s · auto-adjusts on poor network
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-t border-gray-800 py-1">
      <span className="text-gray-500">{k}</span>
      <span className={color || "text-gray-200"}>{v}</span>
    </div>
  );
}