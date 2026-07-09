"use client";

// Zoom-style floating toolbar — icon-above-text labels under each button.
// Bigger, clearer, more discoverable than the original.

import { useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Icon, Reaction } from "../../components/Icons";
import type { RoomTab } from "./RoomClient";

type Tab = RoomTab | null;

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
  insightsCount?: number;
};

export function RoomToolbar({
  roomId, userName, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onSettings, onLeave,
  canPublish = true, onBackgroundChange, background = "none", onTouchUpToggle, touchUp = false, onSpotlightCycle, insightsCount = 0,
}: Props) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const [quality, setQuality] = useState<"excellent" | "good" | "fair" | "poor" | "unknown">("unknown");
  const [chatBadge, setChatBadge] = useState(0);
  const [handBadge, setHandBadge] = useState(0);
  const [pollBadge, setPollBadge] = useState(0);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const lastChatIdRef = useRef(0);
  const lastPollIdRef = useRef("");
  const chatOpenRef = useRef(false);
  const pollsOpenRef = useRef(false);
  const pttRef = useRef(false);

  // Chat badge — count new messages since user last viewed the panel
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;
    async function tick() {
      if (document.hidden || cancelled) {
        timeoutId = setTimeout(tick, 8000);
        return;
      }
      try {
        const r = await fetch(`/api/rooms/${roomId}/chat?since=${lastChatIdRef.current}`);
        const d = await r.json();
        const msgs = (d.messages ?? []) as any[];
        if (msgs.length > 0) {
          lastChatIdRef.current = Math.max(lastChatIdRef.current, ...msgs.map((m: any) => m.id));
          if (!chatOpenRef.current) {
            setChatBadge((b) => b + msgs.length);
          }
        }
      } catch {}
      if (!cancelled) timeoutId = setTimeout(tick, 3500);
    }
    tick();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [roomId]);

  // Hand raise badge — count of raised hands (refreshed every 4s)
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;
    async function tick() {
      if (document.hidden || cancelled) {
        timeoutId = setTimeout(tick, 10000);
        return;
      }
      try {
        const r = await fetch(`/api/rooms/${roomId}/hand`);
        const d = await r.json();
        const hands = (d.hands ?? d.participants ?? []) as any[];
        setHandBadge(hands.filter((h: any) => h.identity !== userName).length);
      } catch {}
      if (!cancelled) timeoutId = setTimeout(tick, 4000);
    }
    tick();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [roomId, userName]);

  // Polls badge — count new polls since user last viewed the panel
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;
    async function tick() {
      if (document.hidden || cancelled) {
        timeoutId = setTimeout(tick, 8000);
        return;
      }
      try {
        const r = await fetch(`/api/rooms/${roomId}/polls`);
        const d = await r.json();
        const polls = (d.polls ?? []) as any[];
        if (polls.length > 0) {
          const newestId = polls[0]?.id ?? "";
          if (lastPollIdRef.current && newestId !== lastPollIdRef.current && !pollsOpenRef.current) {
            setPollBadge((b) => b + 1);
          }
          lastPollIdRef.current = newestId;
        }
      } catch {}
      if (!cancelled) timeoutId = setTimeout(tick, 5000);
    }
    tick();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [roomId]);

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
    const next = !myHandRaised;
    setMyHandRaised(next);
    await fetch(`/api/rooms/${roomId}/hand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: userName, name: userName, action: next ? "raise" : "lower" }),
    });
  }

  // Push-to-talk
  useEffect(() => {
    if (!canPublish) return;
    function onDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (micOn) return;
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

  // Connection quality sample
  useEffect(() => {
    if (!localParticipant) return;
    let cancelled = false;
    async function sample() {
      try {
        const conn = (localParticipant as any).connectionQuality;
        const map: Record<number, typeof quality> = {
          1: "excellent", 2: "good", 3: "fair", 4: "poor",
        };
        if (!cancelled && typeof conn === "number") setQuality(map[conn] ?? "unknown");
      } catch {}
    }
    sample();
    const t = setInterval(sample, 5000);
    return () => { cancelled = true; clearInterval(t); };
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
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pt-6 pointer-events-none">
      {/* Status badges above toolbar */}
      {(recording || !canPublish || pttActive) && (
        <div className="absolute top-1 left-1/2 flex -translate-x-1/2 gap-2 pointer-events-auto">
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

      {/* Main Zoom-style toolbar — pill with icon-above-text buttons */}
      <div className="pointer-events-auto flex items-end gap-1 rounded-2xl border border-white/[0.08] bg-[#15151c]/85 px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        {/* Mic + Cam — bigger, with red-tinted-off state */}
        <ToolButton
          on={micOn}
          onIcon={<Icon.Mic size={20} />}
          offIcon={<Icon.MicOff size={20} />}
          onClick={toggleMic}
          label={micOn ? "Mute" : "Unmute"}
          description={micOn ? "Mute your mic" : "Turn on your mic"}
          shortcut="M"
          danger={!micOn}
        />
        <ToolButton
          on={camOn}
          onIcon={<Icon.Video size={20} />}
          offIcon={<Icon.VideoOff size={20} />}
          onClick={toggleCam}
          label={camOn ? "Stop Video" : "Start Video"}
          description={camOn ? "Turn off your camera" : "Turn on your camera"}
          shortcut="V"
          danger={!camOn}
        />

        <Divider />

        <ToolButton
          on={true}
          onIcon={<Icon.ScreenShare size={20} />}
          onClick={onShare}
          label="Share"
          description="Share screen / window / tab"
          shortcut="S"
        />
        <ToolButton
          on={activeTab !== "chat"}
          onIcon={<Icon.MessageSquare size={20} />}
          onClick={() => {
            chatOpenRef.current = activeTab !== "chat";
            onTab(activeTab === "chat" ? null : "chat");
            if (activeTab !== "chat") setChatBadge(0);
          }}
          label="Chat"
          description="Open chat panel"
          shortcut="C"
          active={activeTab === "chat"}
          badge={chatBadge > 0 ? chatBadge : undefined}
        />
        <ToolButton
          on={activeTab !== "people"}
          onIcon={<Icon.Users size={20} />}
          onClick={() => onTab(activeTab === "people" ? null : "people")}
          label="People"
          description="See who's here, raise hands"
          shortcut="P"
          active={activeTab === "people"}
          badge={handBadge > 0 ? handBadge : undefined}
        />
        <ToolButton
          on={activeTab !== "polls"}
          onIcon={<Icon.BarChart size={20} />}
          onClick={() => {
            pollsOpenRef.current = activeTab !== "polls";
            onTab(activeTab === "polls" ? null : "polls");
            if (activeTab !== "polls") setPollBadge(0);
          }}
          label="Polls"
          description="Live polls & word clouds"
          shortcut="L"
          active={activeTab === "polls"}
          badge={pollBadge > 0 ? pollBadge : undefined}
        />
        <ToolButton
          on={activeTab !== "qa"}
          onIcon={<Icon.Help size={20} />}
          onClick={() => onTab(activeTab === "qa" ? null : "qa")}
          label="Q&A"
          description="Audience questions"
          active={activeTab === "qa"}
        />
        <ToolButton
          on={activeTab !== "notes"}
          onIcon={<Icon.FileText size={20} />}
          onClick={() => onTab(activeTab === "notes" ? null : "notes")}
          label="Notes"
          description="Shared meeting notes"
          shortcut="N"
          active={activeTab === "notes"}
        />

        <ToolButton
          on={activeTab !== "ai"}
          onIcon={<Icon.Sparkles size={20} />}
          onClick={() => onTab(activeTab === "ai" ? null : "ai")}
          label="Sidekick"
          description="AI assistant + insights"
          active={activeTab === "ai"}
          badge={insightsCount > 0 ? insightsCount : undefined}
          gradient={true}
        />

        <Divider />

        {/* Reactions */}
        <div className="relative">
          <ToolButton
            on={true}
            onIcon={<Reaction kind="thumbs" />}
            onClick={() => { setReactionsOpen(!reactionsOpen); setMoreOpen(false); setBgOpen(false); }}
            label="React"
            active={reactionsOpen}
          />
          {reactionsOpen && (
            <div
              className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#1c1d24]/95 p-2 shadow-2xl backdrop-blur-xl animate-scaleIn"
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

        {/* Raise hand */}
        <ToolButton
          on={true}
          onIcon={<Icon.Hand size={20} />}
          onClick={raiseHand}
          label={myHandRaised ? "Lower" : "Raise"}
          shortcut="R"
          active={myHandRaised}
          gradient={true}
        />


        {/* Virtual background */}
        {canPublish && (
          <div className="relative">
            <ToolButton
              on={true}
              onIcon={<Icon.Image size={20} />}
              onClick={() => { setBgOpen(!bgOpen); setMoreOpen(false); setReactionsOpen(false); }}
              label="Effects"
              active={bgOpen}
            />
            {bgOpen && (
              <div
                className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 w-72 rounded-2xl border border-white/10 bg-[#1c1d24]/95 p-3 shadow-2xl backdrop-blur-xl animate-scaleIn"
                onMouseLeave={() => setBgOpen(false)}
              >
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Virtual background
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {bgOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { onBackgroundChange?.(opt.value); setBgOpen(false); }}
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
                          backdropFilter: opt.preview === "blur" ? "blur(8px)" : undefined,
                        }}
                      />
                      <span className="text-[9px] text-white/60">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { onTouchUpToggle?.(); }}
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
                  <span className="font-mono text-[10px]">{touchUp ? "ON" : "OFF"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* More (Whiteboard, Transcript, Spotlight, Settings) */}
        <div className="relative">
          <ToolButton
            on={true}
            onIcon={<Icon.More size={20} />}
            onClick={() => { setMoreOpen(!moreOpen); setBgOpen(false); setReactionsOpen(false); }}
            label="More"
            active={moreOpen}
          />
          {moreOpen && (
            <div
              className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-white/10 bg-[#1c1d24]/95 p-1 shadow-2xl backdrop-blur-xl animate-scaleIn"
              onMouseLeave={() => setMoreOpen(false)}
            >
              <MoreItem icon={<Icon.Pin size={16} />} label="Spotlight next" onClick={() => { onSpotlightCycle?.(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Pencil size={16} />} label="Whiteboard" shortcut="W" onClick={() => { onWhiteboard(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Sparkles size={16} />} label="Transcript" shortcut="T" onClick={() => { onTranscript(); setMoreOpen(false); }} />
              <MoreItem icon={<Icon.Settings size={16} />} label="Settings" onClick={() => { onSettings(); setMoreOpen(false); }} />
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

        <Divider />

        {/* Connection quality indicator */}
        <QualityIndicator quality={quality} />

        {/* End call — big red button */}
        <button
          onClick={onLeave}
          className="ml-2 flex h-12 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-400 transition-all shadow-lg shadow-red-500/30"
        >
          <Icon.PhoneOff size={16} />
          <span className="hidden sm:inline">End</span>
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  on,
  onIcon,
  offIcon,
  onClick,
  label,
  shortcut,
  active,
  danger,
  badge,
  gradient,
  description,
}: {
  on: boolean;
  onIcon: React.ReactNode;
  offIcon?: React.ReactNode;
  onClick: () => void;
  label: string;
  shortcut?: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  gradient?: boolean;
  description?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const [rippling, setRippling] = useState(false);
  const showOff = !on;
  let style: React.CSSProperties | undefined;
  let className =
    "group relative flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-all duration-150 overflow-visible ";

  if (gradient) {
    if (active) {
      className += "text-white shadow-lg";
      style = {
        background: "linear-gradient(135deg, var(--accent), #a855f7)",
        boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
      };
    } else {
      className += "text-white/70 hover:text-white";
      style = undefined;
    }
  } else if (danger) {
    className += "text-red-300 bg-red-500/15 hover:bg-red-500/25";
  } else if (active) {
    className += "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]";
  } else {
    className += "text-white/65 hover:bg-white/[0.08] hover:text-white";
  }

  function handleClick() {
    setRippling(true);
    setTimeout(() => setRippling(false), 600);
    onClick();
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-label={label}
      className={className}
      style={style}
    >
      {/* Ripple click effect */}
      {rippling && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-white/40 animate-ping" />
        </span>
      )}
      <span className="relative">
        {showOff && offIcon ? offIcon : onIcon}
        {badge !== undefined && badge > 0 && (
          <span
            className={
              "absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none " +
              (gradient ? "bg-amber-400 text-black animate-pulse" : "bg-red-500 text-white")
            }
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-[9px] font-medium leading-none">{label}</span>

      {/* Hover tooltip */}
      {hovering && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0a0a14]/95 px-2.5 py-1.5 text-[11px] text-white shadow-2xl backdrop-blur-xl animate-fadeIn">
          <span className="block text-center font-medium text-white/90">{label}</span>
          {(description || shortcut) && (
            <span className="mt-0.5 flex items-center justify-center gap-2 text-[10px] text-white/50">
              {description && <span>{description}</span>}
              {shortcut && <kbd className="rounded bg-white/10 px-1 font-mono text-[9px]">{shortcut}</kbd>}
            </span>
          )}
          <span className="absolute top-full left-1/2 -mt-px h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-[#0a0a14]" />
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-8 w-px bg-white/10" />;
}

function QualityIndicator({ quality }: { quality: "excellent" | "good" | "fair" | "poor" | "unknown" }) {
  const bars: Record<typeof quality, { filled: number; color: string; label: string }> = {
    excellent: { filled: 4, color: "bg-emerald-400", label: "Excellent" },
    good: { filled: 3, color: "bg-emerald-400", label: "Good" },
    fair: { filled: 2, color: "bg-amber-400", label: "Fair" },
    poor: { filled: 1, color: "bg-red-400", label: "Poor" },
    unknown: { filled: 2, color: "bg-white/30", label: "Connecting..." },
  };
  const cfg = bars[quality];
  return (
    <div className="flex h-12 w-14 flex-col items-center justify-center gap-0.5" title={`Connection: ${cfg.label}`}>
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
      <span className="text-[9px] font-medium leading-none text-white/60">{cfg.label}</span>
    </div>
  );
}

function MoreItem({
  icon, label, onClick, shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2.5">
        <span className="text-white/40">{icon}</span>
        {label}
      </span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

function RecBtnInline({ recording, setRecording, onClose, roomId, userName }: {
  recording: boolean;
  setRecording: (v: boolean) => void;
  onClose: () => void;
  roomId: string;
  userName: string;
}) {
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
      label={recording ? "Stop recording" : "Record this meeting"}
      onClick={recording ? stop : start}
    />
  );
}