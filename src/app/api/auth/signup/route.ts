// Signup — create new user + session
// POST /api/auth/signup
// Body: { email, password, name }
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    
    // Validate
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be 2+ characters" }, { status: 400 });
    }
    
    const db = getDb();
    
    // Check if email exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    
    // Create user
    const id = randomUUID();
    const now = Date.now();
    const passwordHash = await hashPassword(password);
    const colors = ["indigo", "violet", "rose", "amber", "emerald", "cyan"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, avatar_color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, email.toLowerCase(), name.trim(), passwordHash, avatarColor, now, now);
    
    // Create session
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const { token } = await createSession(id, { ip, userAgent });
    await setSessionCookie(token);
    
    return NextResponse.json({
      user: { id, email: email.toLowerCase(), name: name.trim(), avatar_color: avatarColor, created_at: now, updated_at: now }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
