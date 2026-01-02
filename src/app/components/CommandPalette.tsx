"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Command = {
  id: string;
  label: string;
  description?: string;
  section: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const commands: Command[] = [
    // Start
    { id: "new", section: "Start", label: "New meeting", icon: "▶", shortcut: "⌘N", description: "Create a new room", action: () => router.push("/meet/new") },
    { id: "instant", section: "Start", label: "Start instant meeting", icon: "⚡", description: "Create a room and join as admin", action: () => router.push("/meet/new") },
    { id: "schedule", section: "Start", label: "Schedule a meeting", icon: "📅", description: "Plan ahead", action: () => router.push("/schedule") },

    // Join
    { id: "join-personal", section: "Join", label: "Join your personal room", icon: "🏠", description: "/u/<your-name>", action: () => router.push("/u/me") },
    { id: "join-demo", section: "Join", label: "Try the demo room", icon: "🎯", action: () => router.push("/meet/demo-room") },

    // Navigate
    { id: "home", section: "Navigate", label: "Go to home", icon: "⌂", shortcut: "G H", action: () => router.push("/") },
    { id: "settings", section: "Navigate", label: "Settings", icon: "⚙", description: "Theme, accent, density", action: () => router.push("/settings") },

    // Personal rooms
    { id: "personal-me", section: "Personal room", label: "Open /u/me", icon: "👤", action: () => router.push("/u/me") },
    { id: "personal-demo", section: "Personal room", label: "Open /u/demo", icon: "🎬", action: () => router.push("/u/demo") },
    { id: "personal-team", section: "Personal room", label: "Open /u/team-standup", icon: "👥", action: () => router.push("/u/team-standup") },
    { id: "personal-q3", section: "Personal room", label: "Open /u/q3-review", icon: "📊", action: () => router.push("/u/q3-review") },

    // Recent
    { id: "r-q3", section: "Recent", label: "q3-product-review", icon: "🕘", action: () => router.push("/meet/q3-product-review") },
    { id: "r-team", section: "Recent", label: "team-standup", icon: "🕘", action: () => router.push("/meet/team-standup") },
    { id: "r-design", section: "Recent", label: "design-critique", icon: "🕘", action: () => router.push("/meet/design-critique") },

    // Embed
    { id: "embed", section: "Embed", label: "Get embed code", icon: "🔗", description: "iframe snippet for your site", action: () => {
      navigator.clipboard.writeText(
        `<iframe src="${window.location.origin}/embed/<room>" width="100%" height="600" allow="camera; microphone; display-capture" />`
      );
      alert("Embed snippet copied!");
    }},
  ];

  const filtered = query
    ? commands.filter((c) =>
        (c.label + " " + (c.description || "")).toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (!open) setQuery("");
    setSelected(0);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  // Group by section
  const sections: Record<string, Command[]> = {};
  for (const c of filtered) {
    if (!sections[c.section]) sections[c.section] = [];
    sections[c.section].push(c);
  }

  const flat = filtered;

  return (
    <div className="cmdk-overlay animate-fadeIn" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[color:var(--border)] px-4 py-3">
          <span className="text-[color:var(--text-muted)]">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                flat[selected]?.action();
                setOpen(false);
              }
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm placeholder:text-[color:var(--text-muted)] focus:outline-none"
          />
          <kbd>esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(sections).map(([sectionName, items]) => (
            <div key={sectionName} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                {sectionName}
              </div>
              {items.map((c, idx) => {
                const flatIdx = flat.indexOf(c);
                const isActive = flatIdx === selected;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setSelected(flatIdx)}
                    onClick={() => {
                      c.action();
                      setOpen(false);
                    }}
                    className={
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors " +
                      (isActive ? "bg-[color:var(--bg-sunken)]" : "hover:bg-[color:var(--bg-elevated)]")
                    }
                  >
                    <span className="w-5 text-center text-[color:var(--text-tertiary)]">
                      {c.icon || "·"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[color:var(--text-primary)]">{c.label}</div>
                      {c.description && (
                        <div className="truncate text-xs text-[color:var(--text-tertiary)]">
                          {c.description}
                        </div>
                      )}
                    </div>
                    {c.shortcut && (
                      <kbd>{c.shortcut}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[color:var(--text-tertiary)]">
              No results for "{query}"
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2 text-[11px] text-[color:var(--text-tertiary)]">
          <div className="flex items-center gap-3">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
          <span>Indux Meet</span>
        </div>
      </div>
    </div>
  );
}