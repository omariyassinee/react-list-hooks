/** biome-ignore-all lint/a11y/noLabelWithoutControl: <!--> */
import { Filter, Search, X } from "lucide-react";
import { useFilterContext } from "@omariyassine/react-list-hooks";
import type { CustomFilterKeys, ProductItem } from "../types";
import { CATEGORIES, ALL_TAGS } from "../mockData";

interface FilterLabProps {
  totalItems: number;
  useExplicitSearchFields: boolean;
  setUseExplicitSearchFields: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  debounceMs: number;
  setDebounceMs: (ms: number) => void;
}

export function FilterLab({
  totalItems,
  useExplicitSearchFields,
  setUseExplicitSearchFields,
  debounceMs,
  setDebounceMs,
}: FilterLabProps) {
  // Consume the filter stage from context (bridged by <ListProvider>).
  const { filteredItems, state, methods } = useFilterContext<
    ProductItem,
    CustomFilterKeys
  >();
  const { query: searchQuery, filters, isFiltering } = state;
  const {
    setQuery: setSearchQuery,
    setFilter,
    clearFilter,
    clearFilters,
    clearAll,
  } = methods;

  const filteredCount = filteredItems.length;
  const activeFilterCount = Object.keys(filters).length + (searchQuery ? 1 : 0);

  // Read filter states directly from context
  const maxPriceFilter =
    typeof filters.priceRange === "number" ? filters.priceRange : 500;
  const minRatingFilter =
    typeof filters.minRating === "number" ? filters.minRating : 0;
  const selectedTag =
    typeof filters.selectedTag === "string" ? filters.selectedTag : "All";
  const dateFilterDays =
    typeof filters.createdWithinDays === "number"
      ? filters.createdWithinDays
      : 0;

  const selectedCategory = (filters.category as string) ?? "All";
  const handleSelectCategory = (cat: string) => {
    setFilter("category", cat === "All" ? undefined : cat);
  };

  const selectedStatus = (filters.status as string) ?? "All";
  const handleSelectStatus = (st: string) => {
    setFilter("status", st === "All" ? undefined : st);
  };

  const handlePriceChange = (val: number) => {
    if (val >= 500) {
      clearFilter("priceRange");
    } else {
      setFilter("priceRange", val);
    }
  };

  const handleMinRatingChange = (val: number) => {
    if (val === 0) {
      clearFilter("minRating");
    } else {
      setFilter("minRating", val);
    }
  };

  const handleTagChange = (tag: string) => {
    if (tag === "All") {
      clearFilter("selectedTag");
    } else {
      setFilter("selectedTag", tag);
    }
  };

  const handleDateDaysChange = (days: number) => {
    if (days === 0) {
      clearFilter("createdWithinDays");
    } else {
      setFilter("createdWithinDays", days);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "24px",
        marginBottom: "24px",
        borderColor: "rgba(56, 189, 248, 0.3)",
        background: "rgba(12, 22, 38, 0.75)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Filter size={20} color="#38bdf8" />
          <div>
            <h2
              style={{ fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8" }}
            >
              `useFilter` Lab (Text Query + Structured + Synthetic Predicates)
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Matches: <strong>{filteredCount}</strong> / {totalItems} items
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
            title="clearFilters(): Removes structured filters while PRESERVING text query"
            style={{ fontSize: "0.8rem", padding: "6px 12px" }}
          >
            clearFilters() (Keep Query)
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => clearAll()}
            title="clearAll(): Resets search query AND all structured filters"
            style={{ fontSize: "0.8rem", padding: "6px 12px" }}
          >
            clearAll()
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "6px",
              display: "block",
            }}
          >
            Global Text Search (`query` & `setQuery`):
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
              placeholder="Search text across fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: "36px" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
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
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}
              >
                debounceMs:
              </span>
              {[0, 150, 300, 600].map((ms) => (
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
                    color: debounceMs === ms ? "#38bdf8" : "var(--text-muted)",
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

        <div>
          <label
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "6px",
              display: "block",
            }}
          >
            Search Fields Mode (`searchFields` Option):
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setUseExplicitSearchFields((prev) => !prev)}
            style={{
              width: "100%",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>
              {useExplicitSearchFields
                ? "Explicit: ['name', 'category']"
                : "Auto-Discovered: (Scans up to 20 items)"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
              Toggle
            </span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          background: "rgba(0, 0, 0, 0.25)",
          padding: "16px",
          borderRadius: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Category:
            </span>
            {filters.category !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("category")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clearFilter
              </button>
            )}
          </div>
          <select
            className="custom-input"
            value={selectedCategory}
            onChange={(e) => handleSelectCategory(e.target.value)}
            style={{ width: "100%" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Status:
            </span>
            {filters.status !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("status")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clearFilter
              </button>
            )}
          </div>
          <select
            className="custom-input"
            value={selectedStatus}
            onChange={(e) => handleSelectStatus(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Pre-order">Pre-order</option>
          </select>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Max Price (&le; ${maxPriceFilter}):
            </span>
            {filters.priceRange !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("priceRange")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clear
              </button>
            )}
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={maxPriceFilter}
            onChange={(e) => handlePriceChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Min Rating (&ge;{" "}
              {minRatingFilter === 0 ? "Any" : `${minRatingFilter} ★`}):
            </span>
            {filters.minRating !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("minRating")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clear
              </button>
            )}
          </div>
          <select
            className="custom-input"
            value={minRatingFilter}
            onChange={(e) => handleMinRatingChange(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={0}>Any Rating</option>
            <option value={4.0}>&ge; 4.0 ★</option>
            <option value={4.3}>&ge; 4.3 ★</option>
            <option value={4.6}>&ge; 4.6 ★</option>
          </select>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Tag:
            </span>
            {filters.selectedTag !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("selectedTag")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clear
              </button>
            )}
          </div>
          <select
            className="custom-input"
            value={selectedTag}
            onChange={(e) => handleTagChange(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="All">All Tags</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Date:
            </span>
            {filters.createdWithinDays !== undefined && (
              <button
                type="button"
                onClick={() => clearFilter("createdWithinDays")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fb7185",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <X size={12} /> clear
              </button>
            )}
          </div>
          <select
            className="custom-input"
            value={dateFilterDays}
            onChange={(e) => handleDateDaysChange(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={0}>All Time</option>
            <option value={7}>Last 7 Days</option>
            <option value={20}>Last 20 Days</option>
            <option value={40}>Last 40 Days</option>
          </select>
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
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          Active Filters ({activeFilterCount}):
        </span>
        {searchQuery && (
          <span
            className="glass-badge"
            style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}
          >
            query: "{searchQuery}"{" "}
            <X
              size={12}
              style={{ cursor: "pointer" }}
              onClick={() => setSearchQuery("")}
            />
          </span>
        )}
        {(Object.entries(filters) as Array<[CustomFilterKeys, unknown]>).map(
          ([key, val]) => (
            <span
              key={key}
              className="glass-badge"
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                color: "#a5b4fc",
              }}
            >
              {key}: {String(val)}{" "}
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  clearFilter(key);
                }}
              />
            </span>
          ),
        )}
        {activeFilterCount === 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            No active filters (filteredItems is the original array reference)
          </span>
        )}
      </div>
    </div>
  );
}
