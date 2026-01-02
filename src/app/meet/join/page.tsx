// /meet/join?code=abc-def-ghi → redirect to /meet/abc-def-ghi
// In production: validate the code, look up the actual room id, handle aliases.
import { redirect } from "next/navigation";

export default async function JoinByCode({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (!code || !code.trim()) {
    redirect("/");
  }
  // Strip any URL prefix the user pasted in (e.g. https://indux.app/meet/abc-123-xyz)
  const cleaned = code
    .trim()
    .replace(/^https?:\/\/[^/]+\/meet\//, "")
    .replace(/^\/+/, "")
    .split("/")[0];
  if (!cleaned) {
    redirect("/");
  }
  redirect(`/meet/${cleaned}`);
}
