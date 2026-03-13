# Indux Meet

> **Open source video meetings. Free for everyone. Built on LiveKit.**

A self-hosted, Zoom-style video conferencing platform with 30+ features, polished UI, and zero usage limits. Apache 2.0 + MIT licensed.

## Quick Start

```bash
# 1. Install LiveKit server (one-time)
brew install livekit
livekit-server --dev --bind 0.0.0.0

# 2. Install dependencies
pnpm install

# 3. Copy environment template (or use the dev defaults)
# .env.local is preconfigured with dev keys

# 4. Run
pnpm dev

# 5. Open
open http://localhost:3000
```

That's it. No accounts. No sign-up. No payment. Open `http://localhost:3000` in your browser and start a meeting.

## Features (30+)

### 🎥 Core video
- HD video + screen share (WebRTC SFU, sub-200ms latency)
- Camera/mic preview in PreJoin
- Tiles / Stage view toggle
- Picture-in-picture support

### 🎛 Moderation
- Waiting room (lobby) with knock-to-join
- Admit / Deny participants
- Mute all / Mute individual
- Remove participant (kick)
- Ban user (prevent rejoin)
- Promote to co-host / Demote
- Lock room / Unlock
- End meeting for everyone
- Rename participants

### 💬 Collaboration
- Persistent text chat with history
- File upload in chat (images, PDFs, any file)
- Live emoji reactions (👍 👏 ❤️ 😂) with floating animation
- Hand raise with ordered queue
- Live polls with upvoting
- Q&A mode (audience → host approval)
- Collaborative whiteboard (tldraw)
- Shared notes (Markdown, live, auto-save)

### 🎬 Recording + AI
- In-browser recording (MediaRecorder)
- Server-side transcript
- Live captions (SpeechRecognition)
- AI summary extracting action items

### 👥 Multi-user
- Breakout rooms (pre-assign, move users, return all)
- Co-hosts (multi-host support)
- Spotlight (pin speakers)
- Per-room settings (toggle any feature)

### 📅 Productivity
- Schedule meetings with start time and duration
- Recurring meetings (daily / weekly / monthly)
- ICS calendar export
- Personal meeting room (`/u/alice`)
- Embed on any site (iframe)
- Mobile deep links (`indux://` scheme)

### 🌐 Network
- Low-bandwidth mode (auto audio-only)
- Manual quality presets (Auto / HD / SD / Low / Audio-only)
- Real-time network stats (bitrate, packet loss, jitter)
- TURN servers for NAT traversal

### 🎨 Customization
- Light / Dark / System theme
- 7 accent colors (indigo, violet, rose, amber, emerald, cyan, slate)
- Density (Compact / Default / Comfortable)
- Motion (Full / Reduced)
- All saved to localStorage

