// Indux Meet — SQLite data layer
// Persists: chat messages, polls, recordings, breakout rooms
// For MVP: local SQLite. In production: swap to Postgres (same SQL).
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Prefer env var, fall back to a local file
const DB_PATH = process.env.INDUX_DB_PATH || path.join(process.cwd(), "indux-meet.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  init(_db);
  return _db;
}

function init(db: Database.Database) {
  // Idempotent ALTERs for older DBs that don't have newer columns
  const addCol = (table: string, col: string, decl: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`); } catch {}
  };
  addCol("polls", "kind", "TEXT NOT NULL DEFAULT 'multiple_choice'");

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      name TEXT,
      body TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'file' | 'system'
      meta TEXT,                          -- JSON for file metadata
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS chat_room_time ON chat(room, created_at);

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,    -- JSON array of strings
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      closed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL,
      identity TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      voted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (poll_id, identity),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      started_by TEXT NOT NULL,
      started_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      ended_at INTEGER,
      file_path TEXT,
      file_size INTEGER,
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'recording'  -- 'recording' | 'stopped' | 'failed' | 'uploaded'
    );

    CREATE TABLE IF NOT EXISTS breakout_rooms (
      room TEXT NOT NULL,
      sub_room TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, sub_room)
    );

    CREATE TABLE IF NOT EXISTS hand_raises (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      raised_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity)
    );

    CREATE TABLE IF NOT EXISTS room_settings (
      room TEXT PRIMARY KEY,
      settings TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS scheduled_meetings (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      title TEXT NOT NULL,
      host TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      recurring TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS scheduled_host ON scheduled_meetings(host, starts_at);

    CREATE TABLE IF NOT EXISTS personal_rooms (
      username TEXT PRIMARY KEY,
      room TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS qa_questions (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      asker TEXT NOT NULL,
      asker_name TEXT,
      question TEXT NOT NULL,
      answer TEXT,
      answered_by TEXT,
      answered_at INTEGER,
      upvotes INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS qa_room ON qa_questions(room, created_at);

    CREATE TABLE IF NOT EXISTS cohosts (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity)
    );

    CREATE TABLE IF NOT EXISTS banned_users (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      banned_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity)
    );

    CREATE TABLE IF NOT EXISTS spotlight (
      room TEXT PRIMARY KEY,
      identities TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS notes (
      room TEXT PRIMARY KEY,
      body TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      name TEXT,
      text TEXT NOT NULL,
      ts_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS transcripts_room ON transcripts(room, id);

    CREATE TABLE IF NOT EXISTS ai_summaries (
      room TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      action_items TEXT NOT NULL DEFAULT '[]',
      generated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_room_time ON audit_log(room, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      role TEXT NOT NULL,           -- 'user' | 'assistant' | 'system'
      content TEXT NOT NULL,
      meta TEXT,                    -- JSON (e.g. citations, sources)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_conv_room_time ON ai_conversations(room, created_at);

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      kind TEXT NOT NULL,           -- 'action_item' | 'decision' | 'question' | 'highlight'
      text TEXT NOT NULL,
      source TEXT,                  -- speaker identity that triggered it
      confidence REAL DEFAULT 1.0,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_insights_room ON ai_insights(room, created_at);

    CREATE TABLE IF NOT EXISTS engagement_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      kind TEXT NOT NULL,           -- 'join' | 'leave' | 'react' | 'hand' | 'speak' | 'chat' | 'poll_vote' | 'mic_on' | 'mic_off' | 'cam_on' | 'cam_off'
      weight REAL NOT NULL DEFAULT 1.0,
      meta TEXT,
      ts INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_engagement_room_time ON engagement_events(room, ts);
    CREATE INDEX IF NOT EXISTS idx_engagement_identity ON engagement_events(room, identity, ts);

    CREATE TABLE IF NOT EXISTS talk_time (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      bucket_ms INTEGER NOT NULL,   -- aligned to bucket size for aggregation
      duration_ms INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity, bucket_ms)
    );

    CREATE TABLE IF NOT EXISTS cursors (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      name TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      ts INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity)
    );

    CREATE TABLE IF NOT EXISTS spatial_positions (
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (room, identity)
    );

    CREATE TABLE IF NOT EXISTS music_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      added_by TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 1,
      played INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_music_queue_room ON music_queue(room, played, created_at);

    CREATE TABLE IF NOT EXISTS trivia_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,       -- JSON array
      correct_index INTEGER NOT NULL,
      category TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS trivia_answers (
      round_id INTEGER NOT NULL,
      identity TEXT NOT NULL,
      name TEXT,
      answer_index INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      response_ms INTEGER NOT NULL DEFAULT 0,
      answered_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      PRIMARY KEY (round_id, identity),
      FOREIGN KEY (round_id) REFERENCES trivia_rounds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS word_cloud_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id TEXT NOT NULL,
      identity TEXT NOT NULL,
      word TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_word_cloud_poll ON word_cloud_responses(poll_id);

    CREATE TABLE IF NOT EXISTS bingo_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      identity TEXT NOT NULL,
      name TEXT,
      phrases TEXT NOT NULL,        -- JSON array of 24 phrases (5x5 center = FREE)
      marks TEXT NOT NULL DEFAULT '[]',  -- JSON array of 25 booleans
      has_bingo INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      UNIQUE(room, identity)
    );

    CREATE TABLE IF NOT EXISTS recaps (
      room TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      action_items TEXT NOT NULL DEFAULT '[]',  -- JSON
      decisions TEXT NOT NULL DEFAULT '[]',     -- JSON
      highlights TEXT NOT NULL DEFAULT '[]',    -- JSON
      participants TEXT NOT NULL DEFAULT '[]',  -- JSON
      duration_ms INTEGER NOT NULL DEFAULT 0,
      generated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        avatar_color TEXT DEFAULT 'indigo',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        user_agent TEXT,
        ip TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);

      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        email TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(provider, provider_user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

  `);
}
// === Chat ===
export type ChatMessage = {
  id: number;
  room: string;
  identity: string;
  name: string | null;
  body: string;
  kind: "text" | "file" | "system";
  meta: string | null;
  created_at: number;
};

