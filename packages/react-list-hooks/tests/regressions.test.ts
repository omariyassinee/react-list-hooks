import { describe, it, expect, beforeEach } from "bun:test";

import { renderHook, act } from "@testing-library/react";

import { usePaginate } from "@/use-paginate";
import { useFilter } from "@/use-filter";
import { useSort } from "@/use-sort";
import { useList } from "@/use-list";

// ─── Shared fixtures ─────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

const products: Product[] = [
  { id: 1, name: "CyberDeck Pro", category: "Gadgets", price: 299 },
  { id: 2, name: "HoloLens Mini", category: "Gadgets", price: 150 },
  { id: 3, name: "Acoustic Pulse", category: "Audio", price: 99 },
  { id: 4, name: "NeuroPad", category: "Gadgets", price: 450 },
  { id: 5, name: "Bass Blaster", category: "Audio", price: 199 },
  { id: 6, name: "Quantum Screen", category: "Workstation", price: 899 },
  { id: 7, name: "Pulse Watch", category: "Wearables", price: 350 },
  { id: 8, name: "Echo Buds", category: "Audio", price: 79 },
  { id: 9, name: "VR Deck", category: "Gadgets", price: 599 },
  { id: 10, name: "Smart Ring", category: "Wearables", price: 249 },
  { id: 11, name: "MechBoard", category: "Workstation", price: 189 },
  { id: 12, name: "Hover Mouse", category: "Workstation", price: 129 },
];

function items(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

function currentSearch(): string {
  return window.location.search;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

// ─── Bug 1: CJS build ────────────────────────────────────────────────────────
// (Resolved: the package is ESM-only now — built with Bun.build, no CJS output.
// No runtime test here.)

// ─── Bug 2: keepOtherParams:false must not wipe other stages' params ─────────

describe("regression: keepOtherParams:false cross-stage wipe (BUGS.md #2)", () => {
  it("preserves all pipeline params from a shared link on mount", () => {
    window.history.replaceState({}, "", "/?q=Audio&sortBy=price&sortDir=desc");

    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        paginate: { pageSize: 10 },
        urlSync: { enabled: true, keepOtherParams: false },
      }),
    );

    // All three stages' params survive the mount normalization writes.
    const search = currentSearch();
    expect(search).toContain("q=Audio");
    expect(search).toContain("sortBy=price");
    expect(search).toContain("sortDir=desc");
    expect(result.current.filteredCount).toBe(3);
  });

  it("keeps q when sort changes and vice versa", () => {
    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        paginate: { pageSize: 10 },
        urlSync: { enabled: true, keepOtherParams: false },
      }),
    );

    act(() => result.current.setQuery("Audio"));
    act(() => result.current.setSort("price"));

    const search = currentSearch();
    expect(search).toContain("q=Audio");
    expect(search).toContain("sortBy=price");
  });
});

// ─── Bug 3: unstable {} default re-runs filter URL effect every render ────────

describe("regression: unstable filterParamMap default (BUGS.md #3)", () => {
  it("does not rewrite the URL on idle re-renders", () => {
    const { rerender } = renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        paginate: {},
        urlSync: true,
      }),
    );

    const searchAfterMount = currentSearch();

    // Three idle re-renders with no state changes
    for (let i = 0; i < 3; i++) {
      rerender();
    }

    // The URL is untouched (no spurious writes, no param churn)
    expect(currentSearch()).toBe(searchAfterMount);
  });
});

// ─── Bug 4: cleared filters leave stale URL params that resurrect ─────────────

describe("regression: stale filter URL params (BUGS.md #4)", () => {
  it("deletes the URL param when an unmapped filter is cleared", () => {
    const { result } = renderHook(() => useFilter(products, { urlSync: true }));

    act(() => result.current.methods.setFilter("category", "Audio"));
    expect(currentSearch()).toContain("category=Audio");

    act(() => result.current.methods.clearFilter("category"));
    expect(currentSearch()).not.toContain("category=");
  });

  it("deletes the URL param on clearAll for unmapped keys", () => {
    const { result } = renderHook(() => useFilter(products, { urlSync: true }));

    act(() => result.current.methods.setFilter("category", "Audio"));
    act(() => result.current.methods.setQuery("Audio"));
    act(() => result.current.methods.clearAll());

    expect(currentSearch()).not.toContain("category=");
    expect(currentSearch()).not.toContain("q=");
  });
});

