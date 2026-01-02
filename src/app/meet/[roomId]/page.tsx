// Indux Meeting Room
// ?admin=1   → join as admin (full controls)
// ?embed=1   → minimal UI (no top bar, no launcher chrome) — for iframe
// ?name=...  → pre-fill display name
import { headers } from "next/headers";
import { RoomClient } from "./RoomClient";

export default async function MeetingRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ admin?: string; embed?: string; name?: string }>;
}) {
  const { roomId } = await params;
  const { admin, embed, name } = await searchParams;

  const hdrs = await headers();
  const user = hdrs.get("x-indux-user") || name || "guest";
  const isAdmin = admin === "1" || admin === "true";
  const isEmbed = embed === "1" || embed === "true";

  return (
    <div className="h-screen w-screen bg-gray-950">
      <RoomClient
        roomId={roomId}
        identity={user}
        isAdmin={isAdmin}
        isEmbed={isEmbed}
        externalName={name ?? null}
      />
    </div>
  );
}