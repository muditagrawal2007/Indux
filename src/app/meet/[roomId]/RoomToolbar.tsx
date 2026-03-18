"use client";

// Zoom-style bottom toolbar
// Round buttons with text labels
// Mute=red when muted, Stop Video=red when cam off (Zoom signature)

import { useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Icon } from "../../components/Icons";

type Tab = "chat" | "people" | "qa" | "notes" | null;

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
};

export function RoomToolbar({
  roomId, userName, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onSettings, onLeave,
}: Props) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useStateLocal(true);
  const [camOn, setCamOn] = useStateLocal(true);
  const [reactionsOpen, setReactionsOpen] = useStateLocal(false);
  const [moreOpen, setMoreOpen] = useStateLocal(false);

  async function toggleMic() {
    if (!localParticipant) return;
    const next = !micOn;
    setMicOn(next);
    await localParticipant.setMicrophoneEnabled(next);
  }

  async function toggleCam() {
    if (!localParticipant) return;
    const next = !camOn;
    setCamOn(next);
    await localParticipant.setCameraEnabled(next);
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

  return (
    <footer className="border-t border-black/30 bg-[#0a0a0f] px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        {/* Left: room info */}
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span className="font-mono text-xs">/{roomId}</span>
          {recording && (
            <span className="flex items-center gap-1.5 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              Recording
            </span>
          )}
        </div>

        {/* Center: Zoom-style round buttons */}
        <div className="flex items-center gap-2">
          <ZoomButton
            active={micOn}
            activeIcon={<Icon.Mic size={20} />}
            inactiveIcon={<Icon.MicOff size={20} />}
            onClick={toggleMic}
            labelActive="Mute"
            labelInactive="Unmute"
          />
          <ZoomButton
            active={camOn}
            activeIcon={<Icon.Video size={20} />}
            inactiveIcon={<Icon.VideoOff size={20} />}
            onClick={toggleCam}
            labelActive="Stop Video"
            labelInactive="Start Video"
          />
          <ZoomButton
            active
            activeIcon={<Icon.ScreenShare size={20} />}
            onClick={onShare}
            labelActive="Share"
            alwaysActive
          />
          <ZoomButton
            active
            activeIcon={<Icon.MessageSquare size={20} />}
            onClick={() => onTab(activeTab === "chat" ? null : "chat")}
            labelActive="Chat"
            highlight={activeTab === "chat"}
          />
          <ZoomButton
            active
            activeIcon={<Icon.Users size={20} />}
            onClick={() => onTab(activeTab === "people" ? null : "people")}
            labelActive="Participants"
            highlight={activeTab === "people"}
          />
          <ZoomButton
            active
            activeIcon={<Icon.BarChart size={20} />}
            onClick={() => onTab(activeTab === "qa" ? null : "qa")}
            labelActive="Polls"
            highlight={activeTab === "qa"}
          />

          {/* Reactions menu */}
          <div className="relative">
            <ZoomButton
              active
              activeIcon={<span className="text-lg">😀</span>}
              onClick={() => setReactionsOpen((v) => !v)}
              labelActive="Reactions"
              alwaysActive
            />
            {reactionsOpen && (
              <div
                className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#1a1a25] p-1.5 shadow-2xl"
                onMouseLeave={() => setReactionsOpen(false)}
              >
                <div className="flex gap-0.5">
                  {[{ e: "thumbs", icon: "👍" }, { e: "clap", icon: "👏" }, { e: "heart", icon: "❤" }, { e: "laugh", icon: "😂" }, { e: "fire", icon: "🔥" }, { e: "party", icon: "🎉" }].map((r) => (
                    <button
                      key={r.e}
                      onClick={() => sendReaction(r.e)}
                      className="grid h-10 w-10 place-items-center rounded-xl text-2xl hover:bg-white/10 hover:scale-125 transition-transform"
                      title={r.e}
                    >
                      {r.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* More menu */}
          <div className="relative">
            <ZoomButton
              active
              activeIcon={<Icon.More size={20} />}
              onClick={() => setMoreOpen((v) => !v)}
              labelActive="More"
              alwaysActive
            />
            {moreOpen && (
              <div
                className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#1a1a25] p-1 shadow-2xl"
                onMouseLeave={() => setMoreOpen(false)}
              >
                <MoreItem icon={<Icon.Hand size={16} />} label="Raise hand" onClick={() => { raiseHand(); setMoreOpen(false); }} />
                <MoreItem icon={<Icon.Pencil size={16} />} label="Whiteboard" onClick={() => { onWhiteboard(); setMoreOpen(false); }} />
                <MoreItem icon={<Icon.FileText size={16} />} label="Notes" onClick={() => { onNotes(); setMoreOpen(false); }} />
                <MoreItem icon={<Icon.FileText size={16} />} label="Transcript" onClick={() => { onTranscript(); setMoreOpen(false); }} />
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
        </div>

        {/* Right: Leave */}
        <button
          onClick={onLeave}
          className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          End
        </button>
      </div>
    </footer>
  );
}

// Mini useState wrapper
function useStateLocal<T>(initial: T): [T, (v: T) => void] {
  const ref = useRef(initial);
  const [, force] = React.useState(0);
  return [
    ref.current,
    (v: T) => {
      ref.current = v;
      force((n) => n + 1);
    },
  ];
}

import * as React from "react";

function ZoomButton({
  active, activeIcon, inactiveIcon, onClick, labelActive, labelInactive, alwaysActive, highlight,
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  onClick: () => void;
  labelActive: string;
  labelInactive?: string;
  alwaysActive?: boolean;
  highlight?: boolean;
}) {
  const isOff = !active && !alwaysActive;
  return (
    <button
      onClick={onClick}
      title={alwaysActive ? labelActive : (active ? labelActive : (labelInactive ?? labelActive))}
      aria-label={alwaysActive ? labelActive : (active ? labelActive : (labelInactive ?? labelActive))}
      className="group flex flex-col items-center gap-0.5"
    >
      <span
        className={
          "flex h-10 w-10 items-center justify-center rounded-full transition-all " +
          (highlight
            ? "text-white"
            : isOff
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-[#3a3b40] text-white hover:bg-[#4a4b50]")
        }
        style={highlight ? { background: "var(--accent)" } : {}}
      >
        {active ? activeIcon : (inactiveIcon ?? activeIcon)}
      </span>
      <span className="text-[10px] text-white/60 group-hover:text-white/80">
        {alwaysActive ? labelActive : (active ? labelActive : (labelInactive ?? labelActive))}
      </span>
    </button>
  );
}

function MoreItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
    >
      <span className="text-white/50">{icon}</span>
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