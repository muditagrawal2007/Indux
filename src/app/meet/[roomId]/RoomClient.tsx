"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  roomId: string;
  identity: string;
  isAdmin: boolean;
  isEmbed?: boolean;
  externalName?: string | null;
};

export function RoomClient({ roomId, identity, isAdmin: initialIsAdmin, isEmbed, externalName }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState(externalName || identity);
  const [joined, setJoined] = useState(false);
  const [accent, setAccent] = useState("indigo");
  const router = useRouter();

  // Load saved accent for in-room
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
      <PreJoinV2
        roomId={roomId}
        isAdmin={initialIsAdmin}
        initialName={userName}
        onJoin={(name) => {
          setUserName(name);
          setJoined(true);
          fetchToken(name, initialIsAdmin);
        }}
        onLeave={() => router.push("/")}
        isEmbed={!!isEmbed}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6 text-center text-gray-900 dark:bg-gray-950 dark:text-white mesh-bg">
        <div className="animate-fadeIn rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            ✕
          </div>
          <h2 className="text-lg font-semibold">Connection error</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => { setError(null); setJoined(false); }}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white mesh-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connecting to <code className="font-mono">/{roomId}</code>…</p>
        </div>
      </div>
    );
  }

  return (
    <RoomV2
      roomId={roomId}
      isAdmin={initialIsAdmin}
      userName={userName}
      token={token}
      serverUrl={serverUrl}
      isEmbed={!!isEmbed}
      onLeave={() => router.push("/")}
    />
  );
}

