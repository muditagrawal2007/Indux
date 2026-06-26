// Indux Meet — Newsletter signup
// Adds emails to a local table. In production, sync to Mailchimp/ConvertKit.

import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter, countNewsletterSubscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 64) : "launcher";
  const result = subscribeNewsletter(email, source);
  return NextResponse.json({
    ok: true,
    already: result.already,
    message: result.already ? "You're already on the list!" : "Welcome aboard. Watch for updates.",
    total: countNewsletterSubscribers(),
  });
}

export async function GET() {
  return NextResponse.json({
    total: countNewsletterSubscribers(),
  });
}