export function addChat(msg: Omit<ChatMessage, "id" | "created_at">): ChatMessage {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO chat (room, identity, name, body, kind, meta)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(msg.room, msg.identity, msg.name ?? null, msg.body, msg.kind, msg.meta ?? null);
  return db
    .prepare(`SELECT * FROM chat WHERE id = ?`)
    .get(info.lastInsertRowid) as ChatMessage;
}

export function listChat(room: string, sinceId = 0, limit = 200): ChatMessage[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM chat WHERE room = ? AND id > ? ORDER BY id ASC LIMIT ?`
    )
    .all(room, sinceId, limit) as ChatMessage[];
}

// === Polls ===
export type PollKind = "multiple_choice" | "word_cloud";

export type Poll = {
  id: string;
  room: string;
  question: string;
  options: string[];
  created_by: string;
  created_at: number;
  closed: boolean;
  kind: PollKind;
};

export function createPoll(p: Omit<Poll, "created_at" | "closed" | "kind"> & { kind?: PollKind }): Poll {
  const db = getDb();
  db.prepare(
    `INSERT INTO polls (id, room, question, options, created_by, kind)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(p.id, p.room, p.question, JSON.stringify(p.options), p.created_by, p.kind ?? "multiple_choice");
  return getPoll(p.id)!;
}

export function getPoll(id: string): Poll | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id) as
    | (Omit<Poll, "options" | "closed"> & { options: string; closed: number; kind?: string })
    | undefined;
  if (!row) return null;
  return {
    ...row,
    options: JSON.parse(row.options),
    closed: !!row.closed,
    kind: (row.kind as PollKind) ?? "multiple_choice",
  };
}

export function listPolls(room: string): Poll[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM polls WHERE room = ? ORDER BY created_at DESC`)
    .all(room) as Array<Omit<Poll, "options" | "closed"> & { options: string; closed: number; kind?: string }>;
  return rows.map((r) => ({
    ...r,
    options: JSON.parse(r.options),
    closed: !!row_closed(r),
    kind: (r.kind as PollKind) ?? "multiple_choice",
  }));
}

function row_closed(r: { closed: number }): boolean {
  return !!r.closed;
}

export function votePoll(pollId: string, identity: string, optionIndex: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO poll_votes (poll_id, identity, option_index)
     VALUES (?, ?, ?)
     ON CONFLICT(poll_id, identity) DO UPDATE SET option_index = excluded.option_index, voted_at = strftime('%s','now') * 1000`
  ).run(pollId, identity, optionIndex);
}

export function pollResults(pollId: string): { counts: number[]; voters: Record<string, number> } {
  const db = getDb();
  const poll = getPoll(pollId);
  const totalOptions = poll ? poll.options.length : 0;
  const rows = db
    .prepare(`SELECT option_index, COUNT(*) as c FROM poll_votes WHERE poll_id = ? GROUP BY option_index`)
    .all(pollId) as Array<{ option_index: number; c: number }>;
  const counts = new Array<number>(totalOptions).fill(0);
  const voters: Record<string, number> = {};
  for (const r of rows) {
    if (r.option_index >= 0 && r.option_index < totalOptions) counts[r.option_index] = r.c;
    voters[r.option_index] = r.c;
  }
  return { counts, voters };
}

