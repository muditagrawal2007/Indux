// Public config endpoint (Jitsi-style config.js)
// GET /api/config.js → JS file with globalInduxConfig for clients to pick up.
// In production: per-tenant config, deployment-specific URLs.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const body = `
window.globalInduxConfig = {
  // LiveKit server
  livekitUrl: "${process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"}",

  // TURN servers (for NAT traversal on slow networks)
  turnServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],

  // UI defaults
  ui: {
    showWatermark: false,
    defaultView: "tile",          // "tile" | "stage"
    defaultQuality: "auto",       // "auto" | "low" | "medium" | "high" | "audio-only"
    showNetworkStats: true,
    enableReactions: true,
    enableWhiteboard: true,
    enableNotes: true,
    enableQA: true,
    enablePolls: true,
    enableTranscription: true,
    enableBreakoutRooms: true,
    enableLobby: true,
    enableCoHosts: true,
    enableSettings: true,
    enablePersonalRoom: true,
    enableSchedule: true,
    enableEmbed: true,
  },

  // Branding
  brand: {
    name: "Indux Meet",
    logo: "/ix.svg",
    primary: "#0a0a0a",
    accent: "#6366f1",
  },

  // Limits
  limits: {
    maxParticipants: 10000,
    maxDurationMinutes: 0, // 0 = unlimited
    maxFileUploadMB: 100,
  },

  // Features
  features: {
    e2ee: true,
    recording: true,
    transcription: true,
    breakoutRooms: true,
    polls: true,
    qa: true,
    whiteboard: true,
    notes: true,
    transcriptionServerSide: true,
    aiSummary: true,
  },

  // External services (replace with real endpoints in production)
  services: {
    aiSummary: null,         // POST https://api.openai.com/v1/chat/completions
    transcription: null,    // POST https://api.deepgram.com/v1/listen
  },

  // Mobile app deep links
  mobile: {
    ios: "https://apps.apple.com/app/indux-meet",
    android: "https://play.google.com/store/apps/details?id=com.indux.meet",
    scheme: "indux",
  },

  // Server version
  version: "1.0.0",
  build: "indux-mvp",
};
`.trim();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}