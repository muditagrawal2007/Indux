// Indux Meet — Token API
// Mints a LiveKit JWT for the requesting user.
// In production: validate session, look up the user/org, scope permissions.
import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, identity, name, isAdmin } = body as {
      room: string;
      identity: string;
      name?: string;
      isAdmin?: boolean;
    };

    if (!room || !identity) {
      return NextResponse.json(
        { error: "Missing required fields: room, identity" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Server not configured (missing LIVEKIT_API_KEY/SECRET)" },
        { status: 500 }
      );
    }

    // Everyone who joins gets publish + subscribe by default. The lobby
    // (waiting room) feature is enforced via room.metadata on the server
    // side, not by restricting publish at token-mint time — otherwise
    // regular joiners can't share their camera/mic, which defeats the
    // purpose of a video meeting.
    const admin = !!isAdmin;
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
      ttl: 60 * 60 * 4,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // chat always works
      roomAdmin: admin,
      roomCreate: admin,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL || "ws://localhost:7880",
      room,
      identity,
      isAdmin: admin,
    });
  } catch (e) {
    console.error("Token API error:", e);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}