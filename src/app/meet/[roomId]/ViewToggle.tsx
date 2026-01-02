"use client";

// Tile view vs stage view toggle
// Also handles "pin" (sticky speaker focus on any participant)
export function ViewToggle({
  view,
  onViewChange,
  pinned,
  onPinChange,
}: {
  view: "tile" | "stage";
  onViewChange: (v: "tile" | "stage") => void;
  pinned: string | null;
  onPinChange: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onViewChange("tile")}
        title="Tile view"
        className={
          "rounded-md px-2 py-1 text-xs " +
          (view === "tile" ? "bg-gray-700 text-white" : "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700")
        }
      >
        ▦ Tiles
      </button>
      <button
        onClick={() => onViewChange("stage")}
        title="Stage view"
        className={
          "rounded-md px-2 py-1 text-xs " +
          (view === "stage" ? "bg-gray-700 text-white" : "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700")
        }
      >
        ◧ Stage
      </button>
      {pinned && (
        <button
          onClick={() => onPinChange(null)}
          className="rounded-md border border-yellow-700 bg-yellow-900/40 px-2 py-1 text-xs text-yellow-300"
          title={`Pinned to ${pinned}`}
        >
          📌 Unpin
        </button>
      )}
    </div>
  );
}