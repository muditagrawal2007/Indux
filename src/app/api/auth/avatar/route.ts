// Update user avatar color
// POST /api/auth/avatar  { color: "indigo" | "violet" | ... }
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const ALLOWED_COLORS = [
  "indigo","violet","rose","amber","emerald","cyan","sky","teal",
  "lime","orange","pink","slate",
];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json();
    const color = String(body.color ?? "");
    if (!ALLOWED_COLORS.includes(color)) {
      return NextResponse.json(
        { error: `Color must be one of: ${ALLOWED_COLORS.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(`UPDATE users SET avatar_color = ? WHERE id = ?`).run(color, user.id);
    return NextResponse.json({ ok: true, color });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}