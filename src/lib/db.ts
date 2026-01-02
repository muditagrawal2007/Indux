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
export type Poll = {
  id: string;
  room: string;
  question: string;
  options: string[];
  created_by: string;
  created_at: number;
  closed: boolean;
};

export function createPoll(p: Omit<Poll, "created_at" | "closed">): Poll {
  const db = getDb();
  db.prepare(
    `INSERT INTO polls (id, room, question, options, created_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(p.id, p.room, p.question, JSON.stringify(p.options), p.created_by);
  return getPoll(p.id)!;
}

export function getPoll(id: string): Poll | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id) as
    | (Omit<Poll, "options" | "closed"> & { options: string; closed: number })
    | undefined;
  if (!row) return null;
  return {
    ...row,
    options: JSON.parse(row.options),
    closed: !!row.closed,
  };
}

export function listPolls(room: string): Poll[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM polls WHERE room = ? ORDER BY created_at DESC`)
    .all(room) as Array<Omit<Poll, "options" | "closed"> & { options: string; closed: number }>;
  return rows.map((r) => ({
    ...r,
    options: JSON.parse(r.options),
    closed: !!r.closed,
  }));
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
  const rows = db
    .prepare(`SELECT option_index, COUNT(*) as c FROM poll_votes WHERE poll_id = ? GROUP BY option_index`)
    .all(pollId) as Array<{ option_index: number; c: number }>;
  const voters: Record<string, number> = {};
  for (const r of rows) voters[r.option_index] = r.c;
  return { counts: rows.map((r) => r.c), voters };
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