export function closePoll(pollId: string): void {
  const db = getDb();
  db.prepare(`UPDATE polls SET closed = 1 WHERE id = ?`).run(pollId);
}

// === Recordings ===
export type Recording = {
  id: string;
  room: string;
  started_by: string;
  started_at: number;
  ended_at: number | null;
  file_path: string | null;
  file_size: number | null;
  duration_ms: number | null;
  status: string;
};

export function startRecording(id: string, room: string, startedBy: string): Recording {
  const db = getDb();
  db.prepare(
    `INSERT INTO recordings (id, room, started_by) VALUES (?, ?, ?)`
  ).run(id, room, startedBy);
  return db.prepare(`SELECT * FROM recordings WHERE id = ?`).get(id) as Recording;
}

export function stopRecording(id: string, filePath: string, fileSize: number, durationMs: number): Recording {
  const db = getDb();
  db.prepare(
    `UPDATE recordings SET ended_at = strftime('%s','now') * 1000, file_path = ?, file_size = ?, duration_ms = ?, status = 'stopped' WHERE id = ?`
  ).run(filePath, fileSize, durationMs, id);
  return db.prepare(`SELECT * FROM recordings WHERE id = ?`).get(id) as Recording;
}

export function listRecordings(room: string): Recording[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM recordings WHERE room = ? ORDER BY started_at DESC`)
    .all(room) as Recording[];
}

export function listAllRecordings(limit = 100): Recording[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM recordings ORDER BY started_at DESC LIMIT ?`)
    .all(limit) as Recording[];
}

// === Breakout rooms ===
export function createBreakout(room: string, subRoom: string, createdBy: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO breakout_rooms (room, sub_room, created_by) VALUES (?, ?, ?)`
  ).run(room, subRoom, createdBy);
}

export function listBreakouts(room: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT sub_room FROM breakout_rooms WHERE room = ? ORDER BY created_at`)
    .all(room) as Array<{ sub_room: string }>;
  return rows.map((r) => r.sub_room);
}

export function deleteBreakouts(room: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM breakout_rooms WHERE room = ?`).run(room);
}

// === Hand raises ===
export function raiseHand(room: string, identity: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO hand_raises (room, identity) VALUES (?, ?)
     ON CONFLICT(room, identity) DO UPDATE SET raised_at = strftime('%s','now') * 1000`
  ).run(room, identity);
}

export function lowerHand(room: string, identity: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM hand_raises WHERE room = ? AND identity = ?`).run(room, identity);
}

export function listHandRaises(room: string): Array<{ identity: string; raised_at: number }> {
  const db = getDb();
  return db
    .prepare(`SELECT identity, raised_at FROM hand_raises WHERE room = ? ORDER BY raised_at`)
    .all(room) as Array<{ identity: string; raised_at: number }>;
}


// === Auth ===
export type User = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  avatar_color: string;
  created_at: number;
  updated_at: number;
};

export type Session = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  user_agent: string | null;
  ip: string | null;
  created_at: number;
};

export type OAuthAccount = {
  id: string;
  user_id: string;
  provider: "google" | "github";
  provider_user_id: string;
  email: string | null;
  created_at: number;
};

export function ensureAuthSchema() {
  const db = getDb();
  db.exec(`
      `);
}

// === Settings (admin-togglable per-room) ===
export type RoomSettings = {
  waitingRoom: boolean;       // require admin to admit
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

export const DEFAULT_SETTINGS: RoomSettings = {
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

export function getSettings(room: string): RoomSettings {
  const db = getDb();
  const row = db.prepare(`SELECT settings FROM room_settings WHERE room = ?`).get(room) as { settings: string } | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.settings) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(room: string, settings: Partial<RoomSettings>): RoomSettings {
  const db = getDb();
  const current = getSettings(room);
  const merged = { ...current, ...settings };
  db.prepare(
    `INSERT INTO room_settings (room, settings) VALUES (?, ?)
     ON CONFLICT(room) DO UPDATE SET settings = excluded.settings, updated_at = strftime('%s','now') * 1000`
  ).run(room, JSON.stringify(merged));
  return merged;
}

// === Scheduled meetings ===
export type ScheduledMeeting = {
  id: string;
  room: string;
  title: string;
  host: string;
  starts_at: number;
  duration_min: number;
  recurring: "none" | "daily" | "weekly" | "monthly";
  created_at: number;
};

export function scheduleMeeting(m: Omit<ScheduledMeeting, "created_at">): ScheduledMeeting {
  const db = getDb();
  db.prepare(
    `INSERT INTO scheduled_meetings (id, room, title, host, starts_at, duration_min, recurring)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(m.id, m.room, m.title, m.host, m.starts_at, m.duration_min, m.recurring);
  return getScheduled(m.id)!;
}

