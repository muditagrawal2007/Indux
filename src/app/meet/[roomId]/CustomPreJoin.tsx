"use client";

// Custom PreJoin — Zoom-style, working video + audio + virtual background selection

import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "../../components/Icons";

type Props = {
  roomId: string;
  isAdmin: boolean;
  initialName: string;
  isEmbed: boolean;
  bgMode: "none" | "blur";
  onBgModeChange: (m: "none" | "blur") => void;
  onJoin: (name: string, audioOn: boolean, videoOn: boolean) => void;
  onLeave: () => void;
};

export function CustomPreJoin({ roomId, isAdmin, initialName, isEmbed, bgMode, onBgModeChange, onJoin, onLeave }: Props) {
  const [name, setName] = useState(initialName);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "error" | "denied">("connecting");
  const [bgOpen, setBgOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Get media
  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    async function getMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setStatus("error"); return; }
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        activeStream = s;
        setStream(s);
        setStatus("ready");
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setStatus(e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError" ? "denied" : "error");
      }
    }
    getMedia();
    return () => { cancelled = true; activeStream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = audioOn; });
  }, [audioOn, stream]);

  useEffect(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
  }, [videoOn, stream]);

  useEffect(() => {
    if (videoOn && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoOn, stream]);

  // Apply background blur via canvas
  useEffect(() => {
    if (!stream || !videoOn || bgMode === "none") {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const videoEl = video;
    const canvasEl = canvas;
    const ctx = canvasEl.getContext("2d");
    if (!ctx || !videoEl) return;

    function draw() {
      if (videoEl && canvasEl && ctx && videoEl.readyState >= 2) {
        canvasEl.width = videoEl.videoWidth || 640;
        canvasEl.height = videoEl.videoHeight || 360;
        ctx.filter = "blur(20px)";
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        ctx.filter = "none";
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [stream, videoOn, bgMode]);

  function join() {
    if (!name.trim()) return;
    onJoin(name.trim(), audioOn, videoOn);
  }

  const BG_OPTIONS = [
    { id: "none" as const, label: "None", icon: <Icon.Video size={18} /> },
    { id: "blur" as const, label: "Blur", icon: <Icon.Sparkles size={18} /> },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full bg-[color:var(--bg)] text-[color:var(--text-primary)]">
      <div className="aurora-bg" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur-md px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
          >
            IX
          </div>
          <span className="text-sm font-semibold">Indux Meet</span>
        </div>
        {!isEmbed && (
          <button onClick={onLeave} className="btn-ghost !text-sm !text-[color:var(--text-secondary)]">
            Back
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-6 px-5 pt-6 sm:pt-8 pb-12 lg:grid-cols-[1.5fr_1fr]">
        {/* Video preview */}
        <section className="animate-fadeIn">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] shadow-2xl">
            {/* Raw video (hidden when blur active) */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={
                "h-full w-full object-cover transition-all duration-300 " +
                (videoOn && stream ? "" : "hidden") +
                (bgMode === "blur" ? " hidden" : "")
              }
            />
            {/* Blurred canvas (shown when blur active) */}
            {bgMode === "blur" && videoOn && stream && (
              <canvas
                ref={canvasRef}
                className="h-full w-full object-cover"
              />
            )}
            {(!videoOn || !stream) && (
              <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--bg-elevated)]">
                <div className="text-center animate-fadeIn">
                  <div
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white shadow-xl"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-600))" }}
                  >
                    {(name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="mt-3 text-sm text-[color:var(--text-secondary)]">
                    {status === "connecting" && "Connecting camera..."}
                    {status === "denied" && "Camera/mic permission denied"}
                    {status === "error" && "Camera or mic not available"}
                    {status === "ready" && !videoOn && "Camera is off"}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom controls pill */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-2 py-2 backdrop-blur-md shadow-lg">
              <ZoomMicBtn on={audioOn} onClick={() => setAudioOn((v) => !v)} />
              <ZoomCamBtn on={videoOn} onClick={() => setVideoOn((v) => !v)} />
              <button
                onClick={() => setBgOpen(!bgOpen)}
                title="Virtual background"
                aria-label="Virtual background"
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
                  (bgMode !== "none" ? "bg-[color:var(--accent)] text-white" : "bg-white/15 text-white hover:bg-white/25")
                }
              >
                <Icon.Picture size={16} />
              </button>
            </div>

            {/* Background picker popup */}
            {bgOpen && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-2 shadow-2xl animate-scaleIn z-20">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)] px-2 pb-1.5">Background</div>
                <div className="flex gap-2">
                  {BG_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onBgModeChange(opt.id); setBgOpen(false); }}
                      className={
                        "flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-xs font-medium transition-all " +
                        (bgMode === opt.id
                          ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30"
                          : "bg-[color:var(--bg-sunken)] text-[color:var(--text-secondary)] hover:bg-[color:var(--border)]")
                      }
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name pill */}
            {name && (
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                {name} (You)
              </div>
            )}
          </div>

          {status === "denied" && (
            <div className="mt-3 animate-scaleIn flex items-center gap-2 rounded-lg border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2.5 text-xs text-[color:var(--warning)]">
              <Icon.Alert size={14} />
              Camera or microphone access was blocked. Click the camera icon in your browser&apos;s address bar to allow access, or you can still join with audio/video off.
            </div>
          )}
        </section>

        {/* Right panel */}
        <section className="flex flex-col gap-4 animate-fadeIn stagger-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isAdmin ? "You're the host" : "Ready to join?"}
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
              <span className="font-mono">/{roomId}</span>
              {isAdmin && (
                <span className="badge badge-info !text-[10px]">Host</span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="How should others see you?"
              autoFocus
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all"
            />
          </div>

          {/* Background mode indicator */}
          {bgMode !== "none" && (
            <div className="flex items-center gap-2 rounded-lg border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/5 px-3 py-2 text-xs text-[color:var(--accent)]">
              <Icon.Picture size={14} />
              Background blur enabled
            </div>
          )}

          <button
            onClick={join}
            disabled={!name.trim()}
            className="btn-primary !rounded-lg !py-3 !text-sm !font-semibold !w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Icon.Video size={16} />
            <span>Join meeting</span>
          </button>

          <p className="text-xs text-[color:var(--text-muted)]">
            By joining, you agree to our terms of service and privacy policy.
          </p>
        </section>
      </main>
    </div>
  );
}

function ZoomMicBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Mute" : "Unmute"}
      aria-label={on ? "Mute microphone" : "Unmute microphone"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
        (on ? "bg-white/15 text-white hover:bg-white/25" : "bg-[color:var(--danger)] text-white hover:bg-[color:var(--danger)]/90")
      }
    >
      {on ? <Icon.Mic size={16} /> : <Icon.MicOff size={16} />}
    </button>
  );
}

function ZoomCamBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Stop video" : "Start video"}
      aria-label={on ? "Turn off camera" : "Turn on camera"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-all " +
        (on ? "bg-white/15 text-white hover:bg-white/25" : "bg-[color:var(--danger)] text-white hover:bg-[color:var(--danger)]/90")
      }
    >
      {on ? <Icon.Video size={16} /> : <Icon.VideoOff size={16} />}
    </button>
  );
}
