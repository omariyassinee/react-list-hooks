import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sliders,
  XCircle,
  Zap,
} from "lucide-react";
import { usePaginateContext } from "@omariyassine/react-list-hooks";
import type { ProductItem } from "../types";

interface PaginateLabProps {
  setParentPageSizeProp: (size: number) => void;
  children: React.ReactNode;
}

export function PaginateLab({
  setParentPageSizeProp,
  children,
}: PaginateLabProps) {
  // Consume the paginate stage from context (bridged by <ListProvider>).
  const paginator = usePaginateContext<ProductItem>();
  const firstItemIndex =
    (paginator.state.currentPage - 1) * paginator.state.pageSize;
  const firstVisibleItem = paginator.paginatedItems[0];

  return (
    <div
      className="glass-panel"
      style={{
        padding: "24px",
        marginBottom: "24px",
        borderColor: "rgba(99, 102, 241, 0.35)",
        background: "rgba(15, 20, 34, 0.85)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Zap size={20} color="#818cf8" />
          <div>
            <h2
              style={{ fontSize: "1.2rem", fontWeight: 700, color: "#818cf8" }}
            >
              `usePaginate` State & Navigation Suite
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Showing items{" "}
              {paginator.state.totalItems === 0 ? 0 : firstItemIndex + 1} -{" "}
              {Math.min(
                firstItemIndex + paginator.state.pageSize,
                paginator.state.totalItems,
              )}{" "}
              of {paginator.state.totalItems}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Sliders size={15} color="var(--text-muted)" />
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page Size (`setPageSize`):
          </span>
          {[3, 6, 9, 12, 24].map((size) => (
            <button
              type="button"
              key={size}
              onClick={() => {
                setParentPageSizeProp(size);
                paginator.methods.setPageSize(size);
              }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "1px solid",
                borderColor:
                  paginator.state.pageSize === size
                    ? "var(--accent-purple)"
                    : "var(--border-color)",
                background:
                  paginator.state.pageSize === size
                    ? "rgba(99, 102, 241, 0.25)"
                    : "rgba(255, 255, 255, 0.04)",
                color:
                  paginator.state.pageSize === size
                    ? "#ffffff"
                    : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            currentPage
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#38bdf8" }}
          >
            {paginator.state.currentPage}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            totalPages
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a5b4fc" }}
          >
            {paginator.state.totalPages}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            totalItems
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c084fc" }}
          >
            {paginator.state.totalItems}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            pageSize
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399" }}
          >
            {paginator.state.pageSize}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            paginator.paginatedItems.length
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f472b6" }}
          >
            {paginator.paginatedItems.length}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <span
          className={`glass-badge ${paginator.state.isFirstPage ? "badge-true" : "badge-false"}`}
        >
          {paginator.state.isFirstPage ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}{" "}
          isFirstPage
        </span>
        <span
          className={`glass-badge ${paginator.state.isLastPage ? "badge-true" : "badge-false"}`}
        >
          {paginator.state.isLastPage ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}{" "}
          isLastPage
        </span>
        <span
          className={`glass-badge ${paginator.state.hasPrev ? "badge-true" : "badge-false"}`}
        >
          {paginator.state.hasPrev ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}{" "}
          hasPrev
        </span>
        <span
          className={`glass-badge ${paginator.state.hasNext ? "badge-true" : "badge-false"}`}
        >
          {paginator.state.hasNext ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}{" "}
          hasNext
        </span>
      </div>

      <div
        style={{
          background: "rgba(99, 102, 241, 0.08)",
          borderRadius: "8px",
          padding: "10px 14px",
          border: "1px dashed rgba(99, 102, 241, 0.3)",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          marginBottom: "20px",
        }}
      >
        💡 <strong>Position Preservation Insight:</strong> First visible item
        index is <code>#{firstItemIndex}</code>{" "}
        {firstVisibleItem ? `("${firstVisibleItem.name}")` : "(none)"}. When
        changing page size, <code>usePaginate</code> computes which page this
        item lands on under the new size!
      </div>

      {/* Rendered data items list / grid will go here */}
      {children}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          borderTop: "1px solid var(--border-color)",
          paddingTop: "20px",
          marginTop: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={paginator.methods.goToStart}
            disabled={paginator.state.isFirstPage}
            title="goToStart()"
          >
            <ChevronsLeft size={16} /> goToStart()
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={paginator.methods.prev}
            disabled={!paginator.state.hasPrev}
            title="prev()"
          >
            <ChevronLeft size={16} /> prev()
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {paginator.state.paginationRange.map((item, idx) => {
            if (item === "ellipsis") {
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis position key
                  key={`ellipsis-${idx}`}
                  style={{
                    color: "var(--text-muted)",
                    padding: "0 6px",
                    fontSize: "0.9rem",
                    userSelect: "none",
                  }}
                >
                  •••
                </span>
              );
            }
            return (
              <button
                type="button"
                key={item}
                className={`page-num-btn ${paginator.state.currentPage === item ? "active" : ""}`}
                onClick={() => paginator.methods.goToPage(item)}
                title={`goToPage(${item})`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={paginator.methods.next}
            disabled={!paginator.state.hasNext}
            title="next()"
          >
            next() <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={paginator.methods.goToEnd}
            disabled={paginator.state.isLastPage}
            title="goToEnd()"
          >
            goToEnd() <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
