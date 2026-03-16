"use client";

// Bottom toolbar — mic, cam, share, leave, etc.
// Uses SVG icons (Heroicons-style) instead of emoji

import { useRef, useState } from "react";
import { Icon } from "../../components/Icons";

type Tab = "chat" | "people" | "qa" | "notes" | null;

export function RoomToolbar({
  roomId, userName, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onLeave,
}: {
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
  onLeave: () => void;
}) {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="font-mono text-xs">/{roomId}</span>
          {recording && (
            <span className="flex items-center gap-1.5 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              Rec
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <TBtn onClick={() => {}} label="Microphone" icon={<Icon.Mic />} />
          <TBtn onClick={() => {}} label="Camera" icon={<Icon.Video />} />
          <TBtn onClick={onShare} label="Share screen" icon={<Icon.ScreenShare />} primary />
          <TBtn onClick={() => onTab(activeTab === "chat" ? null : "chat")} label="Chat" icon={<Icon.MessageSquare />} active={activeTab === "chat"} />
          <TBtn onClick={() => onTab(activeTab === "people" ? null : "people")} label="People" icon={<Icon.Users />} active={activeTab === "people"} />
          <TBtn onClick={() => alert("Use the right side panel for polls")} label="Polls" icon={<Icon.BarChart />} />
          <TBtn
            onClick={async () => {
              await fetch(`/api/rooms/${roomId}/hand`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity: userName, action: "raise" }),
              });
            }}
            label="Raise hand"
            icon={<Icon.Hand />}
          />
          <TBtn onClick={onWhiteboard} label="Whiteboard" icon={<Icon.Pencil />} />
          <TBtn onClick={onNotes} label="Notes" icon={<Icon.FileText />} />
          <TBtn onClick={() => onTab(activeTab === "qa" ? null : "qa")} label="Questions" icon={<Icon.Help />} active={activeTab === "qa"} />
          <TBtn onClick={onTranscript} label="Transcript" icon={<Icon.FileText />} />
          {isAdmin && (
            <RecBtn
              roomId={roomId}
              userName={userName}
              recording={recording}
              setRecording={setRecording}
            />
          )}
        </div>

        <button
          onClick={onLeave}
          className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <Icon.PhoneOff size={16} />
          <span>Leave</span>
        </button>
      </div>
    </footer>
  );
}

function TBtn({ onClick, label, icon, active, primary }: { onClick: () => void; label: string; icon: React.ReactNode; active?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md transition-all " +
        (primary
          ? "bg-white text-black hover:bg-white/90"
          : active
          ? "text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white")
      }
      style={active ? { background: "var(--accent)" } : {}}
    >
      {icon}
    </button>
  );
}

function RecBtn({ roomId, userName, recording, setRecording }: { roomId: string; userName: string; recording: boolean; setRecording: (v: boolean) => void }) {
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
    } catch (e) {
      alert("Could not start recording: " + (e as Error).message);
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  return (
    <button
      onClick={recording ? stop : start}
      title={recording ? "Stop recording" : "Start recording"}
      aria-label={recording ? "Stop recording" : "Start recording"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md transition-all " +
        (recording
          ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
          : "text-white/70 hover:bg-white/10 hover:text-white")
      }
    >
      {recording ? <Icon.Stop size={14} /> : <Icon.Record size={14} />}
    </button>
  );
}
