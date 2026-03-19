"use client";

// Floating pill toolbar — bottom-center, dark glass
// Matches Zoom/Google Meet/LiveKit Meet patterns

import { useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Icon, Reaction } from "../../components/Icons";

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
  canPublish?: boolean;
};

export function RoomToolbar({
  roomId, userName, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onSettings, onLeave,
  canPublish = true,
}: Props) {
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useStateLocal(true);
  const [camOn, setCamOn] = useStateLocal(true);
  const [reactionsOpen, setReactionsOpen] = useStateLocal(false);
  const [moreOpen, setMoreOpen] = useStateLocal(false);

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

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-5">
      {/* Status badges above toolbar */}
      {(recording || !canPublish) && (
        <div className="mb-2 flex justify-center gap-2">
          {recording && (
            <span className="animate-bounceIn flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-red-400 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              REC
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
          label={micOn ? "Mute" : "Unmute"}
        />
        <PillButton
          active={camOn}
          activeIcon={<Icon.Video size={18} />}
          inactiveIcon={<Icon.VideoOff size={18} />}
          onClick={toggleCam}
          label={camOn ? "Stop Video" : "Start Video"}
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
          label="Chat"
          highlight={activeTab === "chat"}
        />
        <PillButton
          active
          activeIcon={<Icon.Users size={18} />}
          onClick={() => onTab(activeTab === "people" ? null : "people")}
          label="People"
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

        {/* More */}
        <div className="relative">
          <PillButton
            active
            activeIcon={<Icon.More size={18} />}
            onClick={() => setMoreOpen(!moreOpen)}
            label="More"
          />
          {moreOpen && (
            <div
              className="absolute bottom-full right-0 mb-3 w-52 rounded-xl border border-white/10 bg-[#1a1a24]/95 p-1 shadow-2xl backdrop-blur-xl animate-scaleIn"
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
