// Login — authenticate user + create session
// POST /api/auth/login
// Body: { email, password }
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as any;
    if (!user) {
      return NextResponse.json({ error: "Email or password incorrect" }, { status: 401 });
    }
    if (!user.password_hash) {
      return NextResponse.json({ error: "Please sign in with OAuth" }, { status: 401 });
    }
    
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Email or password incorrect" }, { status: 401 });
    }
    
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const { token } = await createSession(user.id, { ip, userAgent });
    await setSessionCookie(token);
    
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar_color: user.avatar_color, created_at: user.created_at, updated_at: user.updated_at }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
