"use client";

// Custom PreJoin — built from scratch, no LiveKit defaults
// Large, readable, professional

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

type Props = {
  roomId: string;
  isAdmin: boolean;
  initialName: string;
  isEmbed: boolean;
  onJoin: (name: string) => void;
  onLeave: () => void;
};

export function CustomPreJoin({ roomId, isAdmin, initialName, isEmbed, onJoin, onLeave }: Props) {
  const [name, setName] = useState(initialName);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to get camera/mic
  useEffect(() => {
    let cancelled = false;
    async function getMedia() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        setError("Camera or microphone not available. You can still join.");
      }
    }
    getMedia();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle mic/cam
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = audioOn));
    stream.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [audioOn, videoOn, stream]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}
          >
            IX
          </div>
          <div>
            <div className="text-sm font-semibold">Indux Meet</div>
            <div className="text-xs text-white/50">Ready to connect</div>
          </div>
        </div>
        {!isEmbed && (
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Icon.Arrow size={14} className="rotate-180" />
            <span>Back</span>
          </button>
        )}
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 pt-12 pb-16 lg:grid-cols-[1.4fr_1fr]">
        {/* Video preview */}
        <section>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#15151b]">
            {videoOn && stream ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <div
                    className="mx-auto grid h-24 w-24 place-items-center rounded-full text-3xl font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}
                  >
                    {(name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="mt-4 text-sm text-white/60">
                    {videoOn && !stream ? "Connecting camera..." : "Camera is off"}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 p-1.5 backdrop-blur">
              <PreviewBtn
                on={audioOn}
                onClick={() => setAudioOn((v) => !v)}
                label={audioOn ? "Microphone on" : "Microphone off"}
                onIcon={<Icon.MicOn size={18} />}
                offIcon={<Icon.MicOff size={18} />}
              />
              <PreviewBtn
                on={videoOn}
                onClick={() => setVideoOn((v) => !v)}
                label={videoOn ? "Camera on" : "Camera off"}
                onIcon={<Icon.Video size={18} />}
                offIcon={<Icon.VideoOff size={18} />}
              />
            </div>

            {/* Name pill */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span>{name || "You"}</span>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
            <Icon.Keyboard size={14} />
            <span>
              Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">Enter</kbd> to join
              when ready
            </span>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              <Icon.Alert size={14} />
              {error}
            </div>
          )}
        </section>

        {/* Join panel */}
        <section className="flex flex-col gap-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              {isAdmin ? "Host this meeting" : "Ready to join"}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isAdmin ? "You're the host" : "Almost there"}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-white/60">
              <span className="font-mono text-white/80">/{roomId}</span>
              {isAdmin && (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                  <Icon.ShieldCheck size={10} />
                  Host
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/70">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name.trim())}
              placeholder="How should others see you?"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-[#15151b] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <button
            onClick={() => name.trim() && onJoin(name.trim())}
            disabled={!name.trim()}
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Join meeting
          </button>

          <div className="rounded-lg border border-white/10 bg-[#15151b] p-3 text-xs text-white/60">
            <div className="flex items-center gap-1.5 font-medium text-white/80">
              <Icon.Info size={12} />
              Ready to start?
            </div>
            <p className="mt-1">Your camera and mic will connect when you join. You can mute, hide, or share anytime.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function PreviewBtn({
  on, onClick, label, onIcon, offIcon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
        (on ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600")
      }
    >
      {on ? onIcon : offIcon}
    </button>
  );
}