// ================================================================
// PREJOIN V2 — Beautiful, branded, professional
// ================================================================
function PreJoinV2({
  roomId,
  initialName,
  isAdmin,
  onJoin,
  onLeave,
  isEmbed,
}: {
  roomId: string;
  initialName: string;
  isAdmin: boolean;
  onJoin: (name: string) => void;
  onLeave: () => void;
  isEmbed: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [bgBlur, setBgBlur] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to get camera/mic preview
  useEffect(() => {
    let cancelled = false;
    async function getMedia() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        // User denied or no device
      }
    }
    getMedia();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle mic/cam
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = audioOn));
    stream.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [audioOn, videoOn, stream]);

  return (
    <div className="min-h-screen w-screen text-[color:var(--text-primary)] mesh-bg relative">
      <div className="aurora-bg" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
            >
              IX
            </div>
            <div>
              <div className="text-sm font-semibold">Indux Meet</div>
              <div className="text-[10px] text-[color:var(--text-tertiary)]">
                Ready to connect
              </div>
            </div>
          </div>
          {!isEmbed && (
            <button onClick={onLeave} className="btn-ghost text-sm">
              ← Back
            </button>
          )}
        </header>

        {/* Main */}
        <div className="my-auto grid grid-cols-1 gap-8 pt-12 lg:grid-cols-[1fr_400px]">
          {/* Video preview */}
          <div className="animate-fadeIn">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={"h-full w-full object-cover transition-all " + (bgBlur ? "[filter:blur(8px)]" : "")}
              />
              {!videoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95">
                  <div className="text-center">
                    <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--brand-700)] grid place-items-center text-2xl font-semibold text-white">
                      {name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="mt-3 text-sm text-white/80">Camera is off</div>
                  </div>
                </div>
              )}
              {!stream && videoOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/60">
                    <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-white/30" />
                    <div className="mt-3 text-xs">Connecting camera…</div>
                  </div>
                </div>
              )}

              {/* Top-right control strip */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/30 p-1 backdrop-blur">
                <button
                  onClick={() => setBgBlur((v) => !v)}
                  className={
                    "rounded-md px-2 py-1 text-[10px] font-medium " +
                    (bgBlur ? "bg-white text-black" : "text-white hover:bg-white/10")
                  }
                  title="Blur background"
                >
                  {bgBlur ? "Blur on" : "BG"}
                </button>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/40 p-1.5 backdrop-blur">
                <PreviewButton
                  active={audioOn}
                  onClick={() => setAudioOn((v) => !v)}
                  on={audioOn}
                  label={audioOn ? "Mic on" : "Mic off"}
                  icon="🎙"
                />
                <PreviewButton
                  active={videoOn}
                  onClick={() => setVideoOn((v) => !v)}
                  on={videoOn}
                  label={videoOn ? "Cam on" : "Cam off"}
                  icon="📹"
                />
              </div>

              {/* Bottom-left name pill */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {name || "You"}
              </div>
            </div>

            {/* Quick tips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd>?</kbd> Show shortcuts
              </span>
              <span>·</span>
              <span>Press <kbd>Enter</kbd> to join when ready</span>
            </div>
          </div>

          {/* Side panel */}
          <div className="animate-fadeIn stagger-1 flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Joining
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {isAdmin ? "Host this meeting" : "Ready to join"}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                <code className="rounded bg-[color:var(--bg-sunken)] px-1.5 py-0.5 font-mono">/{roomId}</code>
                {isAdmin && <span className="badge badge-info">Admin</span>}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[color:var(--text-secondary)]">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name.trim())}
                placeholder="How should others see you?"
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15"
              />
            </div>

            <button
              onClick={() => name.trim() && onJoin(name.trim())}
              disabled={!name.trim()}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50"
            >
              Join meeting
            </button>

            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-3 text-xs text-[color:var(--text-secondary)]">
              <div className="font-medium text-[color:var(--text-primary)]">Ready to start?</div>
              <p className="mt-1">
                Your camera and mic will connect once you join. You can mute, hide, or share anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewButton({ active, onClick, on, label, icon }: { active: boolean; onClick: () => void; on: boolean; label: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all " +
        (on ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/90 text-white hover:bg-red-500")
      }
    >
      {icon}
    </button>
  );
}

// ================================================================
// ROOM V2 — Beautiful in-room experience
// ================================================================
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useConnectionState,
} from "@livekit/components-react";
import { Track, ConnectionState as LKState, Room } from "livekit-client";
import "@livekit/components-styles";
import { useEffect as useEffect2, useState as useState2 } from "react";
import { WhiteboardPanel } from "./Whiteboard";
import { NotesPanel } from "./Notes";
import { QAPanel } from "./QA";
import { SettingsPanel } from "./Settings";
import { BackgroundEffects } from "./BackgroundEffects";
import { TranscriptPanel } from "./Transcript";
import { LobbyScreen } from "./Lobby";
import { NetworkStats } from "./NetworkStats";
import { QualityControl } from "./QualityControl";
import { ViewToggle } from "./ViewToggle";
import { MeetingHeader } from "./MeetingHeader";
import { ShortcutsHelp } from "./Shortcuts";

function RoomV2({
  roomId,
  isAdmin,
  userName,
  token,
  serverUrl,
  isEmbed,
  onLeave,
}: {
  roomId: string;
  isAdmin: boolean;
  userName: string;
  token: string;
  serverUrl: string;
  isEmbed: boolean;
  onLeave: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inLobby, setInLobby] = useState(false);
  const [roomState, setRoomState] = useState<any>({ participants: [] });
  const [recording, setRecording] = useState(false);
  const [viewMode, setViewMode] = useState<"tile" | "stage">("tile");
  const [sidebarTab, setSidebarTab] = useState<"chat" | "people" | "qa" | "polls" | "notes" | null>(null);
  const [accent, setAccent] = useState("indigo");

  useEffect2(() => {
    if (typeof window !== "undefined") {
      const a = localStorage.getItem("indux_accent") || "indigo";
      setAccent(a);
      document.documentElement.dataset.accent = a;
    }
  }, []);

  // Poll room state
  useEffect2(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [roomRes, partsRes, settingsRes] = await Promise.all([
          fetch(`/api/rooms/${encodeURIComponent(roomId)}`).then((r) => r.json()),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}/participants`).then((r) => r.json()),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}/settings`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setRoomState({
          locked: roomRes.room?.metadata?.locked === true,
          participants: partsRes.participants ?? [],
          settings: settingsRes.settings,
        });
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  // Lobby detection
  useEffect2(() => {
    if (!roomState.participants || !userName) return;
    const me = (roomState.participants as any[]).find(
      (p: any) => p.identity === userName || p.name === userName
    );
    if (roomState.participants.length === 0) return;
    if (me && me.isMuted && me.isPublisher === false && roomState.locked) {
      setInLobby(true);
    } else {
      setInLobby(false);
    }
  }, [roomState, userName]);

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
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video
      audio
      data-lk-theme="default"
      style={{ height: "100vh", width: "100vw" }}
      onDisconnected={onLeave}
    >
      <RoomAudioRenderer />
      <RoomShell
        roomId={roomId}
        isAdmin={isAdmin}
        userName={userName}
        recording={recording}
        setRecording={setRecording}
        viewMode={viewMode}
        setViewMode={setViewMode}
        roomState={roomState}
        onShare={() => setShowShare(true)}
        onAdmin={() => setShowAdmin(true)}
        onSettings={() => setShowSettings(true)}
        onChat={() => { setShowChat(true); setSidebarTab("chat"); }}
        onPeople={() => { setShowPeople(true); setSidebarTab("people"); }}
        onQAPanel={() => { setShowQA(true); setSidebarTab("qa"); }}
        onTranscript={() => { setShowTranscript(true); setSidebarTab(null); }}
        onNotes={() => { setShowNotes(true); setSidebarTab("notes"); }}
        onWhiteboard={() => { setShowWhiteboard(true); setSidebarTab(null); }}
        showShare={showShare}
        setShowShare={setShowShare}
        showAdmin={showAdmin}
        setShowAdmin={setShowAdmin}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showChat={showChat}
        setShowChat={setShowChat}
        showPeople={showPeople}
        setShowPeople={setShowPeople}
        showQA={showQA}
        setShowQA={setShowQA}
        showTranscript={showTranscript}
        setShowTranscript={setShowTranscript}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        showWhiteboard={showWhiteboard}
        setShowWhiteboard={setShowWhiteboard}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        isEmbed={isEmbed}
      />
    </LiveKitRoom>
  );
}

// Beautiful room shell with sidebar
function RoomShell({
  roomId, isAdmin, userName, recording, setRecording, viewMode, setViewMode, roomState,
  onShare, onAdmin, onSettings, onChat, onPeople, onQAPanel, onTranscript, onNotes, onWhiteboard,
  showShare, setShowShare, showAdmin, setShowAdmin, showSettings, setShowSettings,
  showChat, setShowChat, showPeople, setShowPeople, showQA, setShowQA, showTranscript, setShowTranscript,
  showNotes, setShowNotes, showWhiteboard, setShowWhiteboard, sidebarTab, setSidebarTab, isEmbed,
}: any) {
  const [showShortcuts, setShowShortcuts] = useState2(false);
  const hasSidebar = !!sidebarTab;

  // Keyboard shortcuts
  useEffect2(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "?") { setShowShortcuts(true); return; }
      if (k === "escape") { setShowShortcuts(false); return; }
      if (k === "c") { setSidebarTab(sidebarTab === "chat" ? null : "chat"); return; }
      if (k === "p") { setSidebarTab(sidebarTab === "people" ? null : "people"); return; }
      if (k === "q") { setSidebarTab(sidebarTab === "qa" ? null : "qa"); return; }
      if (k === "n") { setSidebarTab(sidebarTab === "notes" ? null : "notes"); return; }
      if (k === "w") { onWhiteboard(); return; }
      if (k === "s") { if (isAdmin) onSettings(); return; }
      if (k === "r") {
        fetch(`/api/rooms/${roomId}/hand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: userName, action: "raise" }),
        });
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [roomId, userName, isAdmin, sidebarTab]);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0a0a0f] text-white">
      <MeetingHeader
        roomId={roomId}
        participantCount={roomState.participants?.length || 0}
        locked={!!roomState.locked}
        recording={recording}
        onShare={onShare}
        onAdmin={onAdmin}
        onSettings={onSettings}
        onChat={onChat}
        onPeople={onPeople}
        isAdmin={isAdmin}
        isEmbed={isEmbed}
      />

      {/* In-room control strip */}
      {!isEmbed && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-black/40 px-4 py-1.5 text-xs">
          <ViewToggle view={viewMode} onViewChange={setViewMode} pinned={null} onPinChange={() => {}} />
          <span className="text-white/20">|</span>
          <QualityControl />
          <NetworkStats />
          <span className="text-white/20">|</span>
          <button
            onClick={() => setShowShortcuts(true)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10"
            title="Keyboard shortcuts (?)"
          >
            <kbd>?</kbd>
          </button>
        </div>
      )}

      {/* Shortcuts overlay */}
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main video area */}
        <main className={"relative flex-1 overflow-hidden transition-all " + (hasSidebar ? "mr-0" : "")}>
          <VideoConference />
          <FloatingReactions roomId={roomId} identity={userName} />
        </main>

        {/* Side panel (chat, people, qa, notes) */}
        {hasSidebar && (
          <SidePanel
            roomId={roomId}
            userName={userName}
            identity={userName}
            isAdmin={isAdmin}
            tab={sidebarTab}
            onChangeTab={setSidebarTab}
            onClose={() => setSidebarTab(null)}
          />
        )}
      </div>

      {/* Bottom toolbar */}
      <RoomToolbar
        roomId={roomId}
        userName={userName}
        identity={userName}
        isAdmin={isAdmin}
        recording={recording}
        setRecording={setRecording}
        activeTab={sidebarTab}
        onTab={setSidebarTab}
        onShare={onShare}
        onWhiteboard={onWhiteboard}
        onNotes={onNotes}
        onTranscript={onTranscript}
        onLeave={() => window.history.back()}
        isEmbed={isEmbed}
      />

      {/* Floating panels */}
      {showShare && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />}
      {showAdmin && isAdmin && (
        <AdminFloatingPanel
          roomId={roomId}
          participants={roomState.participants || []}
          locked={!!roomState.locked}
          onClose={() => setShowAdmin(false)}
          onChanged={() => window.location.reload()}
        />
      )}
      {showSettings && isAdmin && (
        <SettingsPanel roomId={roomId} onClose={() => setShowSettings(false)} />
      )}
      {showQA && (
        <QAPanel
          roomId={roomId}
          identity={userName}
          userName={userName}
          isAdmin={isAdmin}
          onClose={() => setShowQA(false)}
        />
      )}
      {showTranscript && (
        <TranscriptPanel
          roomId={roomId}
          identity={userName}
          userName={userName}
          onClose={() => setShowTranscript(false)}
        />
      )}
      {showNotes && (
        <NotesPanel
          roomId={roomId}
          identity={userName}
          userName={userName}
          onClose={() => setShowNotes(false)}
        />
      )}
      {showWhiteboard && (
        <WhiteboardPanel
          roomId={roomId}
          onClose={() => setShowWhiteboard(false)}
        />
      )}
    </div>
  );
}

// Bottom toolbar with mic, cam, share, leave
function RoomToolbar({
  roomId, userName, identity, isAdmin, recording, setRecording, activeTab, onTab, onShare, onWhiteboard, onNotes, onTranscript, onLeave, isEmbed,
}: any) {
  return (
    <footer className="border-t border-white/10 bg-black/80 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span className="font-mono text-xs">/{roomId}</span>
          {recording && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              REC
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ToolbarButton icon="🎙" label="Mic" onClick={async () => {
            // Toggle mic via LiveKit (handled by <VideoConference /> controls)
          }} />
          <ToolbarButton icon="📹" label="Camera" onClick={() => {}} />
          <ToolbarButton icon="🖥" label="Share" primary onClick={onShare} />
          <ToolbarButton
            icon="💬"
            label="Chat"
            active={activeTab === "chat"}
            onClick={() => onTab(activeTab === "chat" ? null : "chat")}
          />
          <ToolbarButton
            icon="👥"
            label="People"
            active={activeTab === "people"}
            onClick={() => onTab(activeTab === "people" ? null : "people")}
          />
          <ToolbarButton
            icon="📊"
            label="Polls"
            onClick={() => alert("Polls: use the right side panel in dev mode")}
          />
          <ToolbarButton icon="✋" label="Raise hand" onClick={async () => {
            await fetch(`/api/rooms/${roomId}/hand`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identity: userName, action: "raise" }),
            });
          }} />
          <ToolbarButton
            icon="🪟"
            label="Whiteboard"
            active={activeTab === "whiteboard"}
            onClick={onWhiteboard}
          />
          <ToolbarButton
            icon="📝"
            label="Notes"
            active={activeTab === "notes"}
            onClick={onNotes}
          />
          <ToolbarButton
            icon="❓"
            label="Q&A"
            active={activeTab === "qa"}
            onClick={() => onTab(activeTab === "qa" ? null : "qa")}
          />
          <ToolbarButton
            icon="📜"
            label="Transcript"
            onClick={onTranscript}
          />
          {isAdmin && (
            <RecordingButton roomId={roomId} userName={userName} recording={recording} setRecording={setRecording} />
          )}
        </div>

        <button
          onClick={onLeave}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Leave
        </button>
      </div>
    </footer>
  );
}

function ToolbarButton({ icon, label, onClick, active, primary }: { icon: string; label: string; onClick: () => void; active?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-all " +
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

function RecordingButton({ roomId, userName, recording, setRecording }: { roomId: string; userName: string; recording: boolean; setRecording: (v: boolean) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const start = async () => {
    try {
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true, audio: true,
      });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const rec = new MediaRecorder(displayStream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
      className={
        "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-all " +
        (recording
          ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
          : "text-white/70 hover:bg-white/10 hover:text-white")
      }
    >
      {recording ? "⏹" : "⏺"}
    </button>
  );
}

// Side panel for chat/people/qa/notes
function SidePanel({ roomId, userName, identity, isAdmin, tab, onChangeTab, onClose }: any) {
  return (
    <aside className="animate-slideInR flex w-96 max-w-[40vw] flex-col border-l border-white/10 bg-gray-950">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1">
          {(["chat", "people", "qa", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChangeTab(t)}
              className={
                "rounded-md px-2.5 py-1 text-xs font-medium " +
                (tab === t ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5")
              }
            >
              {t === "chat" ? "💬" : t === "people" ? "👥" : t === "qa" ? "❓" : "📝"}
              <span className="ml-1 capitalize">{t}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatPanelInline roomId={roomId} identity={identity} userName={userName} />}
        {tab === "people" && <PeoplePanelInline roomId={roomId} isAdmin={isAdmin} />}
        {tab === "qa" && <QAPanelInline roomId={roomId} identity={identity} userName={userName} isAdmin={isAdmin} />}
        {tab === "notes" && <NotesPanelInline roomId={roomId} identity={identity} userName={userName} />}
      </div>
    </aside>
  );
}

// Inline panels (lightweight)
function ChatPanelInline({ roomId, identity, userName }: { roomId: string; identity: string; userName: string }) {
  const [msgs, setMsgs] = useState2<any[]>([]);
  const [text, setText] = useState2("");
  const sinceRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect2(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/chat?since=${sinceRef.current}`);
        const data = await r.json();
        if (data.messages?.length && !cancelled) {
          sinceRef.current = data.messages[data.messages.length - 1].id;
          setMsgs((prev) => [...prev, ...data.messages]);
        }
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  useEffect2(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await fetch(`/api/rooms/${roomId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, name: userName, body: t }),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {msgs.length === 0 && (
          <p className="py-8 text-center text-xs text-white/40">No messages yet. Say hi 👋</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className="break-words">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-medium text-white/80">{m.name || m.identity}</span>
              <span className="text-[10px] text-white/30">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-white/90">{m.body}</div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-white/10 p-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">
          Send
        </button>
      </form>
    </div>
  );
}

function PeoplePanelInline({ roomId, isAdmin }: { roomId: string; isAdmin: boolean }) {
  const [list, setList] = useState2<any[]>([]);
  useEffect2(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch(`/api/rooms/${roomId}/participants`);
        const data = await r.json();
        if (!cancelled) setList(data.participants ?? []);
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [roomId]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    const url = body.identity
      ? `/api/rooms/${encodeURIComponent(roomId)}/participants`
      : `/api/rooms/${encodeURIComponent(roomId)}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        In this meeting ({list.length})
      </div>
      {list.length === 0 && <p className="text-xs text-white/40">Just you so far.</p>}
      {list.map((p) => (
        <div key={p.sid} className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-white/5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 grid place-items-center text-xs font-semibold">
              {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm">{p.name || p.identity}</div>
              <div className="truncate text-[10px] text-white/40">
                {p.isMuted ? "Muted" : "Speaking"}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => act("mute", { identity: p.identity })}
                title="Mute"
                className="rounded px-1.5 py-0.5 text-[10px] text-white/60 hover:bg-white/10"
              >
                Mute
              </button>
              <button
                onClick={() => { if (confirm(`Remove ${p.name}?`)) act("kick", { identity: p.identity }); }}
                title="Remove"
                className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QAPanelInline({ roomId, identity, userName, isAdmin }: any) {
  const [list, setList] = useState2<any[]>([]);
  const [text, setText] = useState2("");

  const refresh = async () => {
    const r = await fetch(`/api/rooms/${roomId}/qa${isAdmin ? "" : "?approved=1"}`);
    const data = await r.json();
    setList(data.questions ?? []);
  };
  useEffect2(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [roomId, isAdmin]);

  const ask = async () => {
    if (!text.trim()) return;
    setText("");
    await fetch(`/api/rooms/${roomId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asker: identity, asker_name: userName, question: text }),
    });
    refresh();
  };

  const sorted = [...list].sort((a, b) => b.upvotes - a.upvotes || a.created_at - b.created_at);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {sorted.length === 0 && <p className="py-8 text-center text-xs text-white/40">No questions yet.</p>}
        {sorted.map((q) => (
          <div key={q.id} className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex items-start gap-2">
              <button
                onClick={async () => {
                  await fetch(`/api/rooms/${roomId}/qa`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "upvote", id: q.id }),
                  });
                  refresh();
                }}
                className="flex h-7 w-6 shrink-0 flex-col items-center justify-center rounded border border-white/10 hover:bg-white/10"
                title="Upvote"
              >
                <span className="text-[10px]">▲</span>
                <span className="text-[10px]">{q.upvotes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-white/40">{q.asker_name || q.asker}</div>
                <div className="text-sm text-white/90">{q.question}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question…"
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        <button onClick={ask} className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">Ask</button>
      </div>
    </div>
  );
}

function NotesPanelInline({ roomId, identity, userName }: any) {
  const [body, setBody] = useState2("");
  const last = useRef("");

  const refresh = async () => {
    const r = await fetch(`/api/rooms/${roomId}/notes`);
    const data = await r.json();
    if (data.notes && data.notes.body !== last.current) {
      last.current = data.notes.body;
      setBody(data.notes.body);
    }
  };

  useEffect2(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [roomId]);

  useEffect2(() => {
    const t = setTimeout(() => {
      if (body !== last.current) {
        last.current = body;
        fetch(`/api/rooms/${roomId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, by: userName }),
        });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [body]);

  return (
    <textarea
      value={body}
      onChange={(e) => setBody(e.target.value)}
      placeholder="Type your notes here. Markdown supported. Auto-saves."
      className="h-full w-full resize-none bg-gray-950 p-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
    />
  );
}

// Share modal — beautiful
function ShareModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [copied, setCopied] = useState2<"code" | "link" | null>(null);
  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/${roomId}` : "";

  const copy = async (text: string, which: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn w-[28rem] max-w-[92vw] rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Share meeting</h2>
            <p className="mt-1 text-xs text-white/50">Anyone with the code or link can join</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white">✕</button>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Code</div>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <code className="font-mono text-sm font-semibold tracking-wider">{roomId}</code>
              <button
                onClick={() => copy(roomId, "code")}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
              >
                {copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Link</div>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="truncate font-mono text-xs text-white/80">{link}</span>
              <button
                onClick={() => copy(link, "link")}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
              >
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
            <span className="font-medium text-white/70">Tip:</span> Lock the room from Manage → Lock room to require admin approval.
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminFloatingPanel({ roomId, participants, locked, onClose, onChanged }: { roomId: string; participants: any[]; locked: boolean; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState2<"main" | "breakouts" | "settings">("main");
  const [breakoutInput, setBreakoutInput] = useState2("");
  const [breakouts, setBreakouts] = useState2<string[]>([]);

  const refreshBreakouts = async () => {
    const r = await fetch(`/api/rooms/${roomId}/breakouts`);
    const data = await r.json();
    setBreakouts(data.breakouts ?? []);
  };
  useEffect2(() => {
    refreshBreakouts();
    const t = setInterval(refreshBreakouts, 3000);
    return () => clearInterval(t);
  }, [roomId]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    const url = body.identity
      ? `/api/rooms/${encodeURIComponent(roomId)}/participants`
      : `/api/rooms/${encodeURIComponent(roomId)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (r.ok) onChanged();
  }

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-full max-w-md animate-slideInR flex-col border-l border-white/10 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Manage meeting</h2>
        <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white">✕</button>
      </div>

      <div className="flex gap-1 border-b border-white/10 px-3 pt-2">
        {(["main", "breakouts", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium " +
              (tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
            }
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "main" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => act("mute-all")} className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs hover:bg-white/10">Mute all</button>
              <button
                onClick={() => act(locked ? "unlock" : "lock")}
                className={
                  "rounded-md border px-3 py-2.5 text-xs " +
                  (locked ? "border-yellow-700 bg-yellow-900/40 text-yellow-200" : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                {locked ? "Unlock" : "Lock"} room
              </button>
              <button
                onClick={() => { if (confirm("End for everyone?")) act("end"); }}
                className="col-span-2 rounded-md border border-red-700 bg-red-900/40 px-3 py-2.5 text-xs text-red-200 hover:bg-red-900/60"
              >
                End meeting
              </button>
            </div>
            {locked && (
              <p className="mt-3 rounded border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                Room is locked. New joiners will land in the lobby.
              </p>
            )}

            <h3 className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Participants ({participants.length})
            </h3>
            {participants.length === 0 ? (
              <p className="text-xs text-white/40">No one else is here.</p>
            ) : (
              <ul className="space-y-1">
                {participants.map((p) => (
                  <li key={p.sid} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{p.name || p.identity}</div>
                      <div className="text-[10px] text-white/40">{p.isMuted ? "Muted" : "Live"}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => act("mute", { identity: p.identity })} className="rounded px-2 py-1 text-[10px] hover:bg-white/10">Mute</button>
                      <button
                        onClick={() => { if (confirm(`Remove ${p.name}?`)) act("kick", { identity: p.identity }); }}
                        className="rounded px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "breakouts" && (
          <div>
            <div className="flex gap-2">
              <input
                value={breakoutInput}
                onChange={(e) => setBreakoutInput(e.target.value)}
                placeholder="team-a, team-b"
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs placeholder:text-white/30"
              />
              <button
                onClick={async () => {
                  const subs = breakoutInput.split(",").map((s) => s.trim()).filter(Boolean);
                  if (!subs.length) return;
                  await fetch(`/api/rooms/${roomId}/breakouts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subRooms: subs, createdBy: "admin" }),
                  });
                  setBreakoutInput("");
                  refreshBreakouts();
                }}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              >
                Create
              </button>
            </div>
            {breakouts.length > 0 && (
              <div className="mt-3 space-y-1">
                {breakouts.map((b) => (
                  <div key={b} className="flex items-center justify-between rounded border border-white/10 px-2 py-1.5 text-xs">
                    <span>{b}</span>
                    <button
                      onClick={async () => {
                        const sub = prompt(`Move which identity to ${b}?`);
                        if (sub) {
                          await fetch(`/api/rooms/${roomId}/breakouts/assign`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ identity: sub, subRoom: b }),
                          });
                        }
                      }}
                      className="text-white/40 hover:text-white"
                    >
                      Move
                    </button>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    await fetch(`/api/rooms/${roomId}/breakouts/close`, { method: "POST" });
                    refreshBreakouts();
                  }}
                  className="mt-2 w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
                >
                  Close all & return
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="text-xs text-white/50">
            <p>Per-room settings open from the top bar Settings button.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Floating emoji reactions
function FloatingReactions({ roomId, identity }: { roomId: string; identity: string }) {
  const [reactions, setReactions] = useState2<any[]>([]);
  useEffect2(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/reactions`);
        if (r.ok) {
          const data = await r.json();
          const now = Date.now();
          setReactions((prev) => {
            const fresh = prev.filter((x) => now - x.ts < 4000);
            return [...fresh, ...(data.reactions ?? []).filter((x: any) => now - x.ts < 4000)];
          });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [roomId]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r, i) => (
        <div
          key={i}
          className="absolute bottom-20 text-3xl"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            animation: `float-up 3s ease-out forwards`,
          }}
        >
          {r.emoji}
        </div>
      ))}
      <style jsx>{`
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-200px); }
        }
      `}</style>
    </div>
  );
}