export function listScheduled(hostEmail?: string): ScheduledMeeting[] {
  const db = getDb();
  if (hostEmail) {
    return db.prepare(`SELECT * FROM scheduled_meetings WHERE host = ? ORDER BY starts_at DESC`).all(hostEmail) as ScheduledMeeting[];
  }
  return db.prepare(`SELECT * FROM scheduled_meetings ORDER BY starts_at DESC`).all() as ScheduledMeeting[];
}

export function getScheduled(id: string): ScheduledMeeting | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM scheduled_meetings WHERE id = ?`).get(id) as ScheduledMeeting) ?? null;
}

export function deleteScheduled(id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM scheduled_meetings WHERE id = ?`).run(id);
}

// === Personal meeting rooms (persistent URL like zoom.us/j/123) ===
export type PersonalRoom = {
  username: string;
  room: string;
  created_at: number;
};

export function getPersonalRoom(username: string): PersonalRoom | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM personal_rooms WHERE username = ?`).get(username) as PersonalRoom) ?? null;
}

export function setPersonalRoom(username: string): PersonalRoom {
  const db = getDb();
  const existing = getPersonalRoom(username);
  if (existing) return existing;
  // Generate short room ID
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let room = "";
  for (let i = 0; i < 10; i++) room += chars[Math.floor(Math.random() * chars.length)];
  db.prepare(`INSERT INTO personal_rooms (username, room) VALUES (?, ?)`).run(username, room);
  return { username, room, created_at: Date.now() };
}

// === Q&A ===
export type QAQuestion = {
  id: string;
  room: string;
  asker: string;
  asker_name: string | null;
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: number | null;
  upvotes: number;
  approved: boolean;
  created_at: number;
};

export function addQuestion(q: Omit<QAQuestion, "id" | "answer" | "answered_by" | "answered_at" | "upvotes" | "approved" | "created_at">): QAQuestion {
  const db = getDb();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO qa_questions (id, room, asker, asker_name, question)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, q.room, q.asker, q.asker_name, q.question);
  return getQuestion(id)!;
}

export function listQuestions(room: string, onlyApproved = false): QAQuestion[] {
  const db = getDb();
  const sql = onlyApproved
    ? `SELECT * FROM qa_questions WHERE room = ? AND approved = 1 ORDER BY upvotes DESC, created_at ASC`
    : `SELECT * FROM qa_questions WHERE room = ? ORDER BY created_at ASC`;
  return db.prepare(sql).all(room) as QAQuestion[];
}

export function getQuestion(id: string): QAQuestion | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM qa_questions WHERE id = ?`).get(id) as QAQuestion) ?? null;
}

export function upvoteQuestion(id: string): void {
  const db = getDb();
  db.prepare(`UPDATE qa_questions SET upvotes = upvotes + 1 WHERE id = ?`).run(id);
}

export function approveQuestion(id: string): void {
  const db = getDb();
  db.prepare(`UPDATE qa_questions SET approved = 1 WHERE id = ?`).run(id);
}

export function answerQuestion(id: string, answer: string, by: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE qa_questions SET answer = ?, answered_by = ?, answered_at = strftime('%s','now') * 1000 WHERE id = ?`
  ).run(answer, by, id);
}

// === Co-hosts (multi-host) ===
export function addCoHost(room: string, identity: string, addedBy: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO cohosts (room, identity, added_by) VALUES (?, ?, ?)`
  ).run(room, identity, addedBy);
}

export function removeCoHost(room: string, identity: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM cohosts WHERE room = ? AND identity = ?`).run(room, identity);
}

export function listCoHosts(room: string): Array<{ identity: string; added_by: string; added_at: number }> {
  const db = getDb();
  return db.prepare(`SELECT identity, added_by, added_at FROM cohosts WHERE room = ? ORDER BY added_at`).all(room) as any;
}

export function isCoHost(room: string, identity: string): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT 1 FROM cohosts WHERE room = ? AND identity = ?`).get(room, identity);
  return !!row;
}

// === Banned users (after kick) ===
export function banUser(room: string, identity: string, bannedBy: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO banned_users (room, identity, banned_by) VALUES (?, ?, ?)`
  ).run(room, identity, bannedBy);
}

export function unbanUser(room: string, identity: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM banned_users WHERE room = ? AND identity = ?`).run(room, identity);
}

export function isBanned(room: string, identity: string): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT 1 FROM banned_users WHERE room = ? AND identity = ?`).get(room, identity);
  return !!row;
}

export function listBanned(room: string): Array<{ identity: string; banned_by: string; banned_at: number }> {
  const db = getDb();
  return db.prepare(`SELECT identity, banned_by, banned_at FROM banned_users WHERE room = ?`).all(room) as any;
}

// === Spotlight (pin speakers) ===
export function setSpotlight(room: string, identities: string[]): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO spotlight (room, identities) VALUES (?, ?)
     ON CONFLICT(room) DO UPDATE SET identities = excluded.identities, updated_at = strftime('%s','now') * 1000`
  ).run(room, JSON.stringify(identities));
}

