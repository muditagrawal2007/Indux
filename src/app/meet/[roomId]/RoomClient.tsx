"use client";

// Main meeting room client — clean custom UI

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import { MeetingHeader } from "./MeetingHeader";
import { RoomToolbar } from "./RoomToolbar";
import { SidePanel } from "./SidePanel";
import { FloatingReactions } from "./Reactions";
import { InRoomSettings } from "./InRoomSettings";
import { NetworkStats } from "./NetworkStats";
import { QualityControl } from "./QualityControl";
import { ViewToggle } from "./ViewToggle";
import { ShortcutsHelp } from "./Shortcuts";
import { Icon } from "../../components/Icons";
import { CustomPreJoin } from "./CustomPreJoin";
import { CustomVideoGrid } from "./CustomVideoGrid";
import { LobbyScreen } from "./Lobby";

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
  const [bgMode, setBgMode] = useState<"none" | "blur">("none");

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
        bgMode={bgMode}
        onBgModeChange={setBgMode}
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
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-[color:var(--bg)] text-[color:var(--text-primary)]">
        <div className="aurora-bg" />
        <div className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]/80 p-8 text-center shadow-2xl backdrop-blur-md animate-scaleIn">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[color:var(--danger)]/15 text-[color:var(--danger)]">
            <Icon.Alert size={20} />
          </div>
          <h2 className="text-lg font-semibold">Connection error</h2>
          <p className="mt-2 max-w-sm text-sm text-[color:var(--text-secondary)]">{error}</p>
          <button onClick={() => { setError(null); setJoined(false); }} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-[color:var(--bg)] text-[color:var(--text-primary)]">
        <div className="aurora-bg" />
        <div className="relative flex flex-col items-center gap-4 animate-fadeIn">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-sm font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
          >
            IX
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-[color:var(--border)]">
            <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Connecting to <code className="font-mono text-[color:var(--text-primary)]">/{roomId}</code>...
          </p>
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
      style={{ height: "100dvh", width: "100vw" }}
    >
      <RoomAudioRenderer />
      <RoomV2
        roomId={roomId}
        isAdmin={initialIsAdmin}
        userName={userName}
        onLeave={() => window.history.back()}
        isEmbed={!!isEmbed}
        bgMode={bgMode}
      />
    </LiveKitRoom>
  );
}

function RoomV2({ roomId, isAdmin, userName, onLeave, isEmbed, bgMode }: { roomId: string; isAdmin: boolean; userName: string; onLeave: () => void; isEmbed: boolean; bgMode: "none" | "blur" }) {
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

  useEffect(() => {
    if (!roomState.participants?.length || !userName) { setInLobby(false); return; }
    const me = (roomState.participants as any[]).find((p: any) => p.identity === userName || p.name === userName);
    if (!me) { setInLobby(false); return; }
    const cantPublish = me.permission?.canPublish === false || me.isPublisher === false;
    setInLobby(cantPublish && !!roomState.locked);
  }, [roomState, userName]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [roomRes, partsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`).then((r) => r.json()),
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setRoomState({ locked: roomRes.room?.metadata?.locked === true, participants: partsRes.participants ?? [] });
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "?") setShowShortcuts(true);
      else if (k === "escape") { setShowShortcuts(false); setSidebarTab(null); }
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
    <div className="relative flex h-full w-full flex-col bg-black text-[color:var(--text-primary)]">
      <HandRaiseToasts roomId={roomId} userName={userName} />

      <MeetingHeader
        roomId={roomId}
        participantCount={roomState.participants?.length || 0}
        locked={!!roomState.locked}
        recording={recording}
        onShare={() => setShowShare(true)}
        onAdmin={() => setShowAdmin(true)}
        isAdmin={isAdmin}
        isEmbed={isEmbed}
      />

      {/* Main content area — video grid fills this, side panel overlays */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full w-full">
          <CustomVideoGrid viewMode={viewMode} userName={userName} />
          <FloatingReactions roomId={roomId} identity={userName} />
        </div>

        {/* View toggle — floating top-left inside video area */}
        {!isEmbed && (
          <div className="absolute top-3 left-3 z-20">
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
        )}

        {/* Bottom-left info badge */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
          {!isEmbed && (
            <>
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/50 backdrop-blur-sm hover:bg-black/70 hover:text-white/70 transition-colors"
                title="Keyboard shortcuts"
              >
                <Icon.Keyboard size={10} />
              </button>
              <NetworkStats />
            </>
          )}
        </div>

        {/* Side panel — OVERLAYS on top of the video grid */}
        {sidebarTab && (
          <div className="absolute inset-y-0 right-0 z-30 flex">
            <SidePanel
              roomId={roomId}
              identity={userName}
              userName={userName}
              isAdmin={isAdmin}
              tab={sidebarTab}
              onChangeTab={setSidebarTab}
              onClose={() => setSidebarTab(null)}
            />
          </div>
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
        onSettings={() => setInRoomSettings(true)}
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

function HandRaiseToasts({ roomId, userName }: { roomId: string; userName: string }) {
  const [toasts, setToasts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/hand`);
        const data = await r.json();
        if (cancelled) return;
        const hands = (data.participants ?? []).filter((p: any) => p.raisedHand);
        const newToasts: { id: string; name: string }[] = hands
          .filter((p: any) => p.name !== userName)
          .map((p: any) => ({ id: p.identity, name: p.name || p.identity }));
        setToasts((prev) => {
          const prevIds = new Set(prev.map((t) => t.id));
          return [...prev, ...newToasts.filter((nt) => !prevIds.has(nt.id))].slice(-3);
        });
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => !newToasts.find((n) => n.id === t.id)));
        }, 5000);
      } catch {}
    }
    check();
    const t = setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId, userName]);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-bounceIn flex items-center gap-2.5 rounded-full border border-[color:var(--warning)]/20 bg-black/70 px-4 py-2 text-sm text-[color:var(--warning)] shadow-lg backdrop-blur-md"
        >
          <Icon.Hand size={16} />
          <span className="font-medium">{toast.name}</span>
          <span className="text-[color:var(--warning)]/60">raised their hand</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-1 rounded-full p-0.5 text-[color:var(--warning)]/40 hover:text-[color:var(--warning)]"
          >
            <Icon.Close size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
