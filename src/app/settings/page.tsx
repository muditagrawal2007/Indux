"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Theme = "light" | "dark" | "system";
type Accent = "indigo" | "violet" | "rose" | "amber" | "emerald" | "cyan" | "slate";
type Density = "compact" | "default" | "comfortable";
type Motion = "full" | "reduced";

const ACCENTS: { id: Accent; name: string; color: string }[] = [
  { id: "indigo",  name: "Indigo",  color: "#4f46e5" },
  { id: "violet",  name: "Violet",  color: "#8b5cf6" },
  { id: "rose",    name: "Rose",    color: "#f43f5e" },
  { id: "amber",   name: "Amber",   color: "#f59e0b" },
  { id: "emerald", name: "Emerald", color: "#10b981" },
  { id: "cyan",    name: "Cyan",    color: "#06b6d4" },
  { id: "slate",   name: "Slate",   color: "#475569" },
];

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [accent, setAccent] = useState<Accent>("indigo");
  const [density, setDensity] = useState<Density>("default");
  const [motion, setMotion] = useState<Motion>("full");

  // Load saved preferences
  useEffect(() => {
    const t = (localStorage.getItem("indux_theme") as Theme) || "system";
    const a = (localStorage.getItem("indux_accent") as Accent) || "indigo";
    const d = (localStorage.getItem("indux_density") as Density) || "default";
    const m = (localStorage.getItem("indux_motion") as Motion) || "full";
    setTheme(t); setAccent(a); setDensity(d); setMotion(m);
    applyPrefs(t, a, d, m);
  }, []);

  function applyPrefs(t: Theme, a: Accent, d: Density, m: Motion) {
    const root = document.documentElement;
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (t === "dark" || (t === "system" && sysDark)) root.classList.add("dark");
    else root.classList.remove("dark");
    root.dataset.accent = a;
    root.dataset.density = d;
    root.dataset.motion = m;
    localStorage.setItem("indux_theme", t);
    localStorage.setItem("indux_accent", a);
    localStorage.setItem("indux_density", d);
    localStorage.setItem("indux_motion", m);
  }

  function update<K extends "theme" | "accent" | "density" | "motion">(
    key: K,
    value: K extends "theme" ? Theme
         : K extends "accent" ? Accent
         : K extends "density" ? Density
         : Motion
  ) {
    const next = { theme, accent, density, motion, [key]: value } as any;
    setTheme(next.theme); setAccent(next.accent); setDensity(next.density); setMotion(next.motion);
    applyPrefs(next.theme, next.accent, next.density, next.motion);
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--bg-overlay)] backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
            ← Back
          </Link>
          <h1 className="text-sm font-semibold">Settings</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Appearance</h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Customize how Indux Meet looks on your device. Saved automatically.
          </p>
        </div>

        <Section title="Theme" desc="Choose your preferred color scheme">
          <div className="grid grid-cols-3 gap-3">
            <Card
              active={theme === "light"}
              onClick={() => update("theme", "light")}
              icon="☀"
              label="Light"
              desc="Always light"
            />
            <Card
              active={theme === "dark"}
              onClick={() => update("theme", "dark")}
              icon="🌙"
              label="Dark"
              desc="Easy on the eyes"
            />
            <Card
              active={theme === "system"}
              onClick={() => update("theme", "system")}
              icon="◐"
              label="System"
              desc="Follow OS preference"
            />
          </div>
        </Section>

        <Section title="Accent color" desc="Used for buttons, links, and highlights">
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => update("accent", a.id)}
                className={
                  "group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all " +
                  (accent === a.id
                    ? "border-[color:var(--accent)] bg-[color:var(--bg-elevated)]"
                    : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]")
                }
              >
                <span
                  className="h-5 w-5 rounded-full ring-1 ring-[color:var(--border)]"
                  style={{ background: a.color }}
                />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Density" desc="How much breathing room in lists and cards">
          <div className="pill">
            <button onClick={() => update("density", "compact")} className={density === "compact" ? "active" : ""}>
              Compact
            </button>
            <button onClick={() => update("density", "default")} className={density === "default" ? "active" : ""}>
              Default
            </button>
            <button onClick={() => update("density", "comfortable")} className={density === "comfortable" ? "active" : ""}>
              Comfortable
            </button>
          </div>
        </Section>

        <Section title="Motion" desc="Reduce animation for accessibility">
          <div className="pill">
            <button onClick={() => update("motion", "full")} className={motion === "full" ? "active" : ""}>
              Full
            </button>
            <button onClick={() => update("motion", "reduced")} className={motion === "reduced" ? "active" : ""}>
              Reduced
            </button>
          </div>
        </Section>

        <Section title="Data" desc="Your preferences are saved in your browser only">
          <button
            onClick={() => {
              if (confirm("Reset all settings to defaults?")) {
                localStorage.clear();
                location.reload();
              }
            }}
            className="btn-outline"
          >
            Reset to defaults
          </button>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="animate-fadeIn">
      <div className="mb-3">
        <h3 className="text-base font-medium">{title}</h3>
        {desc && <p className="text-xs text-[color:var(--text-secondary)]">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({ active, onClick, icon, label, desc }: { active: boolean; onClick: () => void; icon: string; label: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "lift rounded-lg border bg-[color:var(--bg)] p-4 text-left " +
        (active
          ? "border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20"
          : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]")
      }
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-medium">{label}</div>
      <div className="text-xs text-[color:var(--text-secondary)]">{desc}</div>
    </button>
  );
}