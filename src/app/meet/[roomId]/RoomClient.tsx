"use client";

// Main meeting room client — clean custom UI (no LiveKit defaults)
// Uses LiveKit only for the WebRTC connection, renders everything ourselves

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import { MeetingHeader } from "./MeetingHeader";
import { RoomToolbar } from "./RoomToolbar";
import { SidePanel } from "./SidePanel";
import { FloatingReactions } from "./Reactions";
import { InRoomSettings } from "./InRoomSettings";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { LobbyScreen } from "./Lobby";
import { NetworkStats } from "./NetworkStats";
import { QualityControl } from "./QualityControl";
import { ViewToggle } from "./ViewToggle";
import { ShortcutsHelp } from "./Shortcuts";
import { Icon } from "../../components/Icons";
import { CustomPreJoin } from "./CustomPreJoin";
import { CustomVideoGrid } from "./CustomVideoGrid";

type Tab = "chat" | "people" | "qa" | "notes" | null;

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

  const [initialAudioOn, setInitialAudioOn] = useState(true);
  const [initialVideoOn, setInitialVideoOn] = useState(true);

  if (!joined) {
    return (
      <CustomPreJoin
        roomId={roomId}
        isAdmin={initialIsAdmin}
        initialName={userName}
        isEmbed={!!isEmbed}
        onJoin={(name, a, v) => {
          setUserName(name);
          setInitialAudioOn(a);
          setInitialVideoOn(v);
          setJoined(true);
          fetchToken(name, initialIsAdmin);
        }}
        onLeave={() => window.history.back()}
      />
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0f] text-white">
        <div className="rounded-2xl border border-white/10 bg-[#15151b] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-500/15 text-red-300">
            <Icon.Alert size={20} />
          </div>
          <h2 className="text-lg font-semibold">Connection error</h2>
          <p className="mt-2 max-w-sm text-sm text-white/60">{error}</p>
          <button
            onClick={() => { setError(null); setJoined(false); }}
            className="mt-6 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0f] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <p className="text-sm text-white/60">Connecting to <code className="font-mono text-white/80">/{roomId}</code>...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video={initialVideoOn}
      audio={initialAudioOn}
      data-lk-theme="default"
      style={{ height: "100vh", width: "100vw" }}
    >
      <RoomAudioRenderer />
      <RoomV2
        roomId={roomId}
        isAdmin={initialIsAdmin}
        userName={userName}
        onLeave={() => window.history.back()}
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
  const [inRoomSettings, setInRoomSettings] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [inLobby, setInLobby] = useState(false);

// Detect lobby state — disabled track controls if user can't publish
  useEffect(() => {
    if (!roomState.participants?.length || !userName) {
      setInLobby(false);
      return;
    }
    const me = (roomState.participants as any[]).find(
      (p: any) => p.identity === userName || p.name === userName
    );
    if (!me) {
      setInLobby(false);
      return;
    }
    const cantPublish = me.permission?.canPublish === false ||
                        me.isPublisher === false;
    setInLobby(cantPublish && !!roomState.locked);
  }, [roomState, userName]);

  // Poll room state
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [roomRes, partsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()),
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
        onLeave={() => window.history.back()}
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
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#0f0f14] px-5 py-1.5 text-xs">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <span className="h-3 w-px bg-white/10" />
          <QualityControl />
          <NetworkStats />
          <button
            onClick={() => setShowShortcuts(true)}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-white/40 hover:bg-white/5 hover:text-white"
            title="Keyboard shortcuts"
          >
            <Icon.Keyboard size={11} />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden bg-[#0a0a0f]">
          <CustomVideoGrid viewMode={viewMode} userName={userName} />
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
        canPublish={!inLobby}
      />

      {showShare && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />}
      {showSettings && isAdmin && <SettingsPanel roomId={roomId} onClose={() => setShowSettings(false)} />}
      {inRoomSettings && <InRoomSettings onClose={() => setInRoomSettings(false)} />}
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
