"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../components/Icons";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 4 ? 1 : password.length < 8 ? 2 : 3;
  const strengthColors = ["", "bg-[color:danger]", "bg-[color:warning]", "bg-[color:success]"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Sign up failed");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] transition-colors duration-300">
      <div className="aurora-bg" />

      <header className="relative z-10 border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-700))" }}
            >
              IX
            </div>
            <span className="text-sm font-semibold tracking-tight">Indux Meet</span>
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-6 pt-16 pb-24">
        <div className="animate-fadeIn">
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl text-lg font-bold text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand-600))" }}
            >
              IX
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Free forever. No credit card required.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="animate-fadeIn stagger-1">
              <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoFocus
                required
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
              />
            </div>
            <div className="animate-fadeIn stagger-2">
              <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
              />
            </div>
            <div className="animate-fadeIn stagger-3">
              <label className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-2.5 pr-10 text-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <Icon.EyeOff size={14} /> : <Icon.Eye size={14} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i <= passwordStrength ? strengthColors[passwordStrength] : "bg-[color:var(--border)]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium ${passwordStrength === 3 ? "text-[color:success]" : passwordStrength === 2 ? "text-[color:warning]" : "text-[color:danger]"}`}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="animate-scaleIn flex items-center gap-2 rounded-lg border border-[color:danger]/30 bg-[color:danger]/10 px-3 py-2.5 text-xs text-[color:danger]">
                <Icon.Alert size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !name || !password}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </span>
              ) : (
                <>
                  Create account
                  <Icon.Arrow size={14} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 animate-fadeIn stagger-4 text-center text-sm text-[color:var(--text-secondary)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[color:var(--accent)] hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
