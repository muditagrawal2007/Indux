"use client";

// Custom PreJoin — Zoom-style, working video + audio
// Stream is always attached to video element. Toggles enabled tracks.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons";

type Props = {
  roomId: string;
  isAdmin: boolean;
  initialName: string;
  isEmbed: boolean;
  onJoin: (name: string, audioOn: boolean, videoOn: boolean) => void;
  onLeave: () => void;
};

export function CustomPreJoin({ roomId, isAdmin, initialName, isEmbed, onJoin, onLeave }: Props) {
  const [name, setName] = useState(initialName);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "error" | "denied">("connecting");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Always get media on mount and keep the stream alive
  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    async function getMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("error");
          return;
        }
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = s;
        setStream(s);
        setStatus("ready");
        // Always attach to video element so toggling works
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.muted = true; // never play your own audio back
          videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
          setStatus("denied");
        } else {
          setStatus("error");
        }
      }
    }

    getMedia();

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Toggle mic/cam tracks when state changes
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = audioOn;
    });
  }, [audioOn, stream]);

  useEffect(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = videoOn;
    });
  }, [videoOn, stream]);

  // Replay video when toggled back on
  useEffect(() => {
    if (videoOn && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoOn, stream]);

  function join() {
    if (!name.trim()) return;
    onJoin(name.trim(), audioOn, videoOn);
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] text-white">
      {/* Top bar — Zoom-style minimal */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}
          >
            IX
          </div>
          <span className="text-sm font-semibold">Indux Meet</span>
        </div>
        {!isEmbed && (
          <button
            onClick={onLeave}
            className="rounded-md px-3 py-1.5 text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            Back
          </button>
        )}
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-5 pt-8 pb-12 lg:grid-cols-[1.5fr_1fr]">
        {/* Video preview — Zoom style */}
        <section>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-[#1a1a25]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={"h-full w-full object-cover " + (videoOn && stream ? "" : "hidden")}
            />
            {(!videoOn || !stream) && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a25]">
                <div className="text-center">
                  <div
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--accent), #4f46e5)" }}
                  >
                    {(name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="mt-3 text-sm text-white/60">
                    {status === "connecting" && "Connecting camera..."}
                    {status === "denied" && "Camera/mic permission denied"}
                    {status === "error" && "Camera or mic not available"}
                    {status === "ready" && !videoOn && "Camera is off"}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom controls — Zoom-style round buttons */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-2 py-2 backdrop-blur">
              <ZoomMicBtn on={audioOn} onClick={() => setAudioOn((v) => !v)} />
              <ZoomCamBtn on={videoOn} onClick={() => setVideoOn((v) => !v)} />
            </div>

            {/* Name pill bottom-left */}
            {name && (
              <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
                {name} (You)
              </div>
            )}
          </div>

          {status === "denied" && (
            <div className="mt-3 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              Camera or microphone access was blocked. Click the camera icon in your browser's address bar to allow access, or you can still join with audio/video off.
            </div>
          )}
        </section>

        {/* Right panel — Zoom-style form */}
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isAdmin ? "You're the host" : "Ready to join?"}
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-white/60">
              <span className="font-mono">/{roomId}</span>
              {isAdmin && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Host
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/70">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="How should others see you?"
              autoFocus
              className="w-full rounded-md border border-white/10 bg-[#15151b] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
            />
          </div>

          {/* Big Zoom-style Join button */}
          <button
            onClick={join}
            disabled={!name.trim()}
            className="flex items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            <span>Join meeting</span>
          </button>

          <p className="text-xs text-white/40">
            By joining, you agree to our terms of service and privacy policy.
          </p>
        </section>
      </main>
    </div>
  );
}

// Zoom-style mic button: red when muted, gray when active
function ZoomMicBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Mute" : "Unmute"}
      aria-label={on ? "Mute microphone" : "Unmute microphone"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
        (on ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500 text-white hover:bg-red-600")
      }
    >
      {on ? <Icon.Mic size={16} /> : <Icon.MicOff size={16} />}
    </button>
  );
}

// Zoom-style cam button: red when off, gray when active
function ZoomCamBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Stop video" : "Start video"}
      aria-label={on ? "Turn off camera" : "Turn on camera"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
        (on ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-500 text-white hover:bg-red-600")
      }
    >
      {on ? <Icon.Video size={16} /> : <Icon.VideoOff size={16} />}
    </button>
  );
}
