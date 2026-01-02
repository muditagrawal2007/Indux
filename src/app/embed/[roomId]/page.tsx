// Embeddable meeting iframe
// Usage: <iframe src="https://indux.com/embed/abc-123-xyz?token=..." />
// No chrome, no header, just the room.
import { headers } from "next/headers";
import { RoomClient } from "../../meet/[roomId]/RoomClient";

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ admin?: string; name?: string }>;
}) {
  const { roomId } = await params;
  const { admin, name } = await searchParams;
  const hdrs = await headers();
  const user = hdrs.get("x-indux-user") || name || "guest";
  const isAdmin = admin === "1" || admin === "true";

  return (
    <div className="h-screen w-screen bg-gray-950">
      <RoomClient roomId={roomId} identity={user} isAdmin={isAdmin} externalName={name} />
    </div>
  );
}