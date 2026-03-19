"use client";

import { Icon } from "../../components/Icons";

export function ViewToggle({
  view, onViewChange,
}: {
  view: "tile" | "stage";
  onViewChange: (v: "tile" | "stage") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-black/50 p-0.5 backdrop-blur-sm">
      <button
        onClick={() => onViewChange("tile")}
        title="Tile view"
        className={
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 " +
          (view === "tile" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5")
        }
      >
        <Icon.Grid size={12} />
        <span>Tiles</span>
      </button>
      <button
        onClick={() => onViewChange("stage")}
        title="Stage view"
        className={
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 " +
          (view === "stage" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5")
        }
      >
        <Icon.Maximize size={12} />
        <span>Stage</span>
      </button>
    </div>
  );
}
