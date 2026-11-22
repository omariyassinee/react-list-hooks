/**
 * Phase 1 performance benchmarks — react-list-hooks.
 *
 * Measures the hot paths Phase 1 targets, across dataset sizes:
 *   1. usePaginate: return-object construction (slice + defineProperty loop)
 *      — measured as page-change churn (the memo re-runs per page flip).
 *   2. useFilter: text-query filtering (per-item loop) with custom filters.
 *   3. useSort: sort toggle (comparator dispatch chain).
 *   4. useList: page-reset effect churn (data identity changes).
 *
 * Run: bun bench/phase1.bench.ts
 * Results print as a table; nothing is asserted (pure measurement).
 */
import "@/test-setup"; // happy-dom globals (window/document/history) — same preload bun test uses

import { act, renderHook } from "@testing-library/react";

import { usePaginate } from "@/use-paginate";
import { useFilter } from "@/use-filter";
import { useSort } from "@/use-sort";
import { useList } from "@/use-list";

// ─── Dataset generation (mirrors demo mockData shape) ───────────────────────

const FIRST = [
  "Ada",
  "Grace",
  "Alan",
  "Linus",
  "Margaret",
  "Dennis",
  "Barbara",
  "Ken",
  "Radia",
  "Vint",
  "Anita",
  "Edsger",
  "Frances",
  "John",
  "Katherine",
  "Donald",
];

const LAST = [
  "Lovelace",
  "Hopper",
  "Turing",
  "Torvalds",
  "Hamilton",
  "Ritchie",
  "Liskov",
  "Thompson",
  "Perlman",
  "Cerf",
  "Borg",
  "Dijkstra",
  "Allen",
  "Backus",
  "Johnson",
  "Knuth",
];
const DEPTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Support",
  "Legal",
  "Finance",
];

interface Row {
  id: number;
  name: string;
  department: string;
  salary: number;
  isActive: boolean;
  hiredAt: Date;
}

function makeDataset(n: number): Row[] {
  const rows: Row[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const first = FIRST[i % FIRST.length] ?? "X";
    const last = LAST[(i * 7) % LAST.length] ?? "Y";
    rows[i] = {
      id: i + 1,
      name: `${first} ${last} ${i}`,
      department: DEPTS[i % DEPTS.length] ?? "Engineering",
      salary: 30000 + ((i * 977) % 170000),
      isActive: i % 3 !== 0,
      hiredAt: new Date(2015 + (i % 10), i % 12, (i % 28) + 1),
    };
  }
  return rows;
}

// ─── Timing helpers ─────────────────────────────────────────────────────────

function now(): number {
  return performance.now();
}

interface TimingResult {
  totalMs: number;
  runs: number;
  perRunMs: number;
}

/** Time `runs` iterations of fn (each iteration wrapped in act). */
function timeIt(runs: number, fn: (i: number) => void): TimingResult {
  // warmup
  fn(0);

  const start = now();
  for (let i = 0; i < runs; i++) {
    fn(i);
  }
  const totalMs = now() - start;
  return { totalMs, runs, perRunMs: totalMs / runs };
}

// ─── Benchmarks ─────────────────────────────────────────────────────────────

const SIZES = [1_000, 10_000, 100_000];

interface BenchRow {
  size: number;
  scenario: string;
  perRunMs: number;
}

const results: BenchRow[] = [];

function record(size: number, scenario: string, t: TimingResult) {
  results.push({ size, scenario, perRunMs: t.perRunMs });
}

// 1. usePaginate — page-change churn (return construction per flip)
function benchPaginate(size: number) {
  const items = makeDataset(size);
  const { result } = renderHook(() => usePaginate(items, { pageSize: 25 }));

  const t = timeIt(50, (i) => {
    act(() => {
      result.current.methods.goToPage((i % 40) + 1);
    });
  });
  record(size, "paginate: page flip (return construction)", t);
}

// 2. useFilter — text query filtering (per-item loop)
function benchFilter(size: number) {
  const items = makeDataset(size);
  const { result } = renderHook(() =>
    useFilter<Row, "department" | "isActive">(items, {
      searchFields: ["name", "department"],
      customFilters: {
        department: (item, val) => item.department === val,
        isActive: (item, val) => item.isActive === val,
      },
    }),
  );

  // Alternate queries so each run is a fresh applied-query change
  const queries = ["ada", "grace", "alan", "linus", "margaret"];
  const t = timeIt(20, (i) => {
    act(() => {
      result.current.methods.setQuery(queries[i % queries.length] ?? "ada");
    });
  });
  record(size, "filter: text query (per-item loop)", t);
}

// 2b. useFilter — query + active custom filter (predicate resolution per item)
function benchFilterCustom(size: number) {
  const items = makeDataset(size);
  const { result } = renderHook(() =>
    useFilter<Row, "department" | "isActive">(items, {
      searchFields: ["name", "department"],
      customFilters: {
        department: (item, val) => item.department === val,
        isActive: (item, val) => item.isActive === val,
      },
    }),
  );

  const depts = ["Engineering", "Design", "Marketing", "Sales", "Support"];
  const t = timeIt(20, (i) => {
    act(() => {
      result.current.methods.setFilter(
        "department",
        depts[i % depts.length] ?? "Engineering",
      );
    });
  });
  record(size, "filter: custom predicate (per-item lookup)", t);
}

// 3. useSort — re-sort per value type (comparator dispatch)
function benchSortKey(
  size: number,
  key: "name" | "salary" | "hiredAt",
  label: string,
) {
  const items = makeDataset(size);
  const { result } = renderHook(() => useSort<Row>(items, {}));

  // Alternate asc/desc on the same key — every run is a full re-sort
  const t = timeIt(10, (i) => {
    act(() => {
      result.current.methods.setSort(key, i % 2 === 0 ? "asc" : "desc");
    });
  });
  record(size, `sort: ${label} re-sort`, t);
}

// 4. useList — page-reset effect churn (data identity changes)
function benchList(size: number) {
  const items = makeDataset(size);
  const { result } = renderHook(() =>
    useList<Row, "department" | "isActive">(items, {
      filter: {
        searchFields: ["name", "department"],
        customFilters: {
          department: (item, val) => item.department === val,
          isActive: (item, val) => item.isActive === val,
        },
      },
      sort: { initialKey: "salary", initialDirection: "desc" },
      paginate: { pageSize: 25 },
    }),
  );

  // Page flips change `data` identity — with `data` in the page-reset effect
  // deps, every flip re-runs the effect. Measure that churn.
  const t = timeIt(50, (i) => {
    act(() => {
      result.current.goToPage((i % 40) + 1);
    });
  });
  record(size, "list: page flip (reset-effect churn)", t);
}

// ─── Report ─────────────────────────────────────────────────────────────────

function report() {
  console.log("\n┌─ Phase 1 Benchmarks ─────────────────────────────────────┐");
  for (const r of results) {
    console.log(
      `│ ${String(r.size).padStart(7)} items │ ${r.scenario.padEnd(38)} │ ${r.perRunMs.toFixed(2).padStart(8)} ms │`,
    );
  }
  console.log(
    "└───────────────────────────────────────────────────────────┘\n",
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

for (const size of SIZES) {
  benchPaginate(size);
  benchFilter(size);
  benchFilterCustom(size);
  benchSortKey(size, "name", "string");
  benchSortKey(size, "salary", "number");
  benchSortKey(size, "hiredAt", "date");
  benchList(size);
}

report();
