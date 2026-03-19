"use client";

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";

type Settings = {
  waitingRoom: boolean;
  allowJoinBeforeHost: boolean;
  muteOnJoin: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowReactions: boolean;
  allowHandRaise: boolean;
  allowPolls: boolean;
  allowWhiteboard: boolean;
  allowNotes: boolean;
  allowQA: boolean;
  requirePassword: boolean;
  password?: string;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  e2eeEnabled: boolean;
  maxParticipants: number;
};

const DEFAULTS: Settings = {
  waitingRoom: false,
  allowJoinBeforeHost: true,
  muteOnJoin: false,
  allowScreenShare: true,
  allowChat: true,
  allowReactions: true,
  allowHandRaise: true,
  allowPolls: true,
  allowWhiteboard: true,
  allowNotes: true,
  allowQA: true,
  requirePassword: false,
  recordingEnabled: true,
  transcriptionEnabled: false,
  e2eeEnabled: false,
  maxParticipants: 100,
};

const LABELS: Record<keyof Settings, { label: string; desc: string; type?: "password" | "number" }> = {
  waitingRoom: { label: "Waiting room", desc: "Require admin to admit new joiners" },
  allowJoinBeforeHost: { label: "Join before host", desc: "Let users enter before admin arrives" },
  muteOnJoin: { label: "Mute on join", desc: "Participants join with mic muted" },
  allowScreenShare: { label: "Screen share", desc: "Let participants share their screen" },
  allowChat: { label: "In-room chat", desc: "Text chat during the meeting" },
  allowReactions: { label: "Reactions", desc: "Thumbs, Clap, Love, Laugh, Fire, Celebrate" },
  allowHandRaise: { label: "Raise hand", desc: "Participants can raise hand" },
  allowPolls: { label: "Polls", desc: "Live polls for audience input" },
  allowWhiteboard: { label: "Whiteboard", desc: "Collaborative drawing canvas" },
  allowNotes: { label: "Shared notes", desc: "Collaborative Markdown notes" },
  allowQA: { label: "Q&A mode", desc: "Audience asks, host answers" },
  requirePassword: { label: "Require password", desc: "Joiners must enter a password" },
  password: { label: "Password", desc: "Room password", type: "password" },
  recordingEnabled: { label: "Recording", desc: "Allow in-browser recording" },
  transcriptionEnabled: { label: "Transcription", desc: "Auto-transcribe the meeting" },
  e2eeEnabled: { label: "End-to-end encryption", desc: "E2EE for max privacy (may reduce features)" },
  maxParticipants: { label: "Max participants", desc: "Hard cap on concurrent users", type: "number" },
};

export function SettingsPanel({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/settings`).then((r) => r.json()).then((d) => setSettings({ ...DEFAULTS, ...d.settings }));
  }, [roomId]);

  async function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
    // Save immediately for snappiness
    await fetch(`/api/rooms/${roomId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="absolute right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-800 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Meeting settings</h2>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[11px] text-green-400">Saved OK</span>}
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"><Icon.Close size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-xs text-gray-500">
          Toggle any feature on or off. Changes apply immediately to everyone in the room.
        </p>
        <div className="space-y-1">
          {(Object.keys(LABELS) as (keyof Settings)[]).map((key) => {
            const meta = LABELS[key];
            const value = settings[key];
            if (meta.type === "password") {
              return (
                <div key={key} className="rounded border border-gray-800 bg-gray-900 p-3">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-[11px] text-gray-500">{meta.desc}</div>
                  <input
                    type="password"
                    value={value as string}
                    onChange={(e) => update(key, e.target.value as any)}
                    placeholder="Set a password"
                    className="mt-2 w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm placeholder-gray-600"
                  />
                </div>
              );
            }
            if (meta.type === "number") {
              return (
                <div key={key} className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-[11px] text-gray-500">{meta.desc}</div>
                  </div>
                  <input
                    type="number"
                    value={value as number}
                    onChange={(e) => update(key, Number(e.target.value) as any)}
                    min={1}
                    max={10000}
                    className="w-20 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                  />
                </div>
              );
            }
            return (
              <div key={key} className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 px-3 py-2">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-[11px] text-gray-500">{meta.desc}</div>
                </div>
                <button
                  onClick={() => update(key, !value as any)}
                  className={
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
                    (value ? "bg-green-600" : "bg-gray-700")
                  }
                >
                  <span
                    className={
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
                      (value ? "translate-x-5" : "translate-x-0.5")
                    }
                  />
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={async () => {
            await fetch(`/api/rooms/${roomId}/settings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(DEFAULTS),
            });
            setSettings(DEFAULTS);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="mt-4 w-full rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}