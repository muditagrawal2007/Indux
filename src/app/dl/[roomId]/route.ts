// Mobile deep link landing
// When iOS/Android app is installed, it handles `indux://` scheme.
// Otherwise we redirect to the appropriate app store.
// GET /dl/[roomId]?token=...

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;
  const url = new URL(req.url);
  const params = url.searchParams.toString();
  const deepLink = `indux://${roomId}${params ? "?" + params : ""}`;
  const webUrl = `${url.origin}/meet/${roomId}${params ? "?" + params : ""}`;

  // Redirect to web (the app, if installed, should intercept indux:// URLs)
  // In a real mobile app, you would also link the universal/app links here.
  return NextResponse.redirect(webUrl, 302);
}