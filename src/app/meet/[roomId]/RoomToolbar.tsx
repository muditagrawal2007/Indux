"use client";

// Floating pill toolbar — bottom-center, dark glass
// Matches Zoom/Google Meet/LiveKit Meet patterns
// Now includes: virtual background, touch-up, spotlight, push-to-talk,
// picture-in-picture, connection quality

import { useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Icon, Reaction } from "../../components/Icons";

type Tab = "chat" | "people" | "polls" | "qa" | "notes" | null;

type Background = "none" | "blur" | "sunset" | "office" | "forest" | "beach";

type Props = {
  roomId: string;
  userName: string;
  isAdmin: boolean;
  recording: boolean;
  setRecording: (v: boolean) => void;
  activeTab: Tab;
  onTab: (t: Tab) => void;
  onShare: () => void;
  onWhiteboard: () => void;
  onNotes: () => void;
  onTranscript: () => void;
  onSettings: () => void;
  onLeave: () => void;
  canPublish?: boolean;
  onBackgroundChange?: (bg: Background) => void;
  background?: Background;
  onTouchUpToggle?: () => void;
  touchUp?: boolean;
  onSpotlightCycle?: () => void;
};

export function RoomToolbar({
  roomId, userName, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onSettings, onLeave,
  canPublish = true, onBackgroundChange, background = "none", onTouchUpToggle, touchUp = false, onSpotlightCycle,
}: Props) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const [quality, setQuality] = useState<"excellent" | "good" | "fair" | "poor" | "unknown">("unknown");
  const pttRef = useRef(false);

  async function toggleMic() {
    if (!localParticipant || !canPublish) return;
    try {
      const next = !micOn;
      setMicOn(next);
      await localParticipant.setMicrophoneEnabled(next);
    } catch {
      setMicOn(!micOn);
    }
  }

  async function toggleCam() {
    if (!localParticipant || !canPublish) return;
    try {
      const next = !camOn;
      setCamOn(next);
      await localParticipant.setCameraEnabled(next);
    } catch {
      setCamOn(!camOn);
    }
  }

  async function sendReaction(emoji: string) {
    await fetch(`/api/rooms/${roomId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: userName, emoji }),
    });
    setReactionsOpen(false);
  }

  async function raiseHand() {
    await fetch(`/api/rooms/${roomId}/hand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: userName, action: "raise" }),
    });
  }

  // Push-to-talk: hold Space to unmute (when muted)
  useEffect(() => {
    if (!canPublish) return;
    function onDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (micOn) return; // only when muted
      e.preventDefault();
      if (pttRef.current) return;
      pttRef.current = true;
      setPttActive(true);
      localParticipant?.setMicrophoneEnabled(true).catch(() => {});
    }
    function onUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (!pttRef.current) return;
      pttRef.current = false;
      setPttActive(false);
      localParticipant?.setMicrophoneEnabled(false).catch(() => {});
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [micOn, canPublish, localParticipant]);

  // Connection quality — sample periodically from local participant
  useEffect(() => {
    if (!localParticipant) return;
    let cancelled = false;
    async function sample() {
      try {
        const conn = (localParticipant as any).connectionQuality;
        // livekit values: 0=unknown, 1=excellent, 2=good, 3=poor, 4=lost
        const map: Record<number, typeof quality> = {
          1: "excellent",
          2: "good",
          3: "fair",
          4: "poor",
        };
        if (!cancelled && typeof conn === "number") {
          setQuality(map[conn] ?? "unknown");
        }
      } catch {}
    }
    sample();
    const t = setInterval(sample, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [localParticipant]);

  const bgOptions: { value: Background; label: string; preview: string }[] = [
    { value: "none", label: "None", preview: "transparent" },
    { value: "blur", label: "Blur", preview: "blur" },
    { value: "sunset", label: "Sunset", preview: "linear-gradient(135deg,#f97316,#ec4899)" },
    { value: "office", label: "Office", preview: "linear-gradient(135deg,#475569,#cbd5e1)" },
    { value: "forest", label: "Forest", preview: "linear-gradient(135deg,#064e3b,#10b981)" },
    { value: "beach", label: "Beach", preview: "linear-gradient(135deg,#0ea5e9,#fde68a)" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-5">
      {/* Status badges above toolbar */}
      {(recording || !canPublish || pttActive) && (
        <div className="mb-2 flex justify-center gap-2">
          {recording && (
            <span className="animate-bounceIn flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-red-400 backdrop-blur-md">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
              </span>
              REC
            </span>
          )}
          {pttActive && (
            <span className="animate-bounceIn flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400 backdrop-blur-md">
              <Icon.Mic size={10} />
              Push to talk
            </span>
          )}
          {!canPublish && (
            <span className="animate-bounceIn flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-400 backdrop-blur-md">
              <Icon.Lock size={10} />
              Waiting for host
            </span>
          )}
        </div>
      )}

      {/* Main floating pill */}
      <div className="flex items-center gap-0.5 rounded-full bg-[#1a1a24]/90 px-2 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl border border-white/10">
        {/* Core controls */}
        <PillButton
          active={micOn}
          activeIcon={<Icon.Mic size={18} />}
          inactiveIcon={<Icon.MicOff size={18} />}
          onClick={toggleMic}
          label={micOn ? "Mute (M)" : "Unmute (M)"}
        />
        <PillButton
          active={camOn}
          activeIcon={<Icon.Video size={18} />}
          inactiveIcon={<Icon.VideoOff size={18} />}
          onClick={toggleCam}
          label={camOn ? "Stop Video (V)" : "Start Video (V)"}
        />

        <div className="mx-1 h-5 w-px bg-white/10" />

        <PillButton
          active
          activeIcon={<Icon.ScreenShare size={18} />}
          onClick={onShare}
          label="Share"
        />
        <PillButton
          active
          activeIcon={<Icon.MessageSquare size={18} />}
          onClick={() => onTab(activeTab === "chat" ? null : "chat")}
          label="Chat (C)"
          highlight={activeTab === "chat"}
        />
        <PillButton
          active
          activeIcon={<Icon.BarChart size={18} />}
          onClick={() => onTab(activeTab === "polls" ? null : "polls")}
          label="Polls (L)"
          highlight={activeTab === "polls"}
        />
        <PillButton
          active
          activeIcon={<Icon.Users size={18} />}
          onClick={() => onTab(activeTab === "people" ? null : "people")}
          label="People (P)"
          highlight={activeTab === "people"}
        />

        <div className="mx-1 h-5 w-px bg-white/10" />

        {/* Reactions */}
        <div className="relative">
          <PillButton
            active
            activeIcon={<Reaction kind="thumbs" />}
            onClick={() => setReactionsOpen(!reactionsOpen)}
            label="React"
          />
          {reactionsOpen && (
            <div
              className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#1a1a24]/95 p-2 shadow-2xl backdrop-blur-xl animate-scaleIn"
              onMouseLeave={() => setReactionsOpen(false)}
            >
              <div className="flex gap-1">
                {(["thumbs", "clap", "heart", "laugh", "fire", "party"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => sendReaction(r)}
                    className="grid h-10 w-10 place-items-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white hover:scale-125 transition-all duration-150"
                    title={r}
                  >
                    <Reaction kind={r} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Virtual background + touch-up */}
        {canPublish && (
          <div className="relative">
            <PillButton
              active={bgOpen}
              activeIcon={<Icon.Image size={18} />}
              inactiveIcon={<Icon.Image size={18} />}
              onClick={() => { setBgOpen(!bgOpen); setMoreOpen(false); setReactionsOpen(false); }}
              label="Background"
            />
            {bgOpen && (
              <div
                className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 w-64 rounded-2xl border border-white/10 bg-[#1a1a24]/95 p-3 shadow-2xl backdrop-blur-xl animate-scaleIn"
                onMouseLeave={() => setBgOpen(false)}
              >
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Virtual background
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {bgOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onBackgroundChange?.(opt.value);
                        setBgOpen(false);
                      }}
                      className={
                        "flex flex-col items-center gap-1 rounded-lg border p-1 transition-all " +
                        (background === opt.value
                          ? "border-white/40 bg-white/10"
                          : "border-white/5 hover:border-white/20 hover:bg-white/5")
                      }
                      title={opt.label}
                    >
                      <div
                        className="h-9 w-full rounded"
                        style={{
                          background:
                            opt.preview === "transparent"
                              ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 4px, rgba(255,255,255,0.1) 4px 8px)"
                              : opt.preview === "blur"
                                ? "rgba(255,255,255,0.15)"
                                : opt.preview,
                          backdropFilter:
                            opt.preview === "blur" ? "blur(8px)" : undefined,
                        }}
                      />
                      <span className="text-[9px] text-white/60">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { onTouchUpToggle?.(); setBgOpen(false); }}
                  className={
                    "mt-2 flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-all " +
                    (touchUp
                      ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10")
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <Icon.Sparkles size={11} />
                    Touch-up
                  </span>
                  <span className="font-mono text-[10px]">
                    {touchUp ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* More */}
        <div className="relative">
          <PillButton
            active={moreOpen}
            activeIcon={<Icon.More size={18} />}
            inactiveIcon={<Icon.More size={18} />}
            onClick={() => { setMoreOpen(!moreOpen); setBgOpen(false); setReactionsOpen(false); }}
            label="More"
          />
          {moreOpen && (
            <div
              className="absolute bottom-full right-0 mb-3 w-56 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-1 shadow-2xl backdrop-blur-xl animate-scaleIn"
              onMouseLeave={() => setMoreOpen(false)}
            >
              <MoreItem icon={<Icon.Hand size={16} />} label="Raise hand (R)" onClick={() => { raiseHand(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Pin size={16} />} label={spotlightCycleEnabled() ? "Spotlight next" : "Spotlight"} onClick={() => { onSpotlightCycle?.(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Pencil size={16} />} label="Whiteboard (W)" onClick={() => { onWhiteboard(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.FileText size={16} />} label="Notes (N)" onClick={() => { onNotes(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.FileText size={16} />} label="Transcript (T)" onClick={() => { onTranscript(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Settings size={16} />} label="Settings" onClick={() => { onSettings(); setMoreOpen(false); }} />
              <MoreItem
                icon={pipOpen ? <Icon.EyeOff size={16} /> : <Icon.Eye size={16} />}
                label={pipOpen ? "Exit mini view" : "Mini view (PiP)"}
                onClick={() => { setPipOpen(!pipOpen); setMoreOpen(false); }}
              />
              {isAdmin && (
                <RecBtnInline
                  recording={recording}
                  setRecording={setRecording}
                  onClose={() => setMoreOpen(false)}
                  roomId={roomId}
                  userName={userName}
                />
              )}
            </div>
          )}
        </div>

        {/* Connection quality indicator (always visible) */}
        <QualityIndicator quality={quality} />

        <div className="mx-1 h-5 w-px bg-white/10" />

        {/* End call */}
        <button
          onClick={onLeave}
          className="ml-0.5 flex h-10 items-center gap-1.5 rounded-full bg-red-500 px-5 text-xs font-semibold text-white hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
        >
          <Icon.PhoneOff size={14} />
          <span className="hidden sm:inline">End</span>
        </button>
      </div>
    </div>
  );
}

function spotlightCycleEnabled(): boolean {
  // Just a UI label helper — actual cycle lives in RoomClient.
  return true;
}

function PillButton({
  active, activeIcon, inactiveIcon, onClick, label, highlight,
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  onClick: () => void;
  label: string;
  highlight?: boolean;
}) {
  const isOff = !active;
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 " +
        (highlight
          ? "bg-white/15 text-white"
          : isOff
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : "text-white/60 hover:bg-white/10 hover:text-white")
      }
    >
      {active ? activeIcon : (inactiveIcon ?? activeIcon)}
    </button>
  );
}

function QualityIndicator({ quality }: { quality: "excellent" | "good" | "fair" | "poor" | "unknown" }) {
  const bars: Record<typeof quality, { filled: number; color: string; label: string }> = {
    excellent: { filled: 4, color: "bg-emerald-400", label: "Excellent" },
    good: { filled: 3, color: "bg-emerald-400", label: "Good" },
    fair: { filled: 2, color: "bg-amber-400", label: "Fair" },
    poor: { filled: 1, color: "bg-red-400", label: "Poor" },
    unknown: { filled: 2, color: "bg-white/30", label: "Detecting..." },
  };
  const cfg = bars[quality];
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1.5"
      title={`Connection: ${cfg.label}`}
    >
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={
              "w-1 rounded-sm transition-all " +
              (i <= cfg.filled ? cfg.color : "bg-white/10")
            }
            style={{ height: 4 + i * 2 }}
          />
        ))}
      </div>
    </div>
  );
}

function MoreItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white/80 transition-colors"
    >
      <span className="text-white/30">{icon}</span>
      {label}
    </button>
  );
}

function RecBtnInline({ recording, setRecording, onClose, roomId, userName }: { recording: boolean; setRecording: (v: boolean) => void; onClose: () => void; roomId: string; userName: string }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const start = async () => {
    try {
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const rec = new MediaRecorder(displayStream, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        const dur = Date.now() - startTimeRef.current;
        const startRes = await fetch(`/api/rooms/${roomId}/recordings/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startedBy: userName }),
        }).then((r) => r.json());
        const id = startRes.recording?.id;
        const form = new FormData();
        form.append("file", blob, `${id}.webm`);
        form.append("id", id);
        form.append("durationMs", String(dur));
        await fetch(`/api/rooms/${roomId}/recordings`, { method: "POST", body: form });
        displayStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setRecording(false);
        alert("Recording saved");
      };
      rec.start(1000);
      recorderRef.current = rec;
      startTimeRef.current = Date.now();
      setRecording(true);
      onClose();
    } catch (e) {
      alert("Could not start recording: " + (e as Error).message);
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    onClose();
  };

  return (
    <MoreItem
      icon={recording ? <Icon.Stop size={16} /> : <Icon.Record size={16} />}
      label={recording ? "Stop recording" : "Record"}
      onClick={recording ? stop : start}
    />
  );
}
