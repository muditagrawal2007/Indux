"use client";

// Live network stats — bitrate, packet loss, jitter, RTT
// Sampled every 2s from the local participant's RTC stats.

import { useEffect, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Icon } from "../../components/Icons";

type Stats = {
  bitrateKbps: number;
  packetLoss: number;
  jitter: number;
  rtt: number;
  resolution: string;
};

export function NetworkStats() {
  const { localParticipant } = useLocalParticipant();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    bitrateKbps: 0,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
    resolution: "—",
  });
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!localParticipant) return;
    let cancelled = false;
    async function sample() {
      try {
        const room = (localParticipant as any)?.room;
        if (!room) return;
        // localParticipant.connectionQuality is available; for more detail
        // we read the engine's RTC stats.
        const reports = await room.engine.client.getStats();
        let bitrate = 0;
        let loss = 0;
        let jitter = 0;
        let rtt = 0;
        let w = 0;
        let h = 0;
        for (const r of reports.values()) {
          if (r.type === "outbound-rtp" && r.kind === "video") {
            // @ts-ignore
            bitrate = (r.bytesSent ?? 0) * 8; // bits per second-ish
            // @ts-ignore
            w = r.frameWidth ?? w;
            // @ts-ignore
            h = r.frameHeight ?? h;
          }
          // @ts-ignore
          if (r.packetsLost !== undefined && r.packetsSent) {
            // @ts-ignore
            loss = (r.packetsLost / (r.packetsSent + r.packetsLost)) * 100;
          }
          // @ts-ignore
          if (r.jitter !== undefined) jitter = r.jitter * 1000;
          // @ts-ignore
          if (r.roundTripTime !== undefined) rtt = r.roundTripTime * 1000;
        }
        if (cancelled) return;
        setStats({
          bitrateKbps: Math.round(bitrate / 1000),
          packetLoss: Math.round(loss * 10) / 10,
          jitter: Math.round(jitter * 10) / 10,
          rtt: Math.round(rtt),
          resolution: w && h ? `${w}×${h}` : "—",
        });
        setHistory((h) => [...h.slice(-19), Math.round(bitrate / 1000)]);
      } catch {}
    }
    sample();
    const t = setInterval(sample, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [localParticipant]);

  const max = Math.max(...history, 100);
  const dots = history.map((v, i) => ({ v, x: (i / Math.max(1, history.length - 1)) * 100, y: 100 - (v / max) * 100 }));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/50 backdrop-blur-sm hover:bg-black/70 hover:text-white/70 transition-colors"
        title="Network stats"
      >
        <Icon.Signal size={10} />
        <span className="font-mono">{stats.bitrateKbps}k</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-3 shadow-2xl backdrop-blur-xl animate-scaleIn">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Network
            </span>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60">
              <Icon.Close size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Stat label="Bitrate" value={`${stats.bitrateKbps} kbps`} />
            <Stat label="Packet loss" value={`${stats.packetLoss}%`} highlight={stats.packetLoss > 3} />
            <Stat label="Jitter" value={`${stats.jitter} ms`} highlight={stats.jitter > 30} />
            <Stat label="RTT" value={`${stats.rtt} ms`} highlight={stats.rtt > 150} />
            <Stat label="Resolution" value={stats.resolution} fullWidth />
          </div>
          {history.length > 1 && (
            <div className="mt-3">
              <div className="text-[9px] uppercase tracking-wide text-white/30">
                Bitrate history (last 40s)
              </div>
              <svg
                className="mt-1 h-12 w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={dots.map((d) => `${d.x},${d.y}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-emerald-400"
                />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  fullWidth,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border border-white/10 bg-white/5 p-2 " +
        (fullWidth ? "col-span-2" : "") +
        (highlight ? " border-amber-400/40 bg-amber-500/10" : "")
      }
    >
      <div className="text-[9px] uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div className={"mt-0.5 font-mono " + (highlight ? "text-amber-300" : "text-white/80")}>
        {value}
      </div>
    </div>
  );
}