"use client";

// Main meeting room client
// Designed to be FAST:
//  - Lazy-loads heavy panels (whiteboard, settings, transcript)
//  - Uses extracted side panels and toolbar
//  - Minimal re-renders

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  PreJoin,
  useLocalParticipant,
} from "@livekit/components-react";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import { MeetingHeader } from "./MeetingHeader";
import { RoomToolbar } from "./RoomToolbar";
import { SidePanel } from "./SidePanel";
import { FloatingReactions } from "./FloatingBits";
import { LobbyScreen } from "./Lobby";
import { NetworkStats } from "./NetworkStats";
import { QualityControl } from "./QualityControl";
import { ViewToggle } from "./ViewToggle";
import { ShortcutsHelp } from "./Shortcuts";

type Tab = "chat" | "people" | "qa" | "notes" | null;

// Lazy-load heavy panels — only fetch when opened
const AdminPanel = dynamic(() => import("./AdminPanel").then((m) => m.AdminPanel), { ssr: false });
const SettingsPanel = dynamic(() => import("./Settings").then((m) => m.SettingsPanel), { ssr: false });
const WhiteboardPanel = dynamic(() => import("./Whiteboard").then((m) => m.WhiteboardPanel), { ssr: false });
const TranscriptPanel = dynamic(() => import("./Transcript").then((m) => m.TranscriptPanel), { ssr: false });
const QAPanel = dynamic(() => import("./QA").then((m) => m.QAPanel), { ssr: false });
const NotesPanel = dynamic(() => import("./Notes").then((m) => m.NotesPanel), { ssr: false });
const ShareModal = dynamic(() => import("./FloatingBits").then((m) => m.ShareModal), { ssr: false });

export function RoomClient({ roomId, identity, isAdmin: initialIsAdmin, isEmbed, externalName }: { roomId: string; identity: string; isAdmin: boolean; isEmbed?: boolean; externalName?: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState(externalName || identity);
  const [joined, setJoined] = useState(false);
  const [accent, setAccent] = useState("indigo");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const a = localStorage.getItem("indux_accent") || "indigo";
      setAccent(a);
      document.documentElement.dataset.accent = a;
    }
  }, []);

  async function fetchToken(who: string, admin: boolean) {
    setError(null);
    try {
      const r = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, identity: who, name: who, isAdmin: admin }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `Token request failed: ${r.status}`);
      }
      const data = await r.json();
      setToken(data.token);
      setServerUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!joined) {
    return (
      <PreJoin
        defaults={{ username: externalName || userName, videoEnabled: true, audioEnabled: true }}
        onSubmit={(values) => {
          const name = values.username?.trim() || identity;
          setUserName(name);
          setJoined(true);
          fetchToken(name, initialIsAdmin);
        }}
        onError={(err) => setError(err.message)}
        joinLabel="Join meeting"
        micLabel="Microphone"
        camLabel="Camera"
        userLabel="Your name"
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6 text-center text-gray-900 dark:bg-gray-950 dark:text-white">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-sm text-red-600 dark:text-red-400">Connection error</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button onClick={() => { setError(null); setJoined(false); }} className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-950 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <p className="text-sm">Connecting to <code className="font-mono">/{roomId}</code>…</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video
      audio
      data-lk-theme="default"
      style={{ height: "100vh", width: "100vw" }}
      onDisconnected={() => router.push("/")}
    >
      <RoomAudioRenderer />
      <RoomV2
        roomId={roomId}
        isAdmin={initialIsAdmin}
        userName={userName}
        onLeave={() => router.push("/")}
        isEmbed={!!isEmbed}
      />
    </LiveKitRoom>
  );
}

