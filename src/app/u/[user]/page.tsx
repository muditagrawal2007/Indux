import { redirect } from "next/navigation";
import { getPersonalRoom, setPersonalRoom } from "@/lib/db";

// Personal meeting room: /u/alice → always redirects to /meet/alice's-personal-room
// ?name=... is forwarded to PreJoin so the user starts with their name pre-filled.
export default async function PersonalRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ user: string }>;
  searchParams: Promise<{ name?: string; admin?: string }>;
}) {
  const { user } = await params;
  const { name, admin } = await searchParams;
  let pr = getPersonalRoom(user);
  if (!pr) pr = setPersonalRoom(user);
  const q = new URLSearchParams();
  if (name) q.set("name", name);
  if (admin === "1") q.set("admin", "1");
  const qs = q.toString();
  redirect(`/meet/${pr.room}${qs ? "?" + qs : ""}`);
}