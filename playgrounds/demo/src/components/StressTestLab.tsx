/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
import { useState } from "react";
import {
  useFilter,
  useSort,
  usePaginate,
} from "@omariyassine/react-list-hooks";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  RefreshCw,
  Search,
  Timer,
  X,
  Zap,
} from "lucide-react";

import type { LargeDatasetItem } from "../types";
import { generateLargeDataset, DEPARTMENTS } from "../mockData";

export function StressTestLab() {
  const [itemCount, setItemCount] = useState<number>(100_000);
  const [genTimeMs, setGenTimeMs] = useState<number>(0);

  // Generate dataset on demand
  const [rawItems, setRawItems] = useState<LargeDatasetItem[]>(() => {
    const start = performance.now();
    const data = generateLargeDataset(100_000);
    setGenTimeMs(Number((performance.now() - start).toFixed(1)));
    return data;
  });

  const handleRegenerate = (count: number) => {
    setItemCount(count);
    const start = performance.now();
    const data = generateLargeDataset(count);
    const duration = Number((performance.now() - start).toFixed(1));
    setRawItems(data);
    setGenTimeMs(duration);
  };

  // ─── useFilter ────────────────────────────────────────────────────────────
  const [debounceMs, setDebounceMs] = useState<number>(200);

  const filterStartTime = performance.now();
  const filterResult = useFilter<LargeDatasetItem, "department" | "isActive">(
    rawItems,
    {
      debounceMs,
      searchFields: ["name", "department"],
      useTransition: true,
    },
  );
  const {
    query,
    setQuery,
    filters,
    setFilter,
    clearFilter,
    clearAll,
    isFiltering,
  } = {
    query: filterResult.state.query,
    setQuery: filterResult.methods.setQuery,
    filters: filterResult.state.filters,
    setFilter: filterResult.methods.setFilter,
    clearFilter: filterResult.methods.clearFilter,
    clearAll: filterResult.methods.clearAll,
    isFiltering: filterResult.state.isFiltering,
  };
  const filteredItems = filterResult.filteredItems;
  const filterDurationMs = Number(
    (performance.now() - filterStartTime).toFixed(2),
  );

  // ─── useSort ──────────────────────────────────────────────────────────────
  const sortStartTime = performance.now();
  const sortResult = useSort<LargeDatasetItem>(filteredItems, {
    initialKey: "salary",
    initialDirection: "desc",
    useTransition: true,
  });
  const {
    sortKey,
    sortDirection,
    toggleSort,
    getSortIndicator,
    clearSort,
    isSorting,
  } = {
    sortKey: sortResult.state.sortKey,
    sortDirection: sortResult.state.sortDirection,
    toggleSort: sortResult.methods.toggleSort,
    getSortIndicator: sortResult.methods.getSortIndicator,
    clearSort: sortResult.methods.clearSort,
    isSorting: sortResult.state.isSorting,
  };
  const sortedItems = sortResult.sortedItems;
  const sortDurationMs = Number((performance.now() - sortStartTime).toFixed(2));

  // ─── usePaginate ──────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState<number>(25);

  const paginateStartTime = performance.now();
  const paginator = usePaginate(sortedItems, {
    pageSize,
    siblingCount: 1,
    boundaryCount: 1,
  });
  const paginateDurationMs = Number(
    (performance.now() - paginateStartTime).toFixed(2),
  );

  const selectedDepartment = (filters.department as string) ?? "All";
  const selectedActiveStatus = (filters.isActive as string) ?? "All";

  const handleDepartmentChange = (dept: string) => {
    if (dept === "All") {
      clearFilter("department");
    } else {
      setFilter("department", dept);
    }
  };

  const handleActiveChange = (st: string) => {
    if (st === "All") {
      clearFilter("isActive");
    } else {
      setFilter("isActive", st === "active");
    }
  };

  return (
    <div>
      {/* Top Performance Telemetry HUD */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          marginBottom: "24px",
          borderColor: "rgba(236, 72, 153, 0.35)",
          background: "rgba(22, 12, 28, 0.8)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Gauge size={22} color="#ec4899" />
            <div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#f472b6",
                }}
              >
                100,000+ Items Live Performance Telemetry HUD
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Active in Browser RAM:{" "}
                <strong>{rawItems.length.toLocaleString()} records</strong>{" "}
                (Generated in {genTimeMs}ms)
              </span>
            </div>
          </div>

          {/* Dataset Size Switcher Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              Dataset Scale:
            </span>
            {[
              10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000,
            ].map((size) => (
              <button
                type="button"
                key={size}
                onClick={() => handleRegenerate(size)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor:
                    itemCount === size ? "#f472b6" : "var(--border-color)",
                  background:
                    itemCount === size
                      ? "rgba(236, 72, 153, 0.25)"
                      : "rgba(255, 255, 255, 0.04)",
                  color:
                    itemCount === size ? "#ffffff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {size >= 1000 ? `${size / 1000}k` : size}
              </button>
            ))}
          </div>
        </div>

        {/* High-Resolution Latency Gauges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#38bdf8",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Timer size={14} /> `useFilter` Latency
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#f3f4f6",
                marginTop: "2px",
              }}
            >
              {filterDurationMs}{" "}
              <span style={{ fontSize: "0.85rem", color: "#38bdf8" }}>ms</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Matches: {filteredItems.length.toLocaleString()} items
            </div>
          </div>

          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#fbbf24",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "6px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Timer size={14} /> `useSort` Latency
              </div>
              {isSorting && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#f59e0b",
                    fontWeight: 700,
                  }}
                >
                  ⏳ sorting...
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#f3f4f6",
                marginTop: "2px",
              }}
            >
              {sortDurationMs}{" "}
              <span style={{ fontSize: "0.85rem", color: "#fbbf24" }}>ms</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Sorted by:{" "}
              {sortKey ? `${String(sortKey)} (${sortDirection})` : "none"}
            </div>
          </div>

          <div
            style={{
              background: "rgba(165, 180, 252, 0.1)",
              border: "1px solid rgba(165, 180, 252, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#a5b4fc",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Zap size={14} /> `usePaginate` Slice
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#f3f4f6",
                marginTop: "2px",
              }}
            >
              {paginateDurationMs}{" "}
              <span style={{ fontSize: "0.85rem", color: "#a5b4fc" }}>ms</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Page {paginator.state.currentPage} of{" "}
              {paginator.state.totalPages.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              background: "rgba(52, 211, 153, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#34d399",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Activity size={14} /> Pipeline Throughput
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#34d399",
                marginTop: "2px",
              }}
            >
              {Number(
                (
                  filterDurationMs +
                  sortDurationMs +
                  paginateDurationMs
                ).toFixed(1),
              )}{" "}
              <span style={{ fontSize: "0.85rem" }}>ms</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              End-to-end hook pipeline
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Page Size Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Text Search with Debounce */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Search {rawItems.length.toLocaleString()} records (`useFilter`):
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="custom-input"
                placeholder="Search by name or department..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "36px" }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "6px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span
                  style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}
                >
                  debounce:
                </span>
                {[0, 150, 250, 500].map((ms) => (
                  <button
                    type="button"
                    key={ms}
                    onClick={() => setDebounceMs(ms)}
                    style={{
                      padding: "1px 6px",
                      fontSize: "0.7rem",
                      borderRadius: "4px",
                      border: "1px solid",
                      borderColor:
                        debounceMs === ms ? "#38bdf8" : "var(--border-color)",
                      background:
                        debounceMs === ms
                          ? "rgba(56, 189, 248, 0.2)"
                          : "transparent",
                      color:
                        debounceMs === ms ? "#38bdf8" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {ms === 0 ? "off" : `${ms}ms`}
                  </button>
                ))}
              </div>
              {isFiltering && (
                <span
                  style={{
                    fontSize: "0.725rem",
                    color: "#f59e0b",
                    fontWeight: 600,
                  }}
                >
                  ⏳ filtering...
                </span>
              )}
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Department Filter:
            </label>
            <select
              className="custom-input"
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Filter */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Active Status:
            </label>
            <select
              className="custom-input"
              value={selectedActiveStatus}
              onChange={(e) => handleActiveChange(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Page Size & Reset */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Page Size (`setPageSize`):
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {[10, 25, 50, 100].map((sz) => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => {
                    setPageSize(sz);
                    paginator.methods.setPageSize(sz);
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor:
                      paginator.state.pageSize === sz
                        ? "var(--accent-purple)"
                        : "var(--border-color)",
                    background:
                      paginator.state.pageSize === sz
                        ? "rgba(99, 102, 241, 0.25)"
                        : "rgba(255, 255, 255, 0.04)",
                    color:
                      paginator.state.pageSize === sz
                        ? "#ffffff"
                        : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {sz}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  clearAll();
                  clearSort();
                }}
                title="Reset all filters and sorting"
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 100k Data Table */}
      <div
        className="glass-panel"
        style={{
          padding: "0",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                {(
                  [
                    { key: "id", label: "ID", width: "90px" },
                    { key: "name", label: "Employee Name", width: "auto" },
                    { key: "department", label: "Department", width: "160px" },
                    { key: "salary", label: "Salary ($)", width: "140px" },
                    { key: "rating", label: "Rating", width: "110px" },
                    { key: "isActive", label: "Status", width: "110px" },
                    { key: "createdAt", label: "Joined Date", width: "140px" },
                  ] as const
                ).map((col) => {
                  const dir = getSortIndicator(col.key);
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{
                        padding: "14px 18px",
                        color: dir ? "#fcd34d" : "var(--text-secondary)",
                        fontWeight: 700,
                        cursor: "pointer",
                        userSelect: "none",
                        width: col.width,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>{col.label}</span>
                        {dir === "asc" ? (
                          <ArrowUp size={14} color="#fcd34d" />
                        ) : dir === "desc" ? (
                          <ArrowDown size={14} color="#fcd34d" />
                        ) : (
                          <ArrowUpDown size={13} style={{ opacity: 0.3 }} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginator.paginatedItems.length > 0 ? (
                paginator.paginatedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background:
                        idx % 2 === 0
                          ? "transparent"
                          : "rgba(255, 255, 255, 0.015)",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 18px",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      #{item.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 18px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.name}
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(99, 102, 241, 0.15)",
                          color: "#a5b4fc",
                          fontWeight: 600,
                        }}
                      >
                        {item.department}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 18px",
                        fontWeight: 700,
                        color: "#38bdf8",
                      }}
                    >
                      ${item.salary.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "12px 18px",
                        color: "#fbbf24",
                        fontWeight: 600,
                      }}
                    >
                      ★ {item.rating}
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: item.isActive ? "#34d399" : "#9ca3af",
                        }}
                      >
                        ● {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 18px",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {item.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "48px 20px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No matching records found across{" "}
                    {rawItems.length.toLocaleString()} items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls with paginationRange */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "16px 20px",
            background: "rgba(0, 0, 0, 0.25)",
            borderTop: "1px solid var(--border-color)",
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
              <ChevronsLeft size={16} /> First
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={paginator.methods.prev}
              disabled={!paginator.state.hasPrev}
              title="prev()"
            >
              <ChevronLeft size={16} /> Prev
            </button>
          </div>

          {/* Smart Ellipses Windowing */}
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
                    // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis key
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
                  {item.toLocaleString()}
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
              Next <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={paginator.methods.goToEnd}
              disabled={paginator.state.isLastPage}
              title="goToEnd()"
            >
              Last ({paginator.state.totalPages.toLocaleString()}){" "}
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