### ⚡ Power user
- Command palette (Cmd+K)
- Keyboard shortcuts everywhere
- Pre-filled display name via URL
- Personal room shortcut

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (Chrome / Safari / Firefox / Edge)                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Indux Meet (Next.js 16, React 19)                      │ │
│  │  • Launcher /  ← glass UI, dark mode                    │ │
│  │  • PreJoin /  ← camera + mic preview                   │ │
│  │  • Room /meet/[id]                                     │ │
│  │     ├ Top bar: code, share, chat, people, manage       │ │
│  │     ├ Video grid (LiveKit <VideoConference />)         │ │
│  │     ├ Side panels: chat / polls / people / notes       │ │
│  │     ├ Live captions (CC) overlay                        │ │
│  │     └ Bottom bar: chat, polls, reactions, hand, record │ │
│  └──────────────────────────────────────────────────────────┘ │
│           │ WebRTC (UDP, 50-200ms) + LiveKit DataChannel      │
└────────────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────┐
        │  LiveKit Server (Go, Apache 2.0) :7880  │
        │  SFU + TURN + RTC                        │
        └──────────────────────────────────────────┘
                ▲
                │ Admin APIs
        ┌──────────────────────────────────────────┐
        │  Next.js API Routes                       │
        │  • /api/token (JWT mint)                 │
        │  • /api/rooms (list/create/delete)       │
        │  • /api/rooms/[r]/participants (admin)   │
        │  • /api/rooms/[r]/chat (history)         │
        │  • /api/rooms/[r]/polls (vote/results)   │
        │  • /api/rooms/[r]/hand (raises)          │
        │  • /api/rooms/[r]/reactions (broadcast)  │
        │  • /api/rooms/[r]/breakouts (sub-rooms)  │
        │  • /api/rooms/[r]/cohosts (multi-host)   │
        │  • /api/rooms/[r]/banned (prevent rejoin) │
        │  • /api/rooms/[r]/spotlight (pin)        │
        │  • /api/rooms/[r]/settings (toggles)     │
        │  • /api/rooms/[r]/notes (Markdown)       │
        │  • /api/rooms/[r]/qa (Q&A)               │
        │  • /api/rooms/[r]/transcripts (server)   │
        │  • /api/rooms/[r]/summary (AI)           │
        │  • /api/rooms/[r]/upload (files)         │
        │  • /api/rooms/[r]/lobby (knock)          │
        │  • /api/rooms/[r]/state (admit status)   │
        │  • /api/schedule (recurring meetings)    │
        │  • /api/personal-room (stable URL)       │
        │  • /api/calendar/[id].ics (export)       │
        │  • /api/conversations (active rooms)     │
        │  • /api/config.js (Jitsi-style)          │
        │  • /api/files/[id] (downloads)           │
        └──────────────────────────────────────────┘
                ▲
                │ Persists
        ┌──────────────────────────────────────────┐
        │  SQLite (better-sqlite3)                 │
        │  • chat, polls, poll_votes               │
        │  • recordings, breakout_rooms            │
        │  • hand_raises, room_settings            │
        │  • cohosts, banned_users, spotlight      │
        │  • qa_questions, notes, transcripts      │
        │  • ai_summaries, scheduled_meetings      │
        │  • personal_rooms, room_settings         │
        │  (Swap to Postgres for production)       │
        └──────────────────────────────────────────┘
```

## Self-hosting for production

```bash
# 1. Switch to Postgres
npm install pg @types/pg
# Update src/lib/db.ts to use pg instead of better-sqlite3

# 2. Multi-region LiveKit cluster
# Deploy 3+ LiveKit nodes behind a load balancer
# Add Redis for cross-node state sync
# Add coturn TURN servers in each region

# 3. Cloud storage for recordings
# Replace local disk with S3 / R2 / GCS
# See /api/rooms/[r]/recordings/route.ts

# 4. Configure via env vars
LIVEKIT_URL=wss://livekit.indux.com
LIVEKIT_API_KEY=API***
LIVEKIT_API_SECRET=***
DATABASE_URL=postgres://...
NEXT_PUBLIC_BASE_URL=https://indux.com
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` | Command palette |
| `?` | Shortcuts help |
| `C` | Toggle chat |
| `P` | Toggle people |
| `Q` | Toggle Q&A |
| `N` | Toggle notes |
| `W` | Open whiteboard |
| `S` | Settings (admin) |
| `R` | Raise hand |
| `Enter` | Join meeting |
| `Esc` | Close dialog |

## Cost

| Item | Cost |
|---|---|
| LiveKit server (Apache 2.0) | **$0** |
| `@livekit/components-react` | **$0** |
| `livekit-server-sdk` | **$0** |
| `livekit-client` | **$0** |
| Next.js 16 + React 19 | **$0** |
| Tailwind CSS v4 | **$0** |
| `better-sqlite3` | **$0** |
| `tldraw` | **$0** |
| **Total software** | **$0** |
| Cloud hosting (when deployed) | $5-10/mo for ~100 users |

## License

Apache 2.0 + MIT. Use it for anything. Sell it. Fork it. No attribution required.

## Credits

Built on top of [LiveKit](https://livekit.io) — the open source WebRTC SFU. UI patterns inspired by [Jitsi Meet](https://github.com/jitsi/jitsi-meet), [Linear](https://linear.app), and [Vercel](https://vercel.com).