// ─── Bug 5: filter values lose their type through the URL round-trip ─────────

describe("regression: filter type loss through URL (BUGS.md #5)", () => {
  it("matches numeric items against string filter values restored from the URL", () => {
    window.history.replaceState({}, "", "/?price=99");

    const { result } = renderHook(() =>
      useFilter(products, {
        urlSync: true,
        initialFilters: { price: 99 },
      }),
    );

    // The URL value '99' (string) must match the item's numeric price 99.
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.name).toBe("Acoustic Pulse");
  });

  it('matches boolean items against "true"/"false" filter values', () => {
    interface Flagged {
      id: number;
      name: string;
      active: boolean;
    }
    const flagged: Flagged[] = [
      { id: 1, name: "On", active: true },
      { id: 2, name: "Off", active: false },
    ];

    const { result } = renderHook(() =>
      useFilter<Flagged, string>(flagged, {}),
    );
    act(() => result.current.methods.setFilter("active", "true"));
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.name).toBe("On");
  });
});

// ─── Bug 6: "omit to disable" contract + lying sort indicator ────────────────

describe("regression: omitted stages must not read URL params (BUGS.md #6)", () => {
  it("ignores ?q= when the filter stage is omitted", () => {
    window.history.replaceState({}, "", "/?q=Audio");

    const { result } = renderHook(() =>
      useList(products, {
        sort: {},
        paginate: {},
        urlSync: true,
      }),
    );

    expect(result.current.filteredCount).toBe(products.length);
    expect(result.current.query).toBe("");
  });

  it("ignores ?sortBy= when the sort stage is omitted and reports no sort", () => {
    window.history.replaceState({}, "", "/?sortBy=price&sortDir=asc");

    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        paginate: {},
        urlSync: true,
      }),
    );

    expect(result.current.sortKey).toBe(null);
    expect(result.current.getSortIndicator("price")).toBe(null);
    // Data is unsorted (original order preserved on the first page)
    expect([...result.current.data.paginatedItems].map((p) => p.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("ignores ?page= when the paginate stage is omitted", () => {
    window.history.replaceState({}, "", "/?page=3");

    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        urlSync: true,
      }),
    );

    expect(result.current.currentPage).toBe(1);
  });
});

// ─── Bug 7: paginationRange off-by-one (MUI parity) ───────────────────────────

describe("regression: paginationRange MUI parity (BUGS.md #7)", () => {
  const cases: Array<
    [number, number, number, number, Array<number | "ellipsis">]
  > = [
    // [totalPages, currentPage, siblingCount, boundaryCount, expected]
    [10, 4, 1, 1, [1, 2, 3, 4, 5, "ellipsis", 10]],
    [10, 7, 1, 1, [1, "ellipsis", 6, 7, 8, 9, 10]],
    [6, 3, 0, 1, [1, 2, 3, "ellipsis", 6]],
    [6, 2, 0, 1, [1, 2, 3, "ellipsis", 6]],
  ];

  for (const [totalPages, page, siblings, boundaries, expected] of cases) {
    it(`renders page ${page} of ${totalPages} (s=${siblings}, b=${boundaries}) as ${expected.join(" ")}`, () => {
      const total = totalPages * 10;
      const { result } = renderHook(() =>
        usePaginate(items(total), {
          pageSize: 10,
          initialPage: page,
          siblingCount: siblings,
          boundaryCount: boundaries,
        }),
      );
      expect(result.current.state.paginationRange).toEqual(expected);
    });
  }

  it("always includes the current page in the range", () => {
    for (let page = 1; page <= 20; page++) {
      const { result } = renderHook(() =>
        usePaginate(items(200), { pageSize: 10, initialPage: page }),
      );
      expect(result.current.state.paginationRange).toContain(page);
    }
  });
});

// ─── Bug 8: syncPageSize:false honored on all paths ───────────────────────────

