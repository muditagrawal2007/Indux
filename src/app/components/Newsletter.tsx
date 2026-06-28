"use client";

// Indux Meet — Newsletter signup strip for the launcher.
// POSTs to /api/newsletter. Shows confirmation on success.

import { useState } from "react";
import { Icon } from "./Icons";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setMessage("");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "launcher" }),
      });
      const d = await r.json();
      if (!r.ok) {
        setState("err");
        setMessage(d.error ?? "Something went wrong.");
        return;
      }
      setState("ok");
      setMessage(d.message ?? "Welcome aboard.");
      setEmail("");
    } catch {
      setState("err");
      setMessage("Network error. Try again?");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--accent)]/8 via-transparent to-purple-500/8 p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[color:var(--accent)]/15 blur-3xl"
        aria-hidden
      />
      <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
            <Icon.Sparkles size={9} />
            Updates
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">
            Get notified about new features
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-[color:var(--text-secondary)]">
            One short email per release. We&apos;ll never spam, and we&apos;ll never sell your address.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state !== "idle") setState("idle"); }}
            placeholder="you@example.com"
            required
            disabled={state === "sending"}
            className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={state === "sending" || !email.trim()}
            className="btn-primary !rounded-lg disabled:opacity-40"
          >
            {state === "sending" ? "Sending…" : "Subscribe"}
          </button>
        </form>
      </div>
      {message && (
        <div
          role="status"
          className={
            "relative mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs " +
            (state === "ok"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600")
          }
        >
          {state === "ok" ? <Icon.Check size={11} /> : <Icon.Alert size={11} />}
          {message}
        </div>
      )}
    </div>
  );
}
