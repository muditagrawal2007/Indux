"use client";

// Talk time tracker — shows who has spoken for how long in the meeting.
// Uses LiveKit's ActiveSpeakersChanged event to accumulate per-participant
// speaking time. Renders a clean bar chart in a slide-in panel.

import { useEffect, useRef, useState } from "react";
import { useLocalParticipant, useRemoteParticipants, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Icon } from "../../components/Icons";

type SpeakerStats = {
  identity: string;
  name: string;
  totalSec: number;
  lastSpokeAt: number | null;
};

export function TalkTimePanel({
  open,
  onClose,
  participants,
}: {
  open: boolean;
  onClose: () => void;
  participants: { identity: string; name?: string }[];
}) {
  const room = useRoomContext();
  const [stats, setStats] = useState<Record<string, SpeakerStats>>({});
  const currentSpeakerRef = useRef<string | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!open || !room) return;
    const initial: Record<string, SpeakerStats> = {};
    for (const p of participants) {
      initial[p.identity] = {
        identity: p.identity,
        name: p.name || p.identity,
        totalSec: 0,
        lastSpokeAt: null,
      };
    }
    setStats(initial);

    const onActive = (speakers: any[]) => {
      const now = Date.now();
      const tick = Math.max(0, Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      const prevSpeaker = currentSpeakerRef.current;
      const newSpeaker = speakers[0]?.sid ?? null;

      setStats((cur) => {
        const next = { ...cur };
        if (prevSpeaker && prevSpeaker !== newSpeaker && next[prevSpeaker]) {
          next[prevSpeaker] = { ...next[prevSpeaker], totalSec: next[prevSpeaker].totalSec + tick };
        }
        if (newSpeaker && !next[newSpeaker]) {
          // remote speaker we hadn't seen — init
          const idMatch = speakers[0]?.identity ?? newSpeaker;
          next[newSpeaker] = { identity: idMatch, name: idMatch, totalSec: 0, lastSpokeAt: now };
        }
        if (newSpeaker) {
          next[newSpeaker] = { ...next[newSpeaker], lastSpokeAt: now };
        }
        return next;
      });

      currentSpeakerRef.current = newSpeaker;
    };

    room.on(RoomEvent.ActiveSpeakersChanged, onActive);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, onActive);
    };
  }, [open, room, participants]);

  if (!open) return null;

  const sorted = Object.values(stats).sort((a, b) => b.totalSec - a.totalSec);
  const max = Math.max(1, ...sorted.map((s) => s.totalSec));
  const totalSec = sorted.reduce((a, s) => a + s.totalSec, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[420px] overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#15151c] to-[#0a0a10] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-scaleIn"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
        />

        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <Icon.TrendingUp size={14} />
            </span>
            <div>
              <div className="text-sm font-semibold">Talk time</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Live · {sorted.length} speakers
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/45 hover:bg-white/[0.06] hover:text-white">
            <Icon.Close size={14} />
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/45">
            Waiting for the first speaker…
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((s, i) => {
              const pct = (s.totalSec / max) * 100;
              const share = totalSec > 0 ? (s.totalSec / totalSec) * 100 : 0;
              return (
                <div key={s.identity}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-[9px] font-bold text-white/70">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium text-white/90">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/55">
                      <span className="font-mono text-[11px] tabular-nums">{formatDuration(s.totalSec)}</span>
                      <span className="text-[9px] text-white/35">· {share.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="tt-fill h-full rounded-full"
                      style={
                        {
                          background: i === 0
                            ? "linear-gradient(90deg, var(--accent), #a855f7)"
                            : "linear-gradient(90deg, #6366f1, #06b6d4)",
                          "--target-width": `${pct}%`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] uppercase tracking-wider text-white/40">
          <span>Total speaking</span>
          <span className="font-mono text-white/65">{formatDuration(totalSec)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}