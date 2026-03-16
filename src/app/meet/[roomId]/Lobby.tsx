"use client";

// Lobby / waiting room screen
// Shown when the user is in the room but waiting to be admitted (canPublish=false)
import { useEffect, useState } from "react";

export function LobbyScreen({
  roomId,
  identity,
  userName,
  onAdmitted,
  onLeave,
}: {
  roomId: string;
  identity: string;
  userName: string;
  onAdmitted: () => void;
  onLeave: () => void;
}) {
  const [knocking, setKnocking] = useState(false);
  const [knockedAt, setKnockedAt] = useState<number | null>(null);
  const [rejected, setRejected] = useState(false);

  // Send a "knock" notification to the admin
  async function knock() {
    setKnocking(true);
    setKnockedAt(Date.now());
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, userName }),
      });
    } catch {}
  }

  // Poll for admission (admin promotes canPublish=true)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/state`);
        if (r.ok) {
          const data = await r.json();
          if (data.admitted) {
            onAdmitted();
          }
          if (data.rejected) {
            setRejected(true);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [roomId, onAdmitted]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-950 p-6 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-gray-800/50 p-4 ring-2 ring-yellow-500/30">
          <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-semibold">Waiting for the host</h2>
        <p className="mt-2 text-sm text-gray-400">
          You're in the waiting room for{" "}
          <code className="font-mono text-gray-300">/{roomId}</code>
        </p>
        {rejected ? (
          <div className="mt-6 rounded-md border border-red-800 bg-red-900/30 p-4">
            <p className="text-sm text-red-300">The host didn't admit you to this meeting.</p>
            <button
              onClick={onLeave}
              className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
            >
              Leave
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-gray-500">
              {userName} is waiting to join
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={knock}
                disabled={knocking}
                className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {knocking ? "Knock sent OK" : " Let me in"}
              </button>
              <button
                onClick={onLeave}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Leave
              </button>
            </div>
            {knockedAt && (
              <p className="mt-3 text-[11px] text-gray-500">
                Knocked at {new Date(knockedAt).toLocaleTimeString()}
              </p>
            )}
            <p className="mt-6 text-[11px] text-gray-600">
              Tip: even in the lobby, you can hear and see others if they let you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}