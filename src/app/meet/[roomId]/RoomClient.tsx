"use client";

// Main meeting room client — clean custom UI

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import { Room as LKRoom, Track } from "livekit-client";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import { MeetingHeader } from "./MeetingHeader";
import { RoomToolbar } from "./RoomToolbar";
import { SidePanel } from "./SidePanel";
import { FloatingReactions } from "./Reactions";
import { InRoomSettings } from "./InRoomSettings";
import { NetworkStats } from "./NetworkStats";
import { LiveCaptions } from "./LiveCaptions";
import { QualityControl } from "./QualityControl";
import { ViewToggle } from "./ViewToggle";
import { ShortcutsHelp } from "./Shortcuts";
import { Icon } from "../../components/Icons";
import { CustomPreJoin } from "./CustomPreJoin";
import { CustomVideoGrid } from "./CustomVideoGrid";
import { LobbyScreen } from "./Lobby";
import { AISidekick } from "./AISidekick";
import { EngagementDashboard } from "./EngagementDashboard";
import { CursorPresence } from "./CursorPresence";
import { ConfettiCanvas } from "./Confetti";
import { fireConfetti } from "./Confetti";
import { sfx, isSfxEnabled } from "./sfx";
import { SpatialVoiceRoom } from "./SpatialVoiceRoom";
import { MusicRoom } from "./MusicRoom";
import { Trivia } from "./Trivia";
import { ARFilters, ARFilterPicker, type FilterKind } from "./ARFilters";
import { TranslatedCaptions } from "./TranslatedCaptions";
import { Bingo } from "./Bingo";
import { RecapModal } from "./RecapModal";
import { ActivityTicker } from "./ActivityTicker";
import type { LocalTrack, RemoteTrack } from "livekit-client";