describe("regression: syncPageSize:false consistency (BUGS.md #8)", () => {
  it("does not read ?pageSize= on mount when syncPageSize is false", () => {
    window.history.replaceState({}, "", "/?pageSize=5");

    const { result } = renderHook(() =>
      usePaginate(items(50), {
        urlSync: { enabled: true, syncPageSize: false },
      }),
    );

    expect(result.current.state.pageSize).toBe(10);
  });

  it("does not emit pageSize in getShareableUrl when syncPageSize is false", () => {
    window.history.replaceState({}, "", "/");

    const { result } = renderHook(() =>
      usePaginate(items(50), {
        urlSync: { enabled: true, syncPageSize: false },
      }),
    );

    expect(result.current.methods.getShareableUrl(2)).toBe("/?page=2");
  });
});

// ─── Bug 9: sort URL sync must use applied (debounced) state ──────────────────

describe("regression: sort URL uses applied state (BUGS.md #9)", () => {
  it("does not write sortBy to the URL before the debounce elapses", () => {
    const { result } = renderHook(() =>
      useSort(products, { urlSync: true, debounceMs: 500 }),
    );

    act(() => result.current.methods.setSort("price"));

    // Live state has flipped, but the URL must not claim it yet.
    expect(result.current.state.sortKey).toBe("price");
    expect(currentSearch()).not.toContain("sortBy=");
    expect(result.current.state.isSorting).toBe(true);
  });

  it("writes sortBy to the URL after the debounce elapses", async () => {
    const { result } = renderHook(() =>
      useSort(products, { urlSync: true, debounceMs: 100 }),
    );

    act(() => result.current.methods.setSort("price"));
    expect(currentSearch()).not.toContain("sortBy=");

    // Flush the timer
    await new Promise((r) => setTimeout(r, 150));
    expect(currentSearch()).toContain("sortBy=price");
  });
});

// ─── Bug 10: mount URL pollution + spurious history entry ────────────────────

describe("regression: mount history pollution (BUGS.md #10)", () => {
  it("does not push a history entry on mount with historyMode push", () => {
    const historyLengthBefore = window.history.length;

    renderHook(() =>
      usePaginate(items(50), {
        urlSync: { enabled: true, historyMode: "push" },
      }),
    );

    expect(window.history.length).toBe(historyLengthBefore);
  });

  it("does not push a history entry on mount for filter/sort either", () => {
    const historyLengthBefore = window.history.length;

    renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        paginate: {},
        urlSync: { enabled: true, historyMode: "push" },
      }),
    );

    expect(window.history.length).toBe(historyLengthBefore);
  });
});

// ─── Bug 11: asymmetric filter read path ──────────────────────────────────────

describe("regression: filter read path honors restoreKeys (BUGS.md #11)", () => {
  it("restores unmapped keys listed in restoreKeys", () => {
    window.history.replaceState({}, "", "/?category=Audio");

    const { result } = renderHook(() =>
      useFilter(products, {
        urlSync: { enabled: true, restoreKeys: ["category"] },
      }),
    );

    expect(result.current.state.filters).toEqual({ category: "Audio" });
    expect(result.current.filteredItems.length).toBe(3);
  });

  it("auto-populates restoreKeys from initialFilters in useList", () => {
    window.history.replaceState({}, "", "/?category=Audio");

    const { result } = renderHook(() =>
      useList(products, {
        filter: { initialFilters: { category: undefined } },
        paginate: {},
        urlSync: true,
      }),
    );

    expect(result.current.filters).toEqual({ category: "Audio" });
    expect(result.current.filteredCount).toBe(3);
  });
});

// ─── Bug 12: dynamic searchFields never re-filter ─────────────────────────────

describe("regression: dynamic searchFields (BUGS.md #12)", () => {
  it("re-filters when searchFields broadens", () => {
    const { result, rerender } = renderHook(
      ({ fields }: { fields?: Array<keyof Product> }) =>
        useFilter(products, { searchFields: fields }),
      {
        initialProps: { fields: ["name"] as Array<keyof Product> | undefined },
      },
    );

    act(() => result.current.methods.setQuery("audio"));
    expect(result.current.filteredItems.length).toBe(0);

    rerender({ fields: ["name", "category"] as Array<keyof Product> });
    expect(result.current.filteredItems.length).toBe(3);

    // Removing the prop reverts to auto-detection (name+category+price are strings)
    rerender({ fields: undefined });
    expect(result.current.filteredItems.length).toBe(3);
  });
});

