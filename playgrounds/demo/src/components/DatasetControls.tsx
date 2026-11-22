import { Layers, Plus, RotateCcw, Trash2 } from "lucide-react";

interface DatasetControlsProps {
  totalItems: number;
  onAddItem: () => void;
  onDeleteFirstItem: () => void;
  onResetData: () => void;
  onEmptyData: () => void;
}

export function DatasetControls({
  totalItems,
  onAddItem,
  onDeleteFirstItem,
  onResetData,
  onEmptyData,
}: DatasetControlsProps) {
  return (
    <div
      className="glass-panel"
      style={{ padding: "20px 24px", marginBottom: "24px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Layers size={18} color="#818cf8" /> Raw Dataset Management
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Test reactivity when dataset shrinks, expands, or empties while on
            late pages.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={onAddItem}>
            <Plus size={15} /> Add Item
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDeleteFirstItem}
            disabled={totalItems === 0}
          >
            <Trash2 size={15} /> Delete 1st
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetData}
          >
            <RotateCcw size={15} /> Reset (45 items)
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onEmptyData}
            disabled={totalItems === 0}
          >
            Empty Array
          </button>
        </div>
      </div>
    </div>
  );
}