export function getSpotlight(room: string): string[] {
  const db = getDb();
  const row = db.prepare(`SELECT identities FROM spotlight WHERE room = ?`).get(room) as { identities: string } | undefined;
  if (!row) return [];
  try { return JSON.parse(row.identities); } catch { return []; }
}

export function clearSpotlight(room: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM spotlight WHERE room = ?`).run(room);
}

// === Notes (collaborative Markdown) ===
export type Note = {
  room: string;
  body: string;
  updated_at: number;
  updated_by: string | null;
};

export function getNotes(room: string): Note {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM notes WHERE room = ?`).get(room) as Note | undefined;
  return row ?? { room, body: "", updated_at: 0, updated_by: null };
}

export function setNotes(room: string, body: string, by: string): Note {
  const db = getDb();
  db.prepare(
    `INSERT INTO notes (room, body, updated_by) VALUES (?, ?, ?)
     ON CONFLICT(room) DO UPDATE SET body = excluded.body, updated_by = excluded.updated_by, updated_at = strftime('%s','now') * 1000`
  ).run(room, body, by);
  return getNotes(room);
}

// === Transcripts (per-message) ===
export type TranscriptLine = {
  id: number;
  room: string;
  identity: string;
  name: string | null;
  text: string;
  ts_ms: number;
  created_at: number;
};

export function addTranscriptLine(t: Omit<TranscriptLine, "id" | "created_at">): TranscriptLine {
  const db = getDb();
  const info = db.prepare(
    `INSERT INTO transcripts (room, identity, name, text, ts_ms) VALUES (?, ?, ?, ?, ?)`
  ).run(t.room, t.identity, t.name ?? null, t.text, t.ts_ms);
  return db.prepare(`SELECT * FROM transcripts WHERE id = ?`).get(info.lastInsertRowid) as TranscriptLine;
}

export function listTranscripts(room: string, sinceId = 0, limit = 500): TranscriptLine[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM transcripts WHERE room = ? AND id > ? ORDER BY id ASC LIMIT ?`).all(room, sinceId, limit) as TranscriptLine[];
}

// === AI summary ===
export type AISummary = {
  room: string;
  summary: string;
  action_items: string;
  generated_at: number;
};

export function saveSummary(s: Omit<AISummary, "generated_at">): AISummary {
  const db = getDb();
  db.prepare(
    `INSERT INTO ai_summaries (room, summary, action_items) VALUES (?, ?, ?)
     ON CONFLICT(room) DO UPDATE SET summary = excluded.summary, action_items = excluded.action_items, generated_at = strftime('%s','now') * 1000`
  ).run(s.room, s.summary, s.action_items);
  return { ...s, generated_at: Date.now() };
}

export function getSummary(room: string): AISummary | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM ai_summaries WHERE room = ?`).get(room) as AISummary) ?? null;
}

// === AI Sidekick (chat with the meeting) ===
export type AIConversation = {
  id: number;
  room: string;
  identity: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta: string | null;
  created_at: number;
};

export function addAIMessage(m: Omit<AIConversation, "id" | "created_at" | "meta"> & { meta?: string | null }): AIConversation {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO ai_conversations (room, identity, role, content, meta)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(m.room, m.identity, m.role, m.content, m.meta ?? null);
  return db
    .prepare(`SELECT * FROM ai_conversations WHERE id = ?`)
    .get(info.lastInsertRowid) as AIConversation;
}

export function listAIConversation(room: string, identity: string, limit = 100): AIConversation[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM ai_conversations WHERE room = ? AND identity = ? ORDER BY id ASC LIMIT ?`
    )
    .all(room, identity, limit) as AIConversation[];
}

// === AI Insights (auto-extracted action items, decisions, questions) ===
export type AIInsight = {
  id: number;
  room: string;
  kind: "action_item" | "decision" | "question" | "highlight";
  text: string;
  source: string | null;
  confidence: number;
  resolved: boolean;
  created_at: number;
};

export function addInsight(i: Omit<AIInsight, "id" | "created_at" | "resolved">): AIInsight {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO ai_insights (room, kind, text, source, confidence)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(i.room, i.kind, i.text, i.source ?? null, i.confidence ?? 1.0);
  return db
    .prepare(`SELECT * FROM ai_insights WHERE id = ?`)
    .get(info.lastInsertRowid) as AIInsight;
}

export function listInsights(room: string, onlyOpen = false): AIInsight[] {
  const db = getDb();
  const sql = onlyOpen
    ? `SELECT * FROM ai_insights WHERE room = ? AND resolved = 0 ORDER BY created_at DESC`
    : `SELECT * FROM ai_insights WHERE room = ? ORDER BY created_at DESC LIMIT 200`;
  return db.prepare(sql).all(room) as AIInsight[];
}

export function resolveInsight(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE ai_insights SET resolved = 1 WHERE id = ?`).run(id);
}