// ─── Bug 13: clearFilters no-op reset ─────────────────────────────────────────

describe("regression: clearFilters no-op (BUGS.md #13)", () => {
  it("does not reset the page when nothing was active", () => {
    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        paginate: { pageSize: 5 },
      }),
    );

    act(() => result.current.goToPage(2));
    expect(result.current.currentPage).toBe(2);

    act(() => result.current.clearFilters());
    expect(result.current.currentPage).toBe(2);
  });
});

// ─── Bug 14: debounced sort resets page early ────────────────────────────────

describe("regression: debounced sort resets page late (BUGS.md #14)", () => {
  it("keeps the page until the sort actually applies", async () => {
    const { result } = renderHook(() =>
      useList(products, {
        sort: { debounceMs: 300 },
        paginate: { initialPage: 3, pageSize: 2 },
      }),
    );

    expect(result.current.currentPage).toBe(3);

    act(() => result.current.setSort("price"));

    // Live sortKey flipped, but the page must not reset yet — the data
    // is still in the old order until the debounce fires.
    expect(result.current.sortKey).toBe("price");
    expect(result.current.currentPage).toBe(3);
    expect(result.current.isProcessing).toBe(true);

    await new Promise((r) => setTimeout(r, 400));

    // Debounce elapsed: the sort applied and the page reset.
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.currentPage).toBe(1);
  });
});

// ─── Bug 15: resetAll doesn't restore pageSize ────────────────────────────────

describe("regression: resetAll restores pageSize (BUGS.md #15)", () => {
  it("restores the initial pageSize after setPageSize changed it", () => {
    const { result } = renderHook(() =>
      useList(products, {
        filter: {},
        sort: {},
        paginate: { pageSize: 5 },
      }),
    );

    act(() => result.current.setPageSize(20));
    expect(result.current.pageSize).toBe(20);

    act(() => result.current.resetAll());
    expect(result.current.pageSize).toBe(5);
    expect(result.current.currentPage).toBe(1);
  });

  it("exposes resetPageSize on usePaginate directly", () => {
    const { result } = renderHook(() =>
      usePaginate(items(50), { pageSize: 5 }),
    );

    act(() => result.current.methods.setPageSize(25));
    expect(result.current.state.pageSize).toBe(25);

    act(() => result.current.methods.resetPageSize());
    expect(result.current.state.pageSize).toBe(5);
  });
});

// ─── Bug 16: docs contract ────────────────────────────────────────────────────
// (Type-level doc fix — verified by reading types/index.ts. No runtime test.)

// ─── Bug 17: parseInt trailing garbage ────────────────────────────────────────

describe("regression: strict URL number parsing (BUGS.md #17)", () => {
  it("rejects ?page=2abc instead of parsing 2", () => {
    window.history.replaceState({}, "", "/?page=2abc");

    const { result } = renderHook(() =>
      usePaginate(items(50), { urlSync: true }),
    );

    expect(result.current.state.currentPage).toBe(1);
  });

  it("rejects ?pageSize=5xyz instead of parsing 5", () => {
    window.history.replaceState({}, "", "/?pageSize=5xyz");

    const { result } = renderHook(() =>
      usePaginate(items(50), { urlSync: true }),
    );

    expect(result.current.state.pageSize).toBe(10);
  });

  it("still accepts valid integers", () => {
    window.history.replaceState({}, "", "/?page=3&pageSize=5");

    const { result } = renderHook(() =>
      usePaginate(items(50), { urlSync: true }),
    );

    expect(result.current.state.currentPage).toBe(3);
    expect(result.current.state.pageSize).toBe(5);
  });
});

// ─── Bug 18: demo stale tarball ───────────────────────────────────────────────
// (Fixed by workspace linking the demo to the root package — verified via
//  demo/package.json. No runtime test.)