function RoomV2({ roomId, isAdmin, userName, onLeave, isEmbed }: { roomId: string; isAdmin: boolean; userName: string; onLeave: () => void; isEmbed: boolean }) {
  const [roomState, setRoomState] = useState<any>({ participants: [] });
  const [recording, setRecording] = useState(false);
  const [viewMode, setViewMode] = useState<"tile" | "stage">("tile");
  const [sidebarTab, setSidebarTab] = useState<Tab>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [inLobby, setInLobby] = useState(false);

  // Poll room state
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [roomRes, partsRes, settingsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/settings`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setRoomState({
          locked: roomRes.room?.metadata?.locked === true,
          participants: partsRes.participants ?? [],
        });
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  // Lobby detection
  useEffect(() => {
    if (!roomState.participants?.length || !userName) return;
    const me = (roomState.participants as any[]).find(
      (p: any) => p.identity === userName || p.name === userName
    );
    if (me && me.isMuted && me.isPublisher === false && roomState.locked) {
      setInLobby(true);
    } else {
      setInLobby(false);
    }
  }, [roomState, userName]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "?") setShowShortcuts(true);
      else if (k === "escape") setShowShortcuts(false);
      else if (k === "c") setSidebarTab((t) => (t === "chat" ? null : "chat"));
      else if (k === "p") setSidebarTab((t) => (t === "people" ? null : "people"));
      else if (k === "q") setSidebarTab((t) => (t === "qa" ? null : "qa"));
      else if (k === "n") setSidebarTab((t) => (t === "notes" ? null : "notes"));
      else if (k === "w") setShowWhiteboard(true);
      else if (k === "s" && isAdmin) setShowSettings(true);
      else if (k === "r") {
        fetch(`/api/rooms/${roomId}/hand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: userName, action: "raise" }),
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [roomId, userName, isAdmin]);

  if (inLobby) {
    return (
      <LobbyScreen
        roomId={roomId}
        identity={userName}
        userName={userName}
        onAdmitted={() => setInLobby(false)}
        onLeave={onLeave}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0a0a0f] text-white">
      <MeetingHeader
        roomId={roomId}
        participantCount={roomState.participants?.length || 0}
        locked={!!roomState.locked}
        recording={recording}
        onShare={() => setShowShare(true)}
        onAdmin={() => setShowAdmin(true)}
        onSettings={() => setShowSettings(true)}
        onChat={() => setSidebarTab("chat")}
        onPeople={() => setSidebarTab("people")}
        isAdmin={isAdmin}
        isEmbed={isEmbed}
      />

      {!isEmbed && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-1.5 text-xs">
          <ViewToggle view={viewMode} onViewChange={setViewMode} pinned={null} onPinChange={() => {}} />
          <span className="text-white/20">|</span>
          <QualityControl />
          <NetworkStats />
          <span className="text-white/20">|</span>
          <button
            onClick={() => setShowShortcuts(true)}
            className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white/70 hover:bg-white/10"
            title="Keyboard shortcuts"
          >
            <kbd>?</kbd>
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          <VideoConference />
          <FloatingReactions roomId={roomId} />
        </main>
        {sidebarTab && (
          <SidePanel
            roomId={roomId}
            identity={userName}
            userName={userName}
            isAdmin={isAdmin}
            tab={sidebarTab}
            onChangeTab={setSidebarTab}
            onClose={() => setSidebarTab(null)}
          />
        )}
      </div>

      <RoomToolbar
        roomId={roomId}
        userName={userName}
        isAdmin={isAdmin}
        recording={recording}
        setRecording={setRecording}
        activeTab={sidebarTab}
        onTab={setSidebarTab}
        onShare={() => setShowShare(true)}
        onWhiteboard={() => setShowWhiteboard(true)}
        onNotes={() => setShowNotes(true)}
        onTranscript={() => setShowTranscript(true)}
        onLeave={onLeave}
      />

      {/* Lazy-loaded overlays */}
      {showShare && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />}
      {showSettings && isAdmin && <SettingsPanel roomId={roomId} onClose={() => setShowSettings(false)} />}
      {showAdmin && isAdmin && (
        <AdminPanel
          roomId={roomId}
          participants={roomState.participants || []}
          locked={!!roomState.locked}
          onClose={() => setShowAdmin(false)}
          onChanged={() => window.location.reload()}
        />
      )}
      {showWhiteboard && <WhiteboardPanel roomId={roomId} onClose={() => setShowWhiteboard(false)} />}
      {showQA && <QAPanel roomId={roomId} identity={userName} userName={userName} isAdmin={isAdmin} onClose={() => setShowQA(false)} />}
      {showTranscript && <TranscriptPanel roomId={roomId} identity={userName} userName={userName} onClose={() => setShowTranscript(false)} />}
      {showNotes && <NotesPanel roomId={roomId} identity={userName} userName={userName} onClose={() => setShowNotes(false)} />}
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}