// === Engagement events (talk-time, attention, participation) ===
export type EngagementEvent = {
  id: number;
  room: string;
  identity: string;
  kind: string;
  weight: number;
  meta: string | null;
  ts: number;
};

export function logEngagement(e: Omit<EngagementEvent, "id">): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO engagement_events (room, identity, kind, weight, meta, ts)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(e.room, e.identity, e.kind, e.weight, e.meta ?? null, e.ts);
}

export function aggregateEngagement(
  room: string,
  sinceMs: number
): Array<{ identity: string; kind: string; count: number; weight: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT identity, kind, COUNT(*) as count, SUM(weight) as weight
       FROM engagement_events WHERE room = ? AND ts >= ?
       GROUP BY identity, kind`
    )
    .all(room, sinceMs) as any;
}

export function aggregateTalkTime(
  room: string,
  bucketMs: number,
  sinceMs: number
): Array<{ identity: string; total_ms: number; buckets: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT identity, SUM(duration_ms) as total_ms, COUNT(*) as buckets
       FROM talk_time WHERE room = ? AND bucket_ms >= ?
       GROUP BY identity ORDER BY total_ms DESC`
    )
    .all(room, sinceMs) as any;
}

export function addTalkTime(room: string, identity: string, bucketMs: number, durationMs: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO talk_time (room, identity, bucket_ms, duration_ms)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(room, identity, bucket_ms) DO UPDATE SET duration_ms = duration_ms + excluded.duration_ms`
  ).run(room, identity, bucketMs, durationMs);
}

// === Cursors (attention / pointer presence) ===
export type Cursor = {
  room: string;
  identity: string;
  name: string | null;
  x: number;
  y: number;
  ts: number;
};

export function upsertCursor(c: Omit<Cursor, "ts">): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO cursors (room, identity, name, x, y, ts)
     VALUES (?, ?, ?, ?, ?, strftime('%s','now') * 1000)
     ON CONFLICT(room, identity) DO UPDATE SET x = excluded.x, y = excluded.y, name = excluded.name, ts = excluded.ts`
  ).run(c.room, c.identity, c.name ?? null, c.x, c.y);
}

export function listRecentCursors(room: string, maxAgeMs = 8000): Cursor[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM cursors WHERE room = ? AND ts >= ? ORDER BY ts DESC`
    )
    .all(room, Date.now() - maxAgeMs) as Cursor[];
}

export function clearStaleCursors(room: string, maxAgeMs = 30000): void {
  const db = getDb();
  db.prepare(`DELETE FROM cursors WHERE room = ? AND ts < ?`).run(room, Date.now() - maxAgeMs);
}

// === Spatial positions ===
export type SpatialPosition = {
  room: string;
  identity: string;
  x: number;
  y: number;
  updated_at: number;
};

export function setSpatialPosition(room: string, identity: string, x: number, y: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO spatial_positions (room, identity, x, y) VALUES (?, ?, ?, ?)
     ON CONFLICT(room, identity) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = strftime('%s','now') * 1000`
  ).run(room, identity, Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
}

export function listSpatialPositions(room: string): SpatialPosition[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM spatial_positions WHERE room = ?`).all(room) as SpatialPosition[];
}

export function clearSpatialPositions(room: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM spatial_positions WHERE room = ?`).run(room);
}

// === Music queue ===
export type MusicTrack = {
  id: number;
  room: string;
  url: string;
  title: string;
  added_by: string;
  votes: number;
  played: boolean;
  created_at: number;
};

export function addMusicTrack(t: { room: string; url: string; title: string; added_by: string }): MusicTrack {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO music_queue (room, url, title, added_by) VALUES (?, ?, ?, ?)`)
    .run(t.room, t.url.slice(0, 500), t.title.slice(0, 200), t.added_by.slice(0, 80));
  return db.prepare(`SELECT * FROM music_queue WHERE id = ?`).get(info.lastInsertRowid) as MusicTrack;
}

export function listMusicQueue(room: string, onlyQueued = true): MusicTrack[] {
  const db = getDb();
  const sql = onlyQueued
    ? `SELECT * FROM music_queue WHERE room = ? AND played = 0 ORDER BY votes DESC, created_at ASC`
    : `SELECT * FROM music_queue WHERE room = ? ORDER BY played ASC, created_at DESC LIMIT 50`;
  return db.prepare(sql).all(room) as MusicTrack[];
}

export function voteMusicTrack(id: number, delta: number): void {
  const db = getDb();
  db.prepare(`UPDATE music_queue SET votes = MAX(0, votes + ?) WHERE id = ?`).run(delta, id);
}

export function markMusicPlayed(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE music_queue SET played = 1 WHERE id = ?`).run(id);
}

