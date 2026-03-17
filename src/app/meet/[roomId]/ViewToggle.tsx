"use client";

import { Icon } from "../../components/Icons";

// Tile view vs stage view toggle
export function ViewToggle({
  view, onViewChange,
}: {
  view: "tile" | "stage";
  onViewChange: (v: "tile" | "stage") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-0.5">
      <button
        onClick={() => onViewChange("tile")}
        title="Tile view"
        className={
          "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors " +
          (view === "tile" ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
        }
      >
        <Icon.Grid size={12} />
        <span>Tiles</span>
      </button>
      <button
        onClick={() => onViewChange("stage")}
        title="Stage view"
        className={
          "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors " +
          (view === "stage" ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
        }
      >
        <Icon.Maximize size={12} />
        <span>Stage</span>
      </button>
    </div>
  );
}
