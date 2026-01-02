// Join or create a room
// Default behavior: create a new random room ID and redirect.
import { redirect } from "next/navigation";

function randomId() {
  // 3-word readable slug like "indus-quick-meeting"
  // In production: use a robust generator and check for collision.
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg(4)}-${seg(4)}-${seg(4)}`;
}

export default function NewMeetingPage() {
  const id = randomId();
  redirect(`/meet/${id}`);
}