export function removeMusicTrack(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM music_queue WHERE id = ?`).run(id);
}

// === Trivia ===
export type TriviaRound = {
  id: number;
  room: string;
  question: string;
  options: string[];
  correct_index: number;
  category: string | null;
  created_by: string;
  created_at: number;
};

export function addTriviaRound(r: Omit<TriviaRound, "id" | "created_at">): TriviaRound {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO trivia_rounds (room, question, options, correct_index, category, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(r.room, r.question, JSON.stringify(r.options), r.correct_index, r.category ?? null, r.created_by);
  return db.prepare(`SELECT * FROM trivia_rounds WHERE id = ?`).get(info.lastInsertRowid) as TriviaRound;
}

export function listTriviaRounds(room: string, limit = 30): TriviaRound[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM trivia_rounds WHERE room = ? ORDER BY created_at DESC LIMIT ?`)
    .all(room, limit) as Array<Omit<TriviaRound, "options"> & { options: string }>;
  return rows.map((r) => ({ ...r, options: JSON.parse(r.options) }));
}

export function answerTrivia(args: {
  round_id: number;
  identity: string;
  name: string;
  answer_index: number;
  correct: boolean;
  score: number;
  response_ms: number;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO trivia_answers (round_id, identity, name, answer_index, correct, score, response_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(round_id, identity) DO UPDATE SET answer_index = excluded.answer_index, correct = excluded.correct, score = excluded.score, response_ms = excluded.response_ms`
  ).run(args.round_id, args.identity, args.name, args.answer_index, args.correct ? 1 : 0, args.score, args.response_ms);
}

export function triviaLeaderboard(room: string, sinceMs = 0): Array<{ identity: string; name: string | null; total_score: number; correct: number; rounds: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.identity, a.name, SUM(a.score) as total_score, SUM(a.correct) as correct, COUNT(*) as rounds
       FROM trivia_answers a
       JOIN trivia_rounds r ON r.id = a.round_id
       WHERE r.room = ? AND r.created_at >= ?
       GROUP BY a.identity ORDER BY total_score DESC LIMIT 20`
    )
    .all(room, sinceMs) as any;
}

export function triviaRoundResults(roundId: number): Array<{ identity: string; name: string | null; answer_index: number; score: number; response_ms: number }> {
  const db = getDb();
  return db
    .prepare(`SELECT identity, name, answer_index, score, response_ms FROM trivia_answers WHERE round_id = ? ORDER BY score DESC, response_ms ASC`)
    .all(roundId) as any;
}

// === Word cloud poll responses ===
export type WordCloudEntry = { word: string; count: number };

export function addWordCloudResponse(pollId: string, identity: string, word: string): void {
  const db = getDb();
  const w = word.trim().toLowerCase().slice(0, 80);
  if (!w) return;
  db.prepare(`INSERT INTO word_cloud_responses (poll_id, identity, word) VALUES (?, ?, ?)`).run(pollId, identity.slice(0, 80), w);
}

export function wordCloudResults(pollId: string): WordCloudEntry[] {
  const db = getDb();
  return db
    .prepare(`SELECT word, COUNT(*) as count FROM word_cloud_responses WHERE poll_id = ? GROUP BY word ORDER BY count DESC LIMIT 60`)
    .all(pollId) as WordCloudEntry[];
}

// === Bingo ===
export type BingoCard = {
  id: number;
  room: string;
  identity: string;
  name: string | null;
  phrases: string[];
  marks: boolean[];
  has_bingo: boolean;
  completed_at: number | null;
  created_at: number;
};

const BINGO_PHRASE_BANK = [
  "Can you hear me?", "Let's circle back", "As per my last email", "Synergy", "Touch base",
  "Move the needle", "Low-hanging fruit", "Bandwidth", "Pivot", "Deep dive",
  "Take it offline", "Boil the ocean", "Open the kimono", "Drink from the firehose",
  "Best practice", "Value-add", "Action item", "Stakeholder", "Deliverable",
  "Quick win", "Going forward", "On the same page", "Ping me", "Loop in",
  "Ducks in a row", "Net-net", "Push back", "Vertical", "Horizontal",
  "Holistic", "Granular", "Robust", "Scalable", "Idiomatic",
  "Heads up", "FYI", "TL;DR", "TLDR", "Hope this helps",
  "Per my last message", "Friendly reminder", "Just a heads up", "Following up",
  "Sorry for the late reply", "Agreed", "Sounds good", "Will do", "Noted",
  "Thanks!", "Awesome", "Cool", "Perfect", "Great catch",
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateBingoCard(room: string, identity: string, name?: string): BingoCard {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM bingo_cards WHERE room = ? AND identity = ?`).get(room, identity) as BingoCard | undefined;
  if (existing) return existing;

  const phrases = shuffle(BINGO_PHRASE_BANK).slice(0, 24);
  const marks = new Array(25).fill(false);
  marks[12] = true; // center free
  const info = db
    .prepare(`INSERT INTO bingo_cards (room, identity, name, phrases, marks) VALUES (?, ?, ?, ?, ?)`)
    .run(room, identity.slice(0, 80), name?.slice(0, 80) ?? null, JSON.stringify(phrases), JSON.stringify(marks));
  return db.prepare(`SELECT * FROM bingo_cards WHERE id = ?`).get(info.lastInsertRowid) as BingoCard;
}

export function getBingoCard(room: string, identity: string): BingoCard | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM bingo_cards WHERE room = ? AND identity = ?`).get(room, identity) as BingoCard | undefined;
  if (!row) return null;
  return { ...row, phrases: JSON.parse(row.phrases as any), marks: JSON.parse(row.marks as any) };
}

export function toggleBingoMark(room: string, identity: string, index: number): BingoCard | null {
  const card = getBingoCard(room, identity);
  if (!card) return null;
  if (index < 0 || index >= 25) return card;
  const marks = card.marks.slice();
  marks[index] = !marks[index];
  const hasBingo = checkBingo(marks) ? 1 : 0;
  const db = getDb();
  db.prepare(`UPDATE bingo_cards SET marks = ?, has_bingo = ?, completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN strftime('%s','now') * 1000 ELSE completed_at END WHERE room = ? AND identity = ?`)
    .run(JSON.stringify(marks), hasBingo, hasBingo, room, identity);
  return getBingoCard(room, identity);
}

export function autoMarkBingo(room: string, identity: string, phrase: string): { card: BingoCard; newlyMarked: boolean } | null {
  const card = getBingoCard(room, identity);
  if (!card) return null;
  const idx = card.phrases.findIndex((p) => p.toLowerCase() === phrase.toLowerCase());
  if (idx === -1 || card.marks[idx]) return null;
  const marks = card.marks.slice();
  marks[idx] = true;
  const hasBingo = checkBingo(marks) ? 1 : 0;
  const db = getDb();
  db.prepare(`UPDATE bingo_cards SET marks = ?, has_bingo = ?, completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN strftime('%s','now') * 1000 ELSE completed_at END WHERE room = ? AND identity = ?`)
    .run(JSON.stringify(marks), hasBingo, hasBingo, room, identity);
  return { card: getBingoCard(room, identity)!, newlyMarked: true };
}

export function bingoLeaderboard(room: string): Array<{ identity: string; name: string | null; has_bingo: boolean; completed_at: number | null; marks: number }> {
  const db = getDb();
  return db.prepare(`SELECT identity, name, has_bingo, completed_at, marks FROM bingo_cards WHERE room = ? ORDER BY has_bingo DESC, completed_at ASC LIMIT 20`).all(room) as any;
}

function checkBingo(marks: boolean[]): boolean {
  // 5x5 grid; check rows, cols, diagonals
  for (let r = 0; r < 5; r++) {
    if ([0, 1, 2, 3, 4].every((c) => marks[r * 5 + c])) return true;
  }
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => marks[r * 5 + c])) return true;
  }
  if ([0, 6, 12, 18, 24].every((i) => marks[i])) return true;
  if ([4, 8, 12, 16, 20].every((i) => marks[i])) return true;
  return false;
}

// === Recaps ===
export type Recap = {
  room: string;
  summary: string;
  action_items: string;
  decisions: string;
  highlights: string;
  participants: string;
  duration_ms: number;
  generated_at: number;
};

export function saveRecap(r: Omit<Recap, "generated_at">): Recap {
  const db = getDb();
  db.prepare(
    `INSERT INTO recaps (room, summary, action_items, decisions, highlights, participants, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(room) DO UPDATE SET summary = excluded.summary, action_items = excluded.action_items, decisions = excluded.decisions, highlights = excluded.highlights, participants = excluded.participants, duration_ms = excluded.duration_ms, generated_at = strftime('%s','now') * 1000`
  ).run(r.room, r.summary, r.action_items, r.decisions, r.highlights, r.participants, r.duration_ms);
  return getRecap(r.room)!;
}

export function getRecap(room: string): Recap | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM recaps WHERE room = ?`).get(room) as Recap) ?? null;
}
