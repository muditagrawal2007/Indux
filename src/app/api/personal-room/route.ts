// Personal meeting room
import { getPersonalRoom, setPersonalRoom } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const user = new URL(req.url).searchParams.get("user") || "guest";
  let pr = getPersonalRoom(user);
  if (!pr) pr = setPersonalRoom(user);
  return NextResponse.json({ personalRoom: pr });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = body.user || body.username || "guest";
    const pr = setPersonalRoom(user);
    return NextResponse.json({ personalRoom: pr });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
