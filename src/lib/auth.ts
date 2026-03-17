// Auth helpers — bcrypt + JWT + session management
// Uses jose (JWT) and bcryptjs (password hashing)

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getDb, type Session, type User } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.INDUX_SESSION_SECRET || "indux-dev-secret-change-in-prod-please"
);

const COOKIE_NAME = "indux_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, req?: { ip?: string; userAgent?: string }): Promise<{ token: string; session: Session }> {
  const id = randomUUID();
  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  const tokenHash = await bcrypt.hash(token, 8);
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt, req?.userAgent ?? null, req?.ip ?? null, now);

  // Sign a JWT
  const jwt = await new SignJWT({ sid: id, sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);

  return { token: jwt, session: { id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt, user_agent: req?.userAgent ?? null, ip: req?.ip ?? null, created_at: now } };
}

const sessionsById = new Map<string, { userId: string; expiresAt: number }>();

export async function getSessionByToken(jwt: string): Promise<Session | null> {
  let payload: { sid: string; sub: string };
  try {
    const verified = await jwtVerify(jwt, SECRET);
    payload = verified.payload as { sid: string; sub: string };
  } catch {
    return null;
  }

  // Check cache
  const cached = sessionsById.get(payload.sid);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: payload.sid, user_id: cached.userId, token_hash: "", expires_at: cached.expiresAt, user_agent: null, ip: null, created_at: 0 };
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(payload.sid) as Session | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(payload.sid);
    return null;
  }

  sessionsById.set(payload.sid, { userId: row.user_id, expiresAt: row.expires_at });
  return row;
}

export async function getUserBySession(s: Session): Promise<User | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(s.user_id) as User | undefined;
  return row ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session) return null;
  return getUserBySession(session);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function deleteSession(token: string) {
  try {
    const verified = await jwtVerify(token, SECRET);
    const sid = (verified.payload as { sid: string }).sid;
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
  } catch {}
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