type Tab = "chat" | "people" | "polls" | "qa" | "notes" | "ai" | null;
export type RoomTab = NonNullable<Tab>;

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
  const { localParticipant } = useLocalParticipant();
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
  const [showEngagement, setShowEngagement] = useState(false);
  const [showSpatial, setShowSpatial] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showBingo, setShowBingo] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [inLobby, setInLobby] = useState(false);
  const [background, setBackground] = useState<"none" | "blur" | "sunset" | "office" | "forest" | "beach">(bgMode);
  const [touchUp, setTouchUp] = useState(false);
  const [spotlightSid, setSpotlightSid] = useState<string | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [arFilter, setArFilter] = useState<FilterKind>("none");
  const [selfStream, setSelfStream] = useState<MediaStream | null>(null);

  // Get the underlying LiveKit Room object from the local participant
  const lkRoom: LKRoom | null = (localParticipant as any)?.room ?? null;

  useEffect(() => {
    if (!roomState.participants?.length || !userName) { setInLobby(false); return; }
    const me = (roomState.participants as any[]).find((p: any) => p.identity === userName || p.name === userName);
    if (!me) { setInLobby(false); return; }
    const cantPublish = me.permission?.canPublish === false || me.isPublisher === false;
    setInLobby(cantPublish && !!roomState.locked);
  }, [roomState, userName]);

  // Consolidated polling — one interval, multiple endpoints, pauses when tab hidden.
  const previousCountRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;

    async function poll() {
      if (document.hidden) {
        if (!cancelled) timeoutId = setTimeout(poll, 8000);
        return;
      }
      try {
        const [roomRes, partsRes, insightsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/rooms/${roomId}/participants`).then((r) => r.json()).catch(() => null),
          fetch(`/api/rooms/${roomId}/ai/insights?only=open`).then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        const newParts = partsRes?.participants ?? [];
        const prev = previousCountRef.current;
        setRoomState((cur: any) => {
          // Shallow compare to avoid useless re-renders
          if (cur.locked === (roomRes?.room?.metadata?.locked === true) &&
              cur.participants.length === newParts.length &&
              cur.participants.every((p: any, i: number) => p.sid === newParts[i]?.sid)) {
            return cur;
          }
          return { locked: roomRes?.room?.metadata?.locked === true, participants: newParts };
        });
        if (insightsRes?.insights) setInsights(insightsRes.insights);

        // Sound + confetti on join milestones
        if (isSfxEnabled() && newParts.length !== prev) {
          if (newParts.length > prev && prev > 0) {
            sfx.join();
            if ([5, 10, 25, 50, 100].includes(newParts.length)) {
              setTimeout(() => { sfx.confetti(); fireConfetti("center", { count: 140, palette: "rainbow" }); }, 50);
            }
          } else if (newParts.length < prev && prev > 1) {
            sfx.leave();
          }
          // Engagement events
          fetch(`/api/rooms/${roomId}/engagement`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identity: userName,
              events: newParts.length > prev
                ? [{ kind: "join", ts: Date.now() }]
                : [{ kind: "leave", ts: Date.now() }],
            }),
          }).catch(() => {});
        }
        previousCountRef.current = newParts.length;
      } catch {}
      if (!cancelled) timeoutId = setTimeout(poll, 4000);
    }

    poll();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [roomId, userName]);

  const resolveInsight = useCallback(async (id: number) => {
    if (!id) {
      // refresh signal
      try {
        const r = await fetch(`/api/rooms/${roomId}/ai/insights?only=open`);
        const d = await r.json();
        setInsights(d.insights ?? []);
      } catch {}
      return;
    }
    setInsights((arr) => arr.map((i) => (i.id === id ? { ...i, resolved: true } : i)));
    await fetch(`/api/rooms/${roomId}/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", id }),
    }).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "?") setShowShortcuts(true);
      else if (k === "escape") {
        setShowShortcuts(false);
        setSidebarTab(null);
        setShowEngagement(false);
        setShowSpatial(false);
        setShowMusic(false);
        setShowTrivia(false);
      }
      else if (k === "c") setSidebarTab((t) => (t === "chat" ? null : "chat"));
      else if (k === "p") setSidebarTab((t) => (t === "people" ? null : "people"));
      else if (k === "l") setSidebarTab((t) => (t === "polls" ? null : "polls"));
      else if (k === "q") setSidebarTab((t) => (t === "qa" ? null : "qa"));
      else if (k === "n") setSidebarTab((t) => (t === "notes" ? null : "notes"));
      else if (k === "i") setShowEngagement(true);
      else if (k === "x") setShowSpatial((s) => !s);
      else if (k === "m") setShowMusic((s) => !s);
      else if (k === "t") setShowTrivia((s) => !s);
      else if (k === "g") setShowBingo((s) => !s);
      else if (k === "y") setShowRecap(true);
      else if (k === "w") setShowWhiteboard(true);
      else if (k === "s" && isAdmin) setShowSettings(true);
      else if (k === "r") {
        fetch(`/api/rooms/${roomId}/hand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: userName, name: userName, action: "raise" }),
        });
        sfx.hand();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [roomId, userName, isAdmin]);

  // Get local camera stream for AR filters
  useEffect(() => {
    if (!localParticipant) return;
    const camPub = localParticipant.getTrackPublication?.(Track.Source.Camera);
    const track = camPub?.track as LocalTrack | undefined;
    const stream = (track as any)?.mediaStream as MediaStream | undefined;
    if (stream) setSelfStream(stream);
    const onMuted = () => setSelfStream(null);
    const onUnmuted = () => {
      const t = localParticipant.getTrackPublication?.(Track.Source.Camera)?.track;
      const s = (t as any)?.mediaStream as MediaStream | undefined;
      if (s) setSelfStream(s);
    };
    track?.on("muted", onMuted);
    track?.on("unmuted", onUnmuted);
    return () => {
      track?.off("muted", onMuted);
      track?.off("unmuted", onUnmuted);
    };
  }, [localParticipant]);

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
    <div className="relative flex h-full w-full flex-col bg-black text-white">
      <ConfettiCanvas />

      {/* Live cursor presence overlay */}
      {!isEmbed && (
        <CursorPresence roomId={roomId} identity={userName} userName={userName} room={lkRoom} />
      )}

      {/* Activity ticker — live feed of events */}
      {!isEmbed && <ActivityTicker roomId={roomId} identity={userName} />}

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
          <CustomVideoGrid
            viewMode={viewMode}
            userName={userName}
            background={background}
            touchUp={touchUp}
            spotlightSid={spotlightSid}
            onSpotlight={setSpotlightSid}
            isAdmin={isAdmin}
            identity={userName}
            roomId={roomId}
          />
          <FloatingReactions roomId={roomId} identity={userName} />
        </div>

        {/* AI floating launcher */}
        {!isEmbed && sidebarTab !== "ai" && (
          <button
            onClick={() => setSidebarTab("ai")}
            className="absolute bottom-24 right-3 z-20 group flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-2xl transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, var(--accent), #a855f7)",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(168, 85, 247, 0.3)",
            }}
            title="AI Sidekick"
          >
            <span className="relative">
              <Icon.Sparkles size={13} />
              {insights.filter((i) => !i.resolved).length > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-black animate-pulse">
                  {insights.filter((i) => !i.resolved).length}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Ask Sidekick</span>
          </button>
        )}

        {/* Engagement dashboard launcher */}
        {!isEmbed && (
          <button
            onClick={() => setShowEngagement(true)}
            className="absolute bottom-24 right-3 z-20 group mr-36 sm:mr-44 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/45 px-3 py-2 text-xs font-medium text-white/85 shadow-lg backdrop-blur-xl transition-all hover:border-white/20 hover:bg-black/65 hover:text-white"
            title="Engagement (I)"
          >
            <Icon.TrendingUp size={13} />
            <span className="hidden sm:inline">Insights</span>
          </button>
        )}

        {/* Fun features launcher cluster — top-right of stage */}
        {!isEmbed && (
          <div className="absolute top-16 right-3 z-20 flex flex-col gap-1 animate-fadeIn">
            <div className="rounded-2xl border border-white/[0.08] bg-black/35 px-1.5 py-2 backdrop-blur-xl shadow-lg">
              <div className="px-1.5 pb-1.5 mb-1 border-b border-white/[0.06] text-[8px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Play
              </div>
              <div className="flex flex-col gap-1">
                <FunLaunch icon={<Icon.Volume size={11} />} label="Spatial" hint="X" active={showSpatial} onClick={() => setShowSpatial((s) => !s)} gradient="linear-gradient(135deg, #ec4899, #f59e0b)" />
                <FunLaunch icon={<span style={{ fontSize: 12 }}>♪</span>} label="Music" hint="M" active={showMusic} onClick={() => setShowMusic((s) => !s)} gradient="linear-gradient(135deg, #ec4899, #a855f7)" />
                <FunLaunch icon={<Icon.Bolt size={11} />} label="Trivia" hint="T" active={showTrivia} onClick={() => setShowTrivia((s) => !s)} gradient="linear-gradient(135deg, #10b981, #06b6d4)" />
                <FunLaunch icon={<span style={{ fontSize: 11, fontWeight: 700 }}>B</span>} label="Bingo" hint="G" active={showBingo} onClick={() => setShowBingo((s) => !s)} gradient="linear-gradient(135deg, #f97316, #facc15)" />
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
                <FunLaunch icon={<Icon.FileText size={11} />} label="Recap" hint="Y" active={showRecap} onClick={() => setShowRecap(true)} gradient="linear-gradient(135deg, #6366f1, #a855f7)" />
              </div>
            </div>
          </div>
        )}

        {/* View toggle — floating bottom-right of toolbar */}
        {!isEmbed && (
          <div className="absolute right-3 bottom-44 z-20">
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
        )}

        {/* Meeting info banner — shown top-center for everyone, fades */}
        {!isEmbed && (
          <div className="pointer-events-none absolute top-16 left-1/2 z-10 -translate-x-1/2 animate-fadeIn">
            <div className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[11px] font-medium text-white/60 backdrop-blur-md">
              <span className="font-mono tracking-wider">/{roomId}</span>
              <span className="mx-2 text-white/20">·</span>
              <span>{roomState.participants?.length || 1} in room</span>
            </div>
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
              <LiveCaptions enabled={captionsOn} setEnabled={setCaptionsOn} />
              {!isEmbed && <TranslatedCaptions roomId={roomId} identity={userName} />}
              <NetworkStats />
            </>
          )}
        </div>

        {/* Side panel — OVERLAYS on top of the video grid */}
        {sidebarTab === "ai" ? (
          <div className="absolute inset-y-0 right-0 z-30 flex">
            <AISidekick
              roomId={roomId}
              identity={userName}
              userName={userName}
              onClose={() => setSidebarTab(null)}
              insights={insights}
              onResolveInsight={resolveInsight}
            />
          </div>
        ) : sidebarTab ? (
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
        ) : null}
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
        onBackgroundChange={setBackground}
        background={background}
        onTouchUpToggle={() => setTouchUp((v) => !v)}
        touchUp={touchUp}
        onSpotlightCycle={() => {
          // Cycle through remote participants
          const remotes = roomState.participants ?? [];
          if (remotes.length === 0) return;
          const idx = remotes.findIndex((p: any) => p.sid === spotlightSid);
          const next = remotes[(idx + 1) % remotes.length];
          setSpotlightSid(next?.sid ?? null);
        }}
        insightsCount={insights.filter((i) => !i.resolved).length}
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
      {showEngagement && <EngagementDashboard roomId={roomId} onClose={() => setShowEngagement(false)} />}
      {showSpatial && <SpatialVoiceRoom roomId={roomId} userName={userName} onClose={() => setShowSpatial(false)} />}
      {showMusic && <MusicRoom roomId={roomId} userName={userName} onClose={() => setShowMusic(false)} />}
      {showTrivia && <Trivia roomId={roomId} userName={userName} isAdmin={isAdmin} onClose={() => setShowTrivia(false)} />}
      {showBingo && <Bingo roomId={roomId} userName={userName} onClose={() => setShowBingo(false)} />}
      {showRecap && <RecapModal roomId={roomId} isAdmin={isAdmin} onClose={() => setShowRecap(false)} />}

      {/* AR filter overlay (local-only) — applies to the self-view tile */}
      {!isEmbed && arFilter !== "none" && selfStream && (
        <ARFilters
          filter={arFilter}
          videoStream={selfStream}
          targetSelector="video[data-lk-local]"
        />
      )}

      {/* AR filter picker — bottom center when camera is on */}
      {!isEmbed && selfStream && (
        <ARFilterPicker filter={arFilter} onFilterChange={setArFilter} />
      )}

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
        const hands = (data.hands ?? data.participants ?? []).filter((p: any) => p.raisedHand !== false);
        const newToasts: { id: string; name: string }[] = hands
          .filter((p: any) => p.name !== userName && p.identity !== userName)
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

function FunLaunch({
  icon, label, hint, active, onClick, gradient,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint ? `${label} (${hint})` : label}
      className={
        "group flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all " +
        (active
          ? "border-transparent text-white shadow-md"
          : "border-white/[0.06] bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white")
      }
      style={active ? { background: gradient } : undefined}
    >
      <span className="grid h-4 w-4 place-items-center shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {hint && (
        <span className="ml-auto rounded bg-white/10 px-1 font-mono text-[8px] uppercase text-white/50">
          {hint}
        </span>
      )}
    </button>
  );
}
