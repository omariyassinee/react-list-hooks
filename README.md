# @omariyassine/react-list-hooks

A lightweight, zero-dependency (peer React only) collection of generic React hooks for managing list state — pagination, sorting, and filtering. Each hook is composable, type-safe, and designed to handle massive datasets (100,000+ items) with high performance and optional URL state synchronization. Includes a `useList` master pipeline hook that orchestrates all three stages into a single coordinated call.

---

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [Subpath Imports](#subpath-imports)
- [`usePaginate`](#usepaginate)
  - [Basic Usage](#basic-usage)
  - [Return Value](#return-value)
  - [Options](#options)
  - [Windowed Pagination & Ellipses (`paginationRange`)](#windowed-pagination--ellipses-paginationrange)
  - [URL Synchronization](#url-synchronization)
  - [Navigation](#navigation)
  - [Page Size Management](#page-size-management)
  - [Shareable URLs](#shareable-urls)
- [`useSort`](#usesort)
  - [Basic Usage](#basic-usage-1)
  - [Return Value](#return-value-1)
  - [Options](#options-1)
  - [URL Synchronization](#url-synchronization-1)
  - [Default Comparator & Fast Collation](#default-comparator--fast-collation)
  - [Large Dataset Optimization (Schwartzian Transform)](#large-dataset-optimization-schwartzian-transform)
  - [Custom Comparators](#custom-comparators)
  - [Debounce & React 18/19 `useTransition`](#debounce--react-1819-usetransition)
  - [Toggle Sort Cycle](#toggle-sort-cycle)
- [`useFilter`](#usefilter)
  - [Basic Usage](#basic-usage-2)
  - [Return Value](#return-value-2)
  - [Options](#options-2)
  - [URL Synchronization](#url-synchronization-2)
  - [Debounce & React 18/19 `useTransition`](#debounce--react-1819-usetransition-1)
  - [Global Text Search](#global-text-search)
  - [Field-Specific Filters & Synthetic Filter Keys](#field-specific-filters--synthetic-filter-keys)
  - [Custom Filter Predicates](#custom-filter-predicates)
  - [Smart Equality & Date Matching](#smart-equality--date-matching)
- [`useList`](#uselist)
  - [Basic Usage](#basic-usage-3)
  - [Return Value](#return-value-3)
  - [Options](#options-3)
  - [Automatic Page Reset](#automatic-page-reset)
  - [Unified URL Synchronization](#unified-url-synchronization)
  - [Disabling Pipeline Stages](#disabling-pipeline-stages)
- [Context Providers & Hooks](#context-providers--hooks)
  - [`<ListProvider>` & Pipeline Bridge](#listprovider--pipeline-bridge)
  - [Individual Stage Providers](#individual-stage-providers)
  - [Granular State & Methods Hooks](#granular-state--methods-hooks)
  - [Context Factories](#context-factories)
- [Composing the Hooks (Manual)](#composing-the-hooks-manual)
- [TypeScript](#typescript)
- [License](#license)

---

## Installation

```bash
npm install @omariyassine/react-list-hooks
# or
yarn add @omariyassine/react-list-hooks
# or
bun add @omariyassine/react-list-hooks
```

Requires React >= 18 as a peer dependency.

---

## Development

This repo is a Bun workspace monorepo:

```
packages/react-list-hooks   — the publishable library (source, tests, build)
playgrounds/demo            — Vite playground, linked to the lib via workspace:*
```

```bash
bun install          # install all workspaces
bun run build        # build the library (packages/react-list-hooks/dist)
bun run test         # run the test suite
bun run typecheck    # typecheck all workspaces
bun run dev          # start the demo dev server
```

See [`playgrounds/README.md`](./playgrounds/README.md) for the playgrounds.

---

## Overview

The package exports four hooks — three independent primitives that can be used alone, plus a master pipeline hook that composes them together (**Filter → Sort → Paginate**). It also includes first-class React Context providers, consumer hooks, and context factories to eliminate prop-drilling across component trees:

| Hook / Feature        | Purpose                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `usePaginate`         | Slice an array into pages, navigate with windowed range (`paginationRange`), sync state to the URL, and generate shareable links.                                  |
| `useSort`             | Sort an array with automatic type-aware comparison, Schwartzian transform for 100k+ speed, custom comparators, `isSorting`, and URL sync.                          |
| `useFilter`           | Filter an array by a global text query and/or structured filters with debouncing, `isFiltering`, `useTransition`, and URL sync.                                    |
| **`useList`**         | **Master pipeline hook** that composes `useFilter` → `useSort` → `usePaginate` into a single call with automatic page-1 reset, unified URL sync, and `resetAll()`. |
| **Context Providers** | `ListProvider`, `PaginateProvider`, `SortProvider`, and `FilterProvider` with pipeline bridges and fine-grained state/methods hooks to avoid prop-drilling.        |

All hooks are fully typed with generics and work with any object shape.

---

## Subpath Imports

In addition to importing from the package root, direct subpath imports are available:

```tsx
// Root import (all hooks, providers, & types)
import {
  usePaginate,
  useSort,
  useFilter,
  useList,
  ListProvider,
  useListContext,
  PaginateProvider,
  usePaginateContext,
  SortProvider,
  useSortContext,
  FilterProvider,
  useFilterContext,
  createListContext,
} from "@omariyassine/react-list-hooks";

// Individual subpath imports
import { usePaginate } from "@omariyassine/react-list-hooks/use-paginate";
import { useSort } from "@omariyassine/react-list-hooks/use-sort";
import { useFilter } from "@omariyassine/react-list-hooks/use-filter";
import { useList } from "@omariyassine/react-list-hooks/use-list";
import {
  ListProvider,
  useListContext,
  PaginateProvider,
  usePaginateContext,
  SortProvider,
  useSortContext,
  FilterProvider,
  useFilterContext,
  createListContext,
} from "@omariyassine/react-list-hooks/context";
```

---

## `usePaginate`

`usePaginate` takes an array and options, and returns a paginated slice along with navigation controls, status flags, windowed pagination ranges with ellipses, and optional URL synchronization.

### Basic Usage

```tsx
import { usePaginate } from "@omariyassine/react-list-hooks";

function ProductList({ products }) {
  const page = usePaginate(products, {
    pageSize: 20,
    siblingCount: 1,
    boundaryCount: 1,
  });
  const { paginatedItems, state, methods } = page;

  return (
    <div>
      {paginatedItems.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      <div className="controls">
        <button onClick={methods.prev} disabled={!state.hasPrev}>
          Previous
        </button>

        {state.paginationRange.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              key={item}
              className={state.currentPage === item ? "active" : ""}
              onClick={() => methods.goToPage(item)}
            >
              {item}
            </button>
          ),
        )}

        <button onClick={methods.next} disabled={!state.hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

The returned value is a **plain object** with exactly three keys: `paginatedItems` (the current page's items), `state` (pagination metadata), and `methods` (navigation controls).

### Return Value

The return type `UsePaginateReturn<T>` is a plain object:

```ts
interface UsePaginateReturn<T> {
  paginatedItems: T[];
  state: UsePaginateState;
  methods: UsePaginateMethods;
}
```

#### `paginatedItems`

| Property         | Type  | Description                                                         |
| ---------------- | ----- | ------------------------------------------------------------------- |
| `paginatedItems` | `T[]` | The items of the current page. Iterate, spread, or map it directly. |

#### `state`

| Property           | Type                          | Description                                                                                           |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `currentPage`      | `number`                      | The current page number (1-indexed).                                                                  |
| `totalPages`       | `number`                      | Total number of pages. Always at least 1.                                                             |
| `totalItems`       | `number`                      | Total number of items in the source array.                                                            |
| `pageSize`         | `number`                      | Current page size.                                                                                    |
| `hasNext`          | `boolean`                     | Whether a next page exists.                                                                           |
| `hasPrev`          | `boolean`                     | Whether a previous page exists.                                                                       |
| `isFirstPage`      | `boolean`                     | Whether the current page is the first.                                                                |
| `isLastPage`       | `boolean`                     | Whether the current page is the last.                                                                 |
| `pageNumbers`      | `number[]`                    | An array of all page numbers, e.g. `[1, 2, 3, 4, 5]`.                                                 |
| `paginationRange`  | `Array<number \| 'ellipsis'>` | Smart windowed page numbers with ellipsis markers (e.g. `[1, 'ellipsis', 4, 5, 6, 'ellipsis', 100]`). |
| `isUrlSyncEnabled` | `boolean`                     | Whether URL synchronization is active.                                                                |

#### `methods`

| Property          | Type                                                 | Description                                                                                               |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `next`            | `() => void`                                         | Go to the next page (no-op if on last).                                                                   |
| `prev`            | `() => void`                                         | Go to the previous page (no-op if on first).                                                              |
| `goToPage`        | `(page: number) => void`                             | Jump to a specific page. Clamped to `[1, totalPages]`.                                                    |
| `goToStart`       | `() => void`                                         | Jump to page 1.                                                                                           |
| `goToEnd`         | `() => void`                                         | Jump to the last page.                                                                                    |
| `setPageSize`     | `(size: number) => void`                             | Change the page size. Preserves the user's approximate scroll position by recalculating the current page. |
| `resetPageSize`   | `() => void`                                         | Reset the page size to the initial value, keeping the first visible item on screen.                       |
| `getShareableUrl` | `(targetPage?, targetPageSize?, baseUrl?) => string` | Generate a URL string with the pagination params applied.                                                 |

### Options

```ts
interface UsePaginateOptions {
  /** Number of items per page. Defaults to 10. */
  pageSize?: number;
  /** Initial page number (1-indexed). Defaults to 1. Clamped to valid range. */
  initialPage?: number;
  /** Number of always visible pages before and after the current page. Defaults to 1. */
  siblingCount?: number;
  /** Number of always visible pages at the beginning and end. Defaults to 1. */
  boundaryCount?: number;
  /** URL Search Params sync configuration. Can be a boolean flag or PaginateUrlSyncOptions object. */
  urlSync?: boolean | PaginateUrlSyncOptions;
}
```

### Windowed Pagination & Ellipses (`paginationRange`)

When rendering pagination controls for large datasets (e.g. 500 pages), rendering hundreds of buttons degrades performance. `paginationRange` calculates a sliding window with ellipsis tokens:

```tsx
const page = usePaginate(items, {
  pageSize: 25,
  siblingCount: 1, // Number of pages adjacent to current page
  boundaryCount: 1, // Number of pages at start and end
});

// If currentPage is 5 on 100 total pages:
// page.state.paginationRange -> [1, 'ellipsis', 4, 5, 6, 'ellipsis', 100]
```

### URL Synchronization

When `urlSync` is enabled, the current page and page size are read from and written to the browser's URL search parameters. This makes pagination state bookmarkable, shareable, and respects browser back/forward buttons.

```tsx
const page = usePaginate(products, {
  pageSize: 20,
  urlSync: {
    enabled: true,
    pageParam: "p", // default: 'page'
    pageSizeParam: "limit", // default: 'pageSize'
    syncPageSize: true, // default: true
    historyMode: "push", // default: 'replace'
    keepOtherParams: true, // default: true (preserves filter/sort params)
  },
});
```

---

## `useSort`

`useSort` sorts an array by a given key with automatic type-aware comparison, Schwartzian Transform optimization for massive datasets, URL synchronization, custom comparators, and React 18/19 `useTransition` support.

### Basic Usage

```tsx
import { useSort } from "@omariyassine/react-list-hooks";

function UserTable({ users }) {
  const sorted = useSort(users, {
    initialKey: "name",
    initialDirection: "asc",
    useTransition: true, // Non-blocking concurrent rendering
  });
  const { sortedItems, state, methods } = sorted;
  const { toggleSort, getSortIndicator } = methods;

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => toggleSort("name")}>
            Name{" "}
            {getSortIndicator("name") === "asc"
              ? "▲"
              : getSortIndicator("name") === "desc"
                ? "▼"
                : ""}
          </th>
          <th onClick={() => toggleSort("age")}>
            Age{" "}
            {getSortIndicator("age") === "asc"
              ? "▲"
              : getSortIndicator("age") === "desc"
                ? "▼"
                : ""}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedItems.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

The returned value is a **plain object** with exactly three keys: `sortedItems` (the sorted array), `state` (sort metadata), and `methods` (sort controls).

### Return Value

The return type `UseSortReturn<T>` is a plain object:

```ts
interface UseSortReturn<T> {
  sortedItems: T[];
  state: UseSortState<T>;
  methods: UseSortMethods<T>;
}
```

#### `sortedItems`

| Property      | Type  | Description                                                                             |
| ------------- | ----- | --------------------------------------------------------------------------------------- |
| `sortedItems` | `T[]` | The array sorted by the current key and direction. Iterate, spread, or map it directly. |

#### `state`

| Property              | Type                      | Description                                                                                                                                                    |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sortKey`             | `keyof T \| null`         | The key currently being sorted by. `null` if inactive.                                                                                                         |
| `sortDirection`       | `'asc' \| 'desc' \| null` | The current sort direction.                                                                                                                                    |
| `activeSortKey`       | `keyof T \| null`         | The key whose sort has actually **applied** to the data. Matches `sortKey` except during a debounce window, where it still reflects the previous applied sort. |
| `activeSortDirection` | `'asc' \| 'desc' \| null` | The direction actually applied to the data (lags behind `sortDirection` during debounce).                                                                      |
| `isSorting`           | `boolean`                 | `true` while a debounce timer or React 18/19 concurrent transition is in progress.                                                                             |

#### `methods`

| Property           | Type                             | Description                                                           |
| ------------------ | -------------------------------- | --------------------------------------------------------------------- |
| `setSort`          | `(key, direction?) => void`      | Explicitly sort by a key. Direction defaults to `'asc'`.              |
| `toggleSort`       | `(key) => void`                  | Cycle through sort states for a key: **asc → desc → clear → asc**.    |
| `clearSort`        | `() => void`                     | Remove sorting and return to the original order.                      |
| `getSortIndicator` | `(key) => SortDirection \| null` | Returns the current direction for a given key, or `null` if inactive. |

> **Note**: When sorting is inactive, `sortedItems` is the original `items` array reference — your data is never copied or modified.

### Options

```ts
interface UseSortOptions<T> {
  /** The initial field/key of T to sort by. */
  initialKey?: keyof T | null;
  /** The initial sort direction. Defaults to 'asc'. */
  initialDirection?: SortDirection | null;
  /** Custom comparator functions for specific keys. */
  comparators?: Partial<Record<keyof T, (a: T, b: T) => number>>;
  /** Debounce delay in milliseconds before applying sort changes on large lists. Defaults to 0. */
  debounceMs?: number;
  /** Whether to use React 18/19 startTransition to keep UI non-blocking during heavy sorts. Defaults to false. */
  useTransition?: boolean;
  /** URL Search Params sync configuration. Can be a boolean flag or SortUrlSyncOptions object. */
  urlSync?: boolean | SortUrlSyncOptions;
}
```

### URL Synchronization

`useSort` supports syncing active sort keys and directions to URL search parameters:

```tsx
const sorted = useSort(users, {
  urlSync: {
    enabled: true,
    sortKeyParam: "sortBy", // default: 'sortBy'
    directionParam: "sortDir", // default: 'sortDir'
    historyMode: "replace", // default: 'replace'
    keepOtherParams: true, // default: true
  },
});
```

### Default Comparator & Fast Collation

`useSort` uses a cached, module-level singleton `Intl.Collator` instance with `{ numeric: true, sensitivity: 'base' }` for natural string comparisons (e.g. `"item2"` sorts before `"item10"`), avoiding repeated instantiation penalties on large lists.

| Type                 | Comparison Strategy                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `string`             | Natural sort using cached `Intl.Collator` singleton.                                          |
| `Date`               | Compares timestamps via `.getTime()`.                                                         |
| `boolean`            | `true` (1) comes after `false` (0).                                                           |
| `number`             | Numeric comparison. `NaN` values are stably pushed to the bottom.                             |
| `bigint` / mixed     | Safely compares `bigint` with `bigint` and mixed `bigint` / `number` without throwing errors. |
| `function`           | Deterministically compared by function `.name`.                                               |
| `symbol`             | Deterministically compared by symbol `.description`.                                          |
| `object`             | Stringified representation comparison.                                                        |
| `null` / `undefined` | **NULLS LAST**: Always placed at the bottom in both `asc` and `desc` directions.              |

### Large Dataset Optimization (Schwartzian Transform)

`useSort` automatically uses the **Schwartzian Transform** (Decorate-Sort-Undecorate) during sorting:

1. Pre-extracts sort keys into pre-allocated memory structures in a single contiguous $O(N)$ pass.
2. Sorts pre-extracted primitives with guaranteed index stability fallback (`a.index - b.index`).
3. Direct un-decorates into the final output array.

This avoids repeated $N \log N$ object property lookups, making sorting over **100,000+ items** blazing fast.

### Custom Comparators

```tsx
const sorted = useSort(employees, {
  comparators: {
    fullName: (a, b) => {
      const aLast = a.name.split(" ").pop()!;
      const bLast = b.name.split(" ").pop()!;
      return aLast.localeCompare(bLast) || a.name.localeCompare(b.name);
    },
    priority: (a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    },
  },
});
```

---

## `useFilter`

`useFilter` filters an array by a global text query (searched across multiple fields) and/or structured field-specific filters, with built-in search debouncing, URL synchronization, and React 18/19 `useTransition` support.

### Basic Usage

```tsx
import { useFilter } from "@omariyassine/react-list-hooks";

function ProductList({ products }) {
  const filtered = useFilter(products, {
    searchFields: ["name", "category"],
    debounceMs: 200, // Debounce heavy text search
    useTransition: true, // Non-blocking concurrent rendering
    urlSync: true, // Sync query & filters with URL
  });
  const { filteredItems, state, methods } = filtered;
  const { query, filters, isFiltering } = state;
  const { setQuery, setFilter, clearAll } = methods;

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isFiltering && <span>Filtering...</span>}

      <select
        value={filters.category ?? ""}
        onChange={(e) => setFilter("category", e.target.value || undefined)}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <button onClick={clearAll}>Clear All</button>

      {filteredItems.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

The returned value is a **plain object** with exactly three keys: `filteredItems` (the filtered array), `state` (filter metadata), and `methods` (filter controls).

### Return Value

The return type `UseFilterReturn<T, K>` is a plain object:

```ts
interface UseFilterReturn<T, K extends string = string> {
  filteredItems: T[];
  state: UseFilterState<T, K>;
  methods: UseFilterMethods<T, K>;
}
```

#### `filteredItems`

| Property        | Type  | Description                                                                                                       |
| --------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| `filteredItems` | `T[]` | The array containing only items that match the query and all active filters. Iterate, spread, or map it directly. |

#### `state`

| Property       | Type                          | Description                                                                                                                                      |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `query`        | `string`                      | The current global text search query.                                                                                                            |
| `appliedQuery` | `string`                      | The query actually **applied** to the data. Matches `query` except during a debounce window, where it still reflects the previous applied query. |
| `filters`      | `Partial<Record<K, unknown>>` | The currently active structured filter values.                                                                                                   |
| `isFiltering`  | `boolean`                     | `true` while a debounce timer or React 18/19 transition is pending.                                                                              |

#### `methods`

| Property       | Type                               | Description                                                                                  |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `setQuery`     | `(query: string) => void`          | Update the global search query.                                                              |
| `setFilter`    | `(key: K, value: unknown) => void` | Set a filter value for a field or custom filter key. Passing `undefined` clears that filter. |
| `clearFilter`  | `(key: K) => void`                 | Remove the filter for a specific key.                                                        |
| `clearFilters` | `() => void`                       | Remove all field/structured filters (keeps the global text query).                           |
| `clearAll`     | `() => void`                       | Reset both the global query and all filters immediately.                                     |

> **Note**: When no query or filters are active, `filteredItems` is the original `items` array reference — your data is never copied or modified.

### Options

```ts
interface UseFilterOptions<T, K extends string = FilterKey<T>> {
  /** Default search query. */
  initialQuery?: string;
  /** Default structured filter field values (used on initial mount). */
  initialFilters?: Partial<Record<K | FilterKey<T>, unknown>>;
  /** Custom filter/matching predicate functions for specific keys of T or custom filter keys. */
  customFilters?: Partial<
    Record<K | FilterKey<T>, (item: T, filterValue: any) => boolean>
  >;
  /** Optional custom text search fields. Defaults to all string/number properties discovered across items. */
  searchFields?: Array<keyof T>;
  /** Debounce delay in milliseconds for global text search. Defaults to 0 (synchronous filtering). */
  debounceMs?: number;
  /** Whether to use React 18/19 startTransition to keep UI non-blocking during heavy filtering. Defaults to false. */
  useTransition?: boolean;
  /** URL Search Params sync configuration. Can be a boolean flag or FilterUrlSyncOptions object. */
  urlSync?: boolean | FilterUrlSyncOptions<K | FilterKey<T>>;
}
```

### URL Synchronization

`useFilter` bi-directionally synchronizes search queries and structured filters to the URL:

```tsx
const filtered = useFilter(products, {
  urlSync: {
    enabled: true,
    queryParam: "q", // default: 'q'
    paramMap: { category: "cat" }, // Map internal filter key to custom URL query name
    restoreKeys: ["category"], // Unmapped keys to restore from URL (auto-set by useList)
    historyMode: "replace", // default: 'replace'
    keepOtherParams: true, // default: true
  },
});
```

> **Note on `restoreKeys`:** filter keys that are _not_ in `paramMap` are only restored from the URL if they are listed in `restoreKeys` (or declared in `initialFilters`). When using `useFilter` standalone with custom filter keys, add them to `restoreKeys` so a shared link round-trips. `useList` populates this automatically from its `initialFilters`.

### Debounce & React 18/19 `useTransition`

When filtering large datasets (100k+ records):

- **`debounceMs`**: Delays filter execution until the user stops typing, ensuring input fields never lag.
- **`useTransition: true`**: Marks filter calculations as non-blocking React transitions, ensuring the UI stays at 60 FPS.
- **`isFiltering`**: Provides an immediate loading state for spinners and status badges while computing.

### Custom Filter Predicates & Synthetic Keys

```tsx
const filtered = useFilter(products, {
  customFilters: {
    // Synthetic key for numeric range
    priceRange: (item, range) => {
      const [min, max] = range as [number, number];
      return item.price >= min && item.price <= max;
    },
    // Array tag inclusion
    tags: (item, tag) => item.tags.includes(tag as string),
    // Date range predicate
    createdAt: (item, range) => {
      const [start, end] = range as [Date, Date];
      return item.createdAt >= start && item.createdAt <= end;
    },
  },
});

filtered.methods.setFilter("priceRange", [10, 100]);
filtered.methods.setFilter("tags", "react");
```

---

## `useList`

`useList` is the **master pipeline hook** that composes `useFilter` → `useSort` → `usePaginate` into a single coordinated call. It solves three problems that arise when chaining the hooks manually:

1. **Automatic page-1 reset** — When the user changes a search query, filter, or sort, pagination automatically resets to page 1.
2. **Unified URL sync** — A single `urlSync` config distributes params across all three stages.
3. **Unified reset** — `resetAll()` clears all filters, sorting, and pagination in one call.

### Basic Usage

```tsx
import { useList } from "@omariyassine/react-list-hooks";

function DataTable({ data }) {
  const {
    data: page,
    query,
    setQuery,
    filters,
    setFilter,
    toggleSort,
    getSortIndicator,
    isProcessing,
    resetAll,
  } = useList(data, {
    filter: {
      searchFields: ["name", "email"],
      debounceMs: 150,
    },
    sort: {
      initialKey: "name",
      initialDirection: "asc",
    },
    paginate: {
      pageSize: 10,
      siblingCount: 1,
    },
    urlSync: true,
  });
  const { paginatedItems } = page;
  const { currentPage, hasPrev, hasNext, paginationRange } = page.state;
  const { prev, next, goToPage } = page.methods;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {isProcessing && <span>Updating...</span>}
      <button onClick={resetAll}>Reset All</button>

      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>
              Name{" "}
              {getSortIndicator("name") === "asc"
                ? "▲"
                : getSortIndicator("name") === "desc"
                  ? "▼"
                  : ""}
            </th>
            <th onClick={() => toggleSort("email")}>
              Email{" "}
              {getSortIndicator("email") === "asc"
                ? "▲"
                : getSortIndicator("email") === "desc"
                  ? "▼"
                  : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={prev} disabled={!hasPrev}>
          Previous
        </button>
        {paginationRange.map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${idx}`}>...</span>
          ) : (
            <button
              key={item}
              className={currentPage === item ? "active" : ""}
              onClick={() => goToPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button onClick={next} disabled={!hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Return Value

`UseListReturn<T, K>` returns a plain object with the following properties:

| Property                | Type                             | Description                                                                     |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| **Pipeline output**     |                                  |                                                                                 |
| `data`                  | `UsePaginateReturn<T>`           | The paginate stage result: `{ paginatedItems, state, methods }`.                |
| `filter`                | `UseFilterReturn<T, K>`          | The filter stage result: `{ filteredItems, state, methods }`.                   |
| `sort`                  | `UseSortReturn<T>`               | The sort stage result: `{ sortedItems, state, methods }`.                       |
| **Filter access**       |                                  |                                                                                 |
| `query`                 | `string`                         | Current global text search query.                                               |
| `setQuery`              | `(query: string) => void`        | Update the search query. Resets to page 1.                                      |
| `filters`               | `Partial<Record<K, unknown>>`    | Active structured filter values.                                                |
| `setFilter`             | `(key, value) => void`           | Set a filter value. Resets to page 1.                                           |
| `clearFilter`           | `(key) => void`                  | Remove a specific filter. Resets to page 1.                                     |
| `clearFilters`          | `() => void`                     | Remove all filters (keeps query). Resets to page 1.                             |
| **Sort access**         |                                  |                                                                                 |
| `sortKey`               | `keyof T \| null`                | Current sort key.                                                               |
| `sortDirection`         | `'asc' \| 'desc' \| null`        | Current sort direction.                                                         |
| `setSort`               | `(key, direction?) => void`      | Sort by a key. Resets to page 1.                                                |
| `toggleSort`            | `(key) => void`                  | Cycle sort state (asc → desc → clear). Resets to page 1.                        |
| `clearSort`             | `() => void`                     | Clear sorting. Resets to page 1.                                                |
| `getSortIndicator`      | `(key) => SortDirection \| null` | Get sort direction for a key.                                                   |
| **Paginate access**     |                                  |                                                                                 |
| `currentPage`           | `number`                         | Current page (1-indexed).                                                       |
| `totalPages`            | `number`                         | Total pages.                                                                    |
| `totalItems`            | `number`                         | Total items after filter+sort.                                                  |
| `pageSize`              | `number`                         | Current page size.                                                              |
| `hasNext` / `hasPrev`   | `boolean`                        | Navigation availability.                                                        |
| `next` / `prev`         | `() => void`                     | Page navigation.                                                                |
| `goToPage`              | `(page) => void`                 | Jump to a page.                                                                 |
| `goToStart` / `goToEnd` | `() => void`                     | Jump to first/last page.                                                        |
| `setPageSize`           | `(size) => void`                 | Change page size.                                                               |
| `resetPageSize`         | `() => void`                     | Reset page size to the initial value, keeping the first visible item on screen. |
| `pageNumbers`           | `number[]`                       | All page numbers.                                                               |
| `paginationRange`       | `Array<number \| 'ellipsis'>`    | Windowed pagination range.                                                      |
| **Pipeline metadata**   |                                  |                                                                                 |
| `filteredCount`         | `number`                         | Number of items after filtering.                                                |
| `isProcessing`          | `boolean`                        | `true` while filter or sort debounce/transition is pending.                     |
| **Unified actions**     |                                  |                                                                                 |
| `resetAll`              | `() => void`                     | Clear all filters, sorting, and reset to page 1 **and** the initial page size.  |

### Options

```ts
interface UseListOptions<T, K extends string = string> {
  /** Configuration for the filter stage. Omit to disable filtering. */
  filter?: Omit<UseFilterOptions<T, K>, "urlSync">;
  /** Configuration for the sort stage. Omit to disable sorting. */
  sort?: Omit<UseSortOptions<T>, "urlSync">;
  /** Configuration for the paginate stage. Omit to use default pagination (pageSize: 10). */
  paginate?: Omit<UsePaginateOptions, "urlSync">;
  /** Unified URL sync configuration across all pipeline stages. */
  urlSync?: boolean | ListUrlSyncOptions<K>;
}

interface ListUrlSyncOptions<K extends string = string> {
  enabled?: boolean;
  historyMode?: "replace" | "push"; // default: 'replace'
  keepOtherParams?: boolean; // default: true

  // Filter params
  queryParam?: string; // default: 'q'
  filterParamMap?: Partial<Record<K, string>>;

  // Sort params
  sortKeyParam?: string; // default: 'sortBy'
  directionParam?: string; // default: 'sortDir'

  // Paginate params
  pageParam?: string; // default: 'page'
  pageSizeParam?: string; // default: 'pageSize'
  syncPageSize?: boolean; // default: true
}
```

### Automatic Page Reset

When using the individual hooks manually, changing a filter or sort while on page 7 leaves you on page 7 of the new results (which may only have 2 pages). `useList` fixes this automatically:

```tsx
const list = useList(data, {
  filter: {},
  sort: {},
  paginate: { pageSize: 10 },
});

// Navigate to page 5
list.goToPage(5); // currentPage = 5

// Change a filter → automatically resets to page 1
list.setQuery("react"); // currentPage = 1 ✓

// Pagination actions do NOT trigger reset
list.next(); // currentPage = 2 (normal navigation)
```

### Unified URL Synchronization

Instead of configuring `urlSync` on each hook separately, `useList` accepts a single config that distributes params:

```tsx
const list = useList(data, {
  filter: { searchFields: ["name"] },
  sort: { initialKey: "name" },
  paginate: { pageSize: 10 },
  urlSync: {
    enabled: true,
    queryParam: "search", // filter query → ?search=...
    sortKeyParam: "sort", // sort key → ?sort=...
    directionParam: "order", // sort direction → ?order=...
    pageParam: "p", // page → ?p=...
    pageSizeParam: "limit", // page size → ?limit=...
  },
});
// URL: ?search=react&sort=name&order=asc&p=1&limit=10
```

### Disabling Pipeline Stages

Omitting `filter`, `sort`, or `paginate` from the options object skips that stage:

```tsx
// Sort + Paginate only (no filtering)
const list = useList(data, {
  sort: { initialKey: "price", initialDirection: "desc" },
  paginate: { pageSize: 25 },
});

// Filter + Paginate only (no sorting)
const list = useList(data, {
  filter: { searchFields: ["name"] },
  paginate: { pageSize: 20 },
});
```

---

## Context Providers & Hooks

Version `0.4.0+` provides first-class React Context support. This allows you to avoid prop-drilling state and methods across deeply nested components (such as separate search bars, data tables, and pagination toolbars).

```tsx
import {
  ListProvider,
  useListContext,
  usePaginateContext,
  useSortContext,
  useFilterContext,
} from "@omariyassine/react-list-hooks";
```

### `<ListProvider>` & Pipeline Bridge

`<ListProvider>` is the master provider that wraps `useList`. It features a **Pipeline Bridge**: inside `<ListProvider>`, children can consume not only `useListContext()`, but also `usePaginateContext()`, `useSortContext()`, and `useFilterContext()` directly without extra providers!

You can use `<ListProvider>` in two ways:

#### 1. Managed Mode (recommended)

Pass your items and options directly as props to `<ListProvider>`. It manages the list pipeline internally:

```tsx
import {
  ListProvider,
  useListContext,
  usePaginateContext,
  useSortContext,
} from "@omariyassine/react-list-hooks";

function UserManagement({ users }) {
  return (
    <ListProvider
      items={users}
      filter={{ searchFields: ["name", "email"], debounceMs: 150 }}
      sort={{ initialKey: "name", initialDirection: "asc" }}
      paginate={{ pageSize: 10, siblingCount: 1 }}
      urlSync={true}
    >
      <SearchBar />
      <UserTable />
      <PaginationToolbar />
    </ListProvider>
  );
}

function SearchBar() {
  const { query, setQuery, isProcessing } = useListContext();
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {isProcessing && <span>Searching...</span>}
    </div>
  );
}

function UserTable() {
  // Consumers can use usePaginateContext or useListContext to read paginated items
  const { paginatedItems } = usePaginateContext();
  const { toggleSort, getSortIndicator } = useSortContext();

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => toggleSort("name")}>
            Name{" "}
            {getSortIndicator("name") === "asc"
              ? "▲"
              : getSortIndicator("name") === "desc"
                ? "▼"
                : ""}
          </th>
        </tr>
      </thead>
      <tbody>
        {paginatedItems.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaginationToolbar() {
  const { state, methods } = usePaginateContext();
  return (
    <div>
      <button onClick={methods.prev} disabled={!state.hasPrev}>
        Prev
      </button>
      <span>
        Page {state.currentPage} of {state.totalPages}
      </span>
      <button onClick={methods.next} disabled={!state.hasNext}>
        Next
      </button>
    </div>
  );
}
```

#### 2. Value Mode

If you already call `useList()` in a parent component, pass the returned value via the `value` prop:

```tsx
function ParentComponent({ users }) {
  const list = useList(users, { paginate: { pageSize: 10 } });

  return (
    <ListProvider value={list}>
      <UserTable />
    </ListProvider>
  );
}
```

#### 3. Render-Prop Children

Providers also accept a render function as `children`:

```tsx
<ListProvider items={users} paginate={{ pageSize: 10 }}>
  {({ data, query, setQuery }) => (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {data.paginatedItems.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  )}
</ListProvider>
```

---

### Individual Stage Providers

When you only need pagination, sorting, or filtering independently without the full `useList` pipeline, use the dedicated stage providers:

#### `<PaginateProvider>`

```tsx
import {
  PaginateProvider,
  usePaginateContext,
} from "@omariyassine/react-list-hooks";

// Managed mode:
<PaginateProvider items={products} pageSize={20}>
  <ProductGrid />
  <Pagination />
</PaginateProvider>;

// Or Value mode:
const page = usePaginate(products, { pageSize: 20 });
<PaginateProvider value={page}>
  <ProductGrid />
</PaginateProvider>;
```

#### `<SortProvider>`

```tsx
import { SortProvider, useSortContext } from "@omariyassine/react-list-hooks";

<SortProvider items={products} initialKey="price" initialDirection="desc">
  <SortHeader />
  <ProductGrid />
</SortProvider>;
```

#### `<FilterProvider>`

```tsx
import {
  FilterProvider,
  useFilterContext,
} from "@omariyassine/react-list-hooks";

<FilterProvider items={products} searchFields={["name", "category"]}>
  <FilterBar />
  <ProductGrid />
</FilterProvider>;
```

---

### Granular State & Methods Hooks

To optimize re-renders in large component trees, you can subscribe specifically to either `state` or `methods`:

| Stage        | Full Context Hook      | State-Only Hook      | Methods-Only Hook      |
| ------------ | ---------------------- | -------------------- | ---------------------- |
| **List**     | `useListContext()`     | —                    | —                      |
| **Paginate** | `usePaginateContext()` | `usePaginateState()` | `usePaginateMethods()` |
| **Sort**     | `useSortContext()`     | `useSortState()`     | `useSortMethods()`     |
| **Filter**   | `useFilterContext()`   | `useFilterState()`   | `useFilterMethods()`   |

Components that only trigger actions (like a "Next Page" button or a "Sort by Price" header) can consume `methods` without re-rendering when state values change:

```tsx
function NextButton() {
  const { next } = usePaginateMethods();
  return <button onClick={next}>Next</button>;
}
```

---

### Context Factories

If your application has multiple independent lists or tables on the same screen (for example, a "Customers" table and an "Orders" table) and you want isolated contexts to prevent state collisions, use the context factories:

```tsx
import {
  createListContext,
  createPaginateContext,
  createSortContext,
  createFilterContext,
} from "@omariyassine/react-list-hooks";

// Create an isolated context suite for Products
const ProductList = createListContext<Product>();

function ProductsSection({ products }) {
  return (
    <ProductList.ListProvider items={products} paginate={{ pageSize: 10 }}>
      <ProductControls />
      <ProductTable />
    </ProductList.ListProvider>
  );
}

function ProductControls() {
  const { query, setQuery } = ProductList.useListContext();
  const { prev, next } = ProductList.usePaginateContext().methods;
  // ...
}
```

Available factories:

- `createListContext<T, K>()`
- `createPaginateContext<T>()`
- `createSortContext<T>()`
- `createFilterContext<T, K>()`

---

## Composing the Hooks (Manual)

The three primitive hooks can also be composed together manually into a **Filter → Sort → Paginate** pipeline. Use this approach when you need full control over each stage:

```tsx
import {
  usePaginate,
  useSort,
  useFilter,
} from "@omariyassine/react-list-hooks";

function DataTable({ data }) {
  // 1. Filter first (reduces the dataset)
  const filtered = useFilter(data, {
    searchFields: ["name", "email"],
    debounceMs: 150,
    useTransition: true,
    urlSync: true,
  });
  const { query, isFiltering } = filtered.state;
  const { setQuery, setFilter } = filtered.methods;

  // 2. Sort the filtered results
  const sorted = useSort(filtered.filteredItems, {
    initialKey: "name",
    useTransition: true,
    urlSync: true,
  });
  const { isSorting } = sorted.state;
  const { toggleSort, getSortIndicator } = sorted.methods;

  // 3. Paginate the sorted results
  const page = usePaginate(sorted.sortedItems, {
    pageSize: 10,
    siblingCount: 1,
    boundaryCount: 1,
    urlSync: true,
  });
  const { paginatedItems } = page;
  const { currentPage, hasPrev, hasNext, paginationRange } = page.state;
  const { prev, next, goToPage } = page.methods;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {(isFiltering || isSorting) && <span>Updating...</span>}

      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>
              Name{" "}
              {getSortIndicator("name") === "asc"
                ? "▲"
                : getSortIndicator("name") === "desc"
                  ? "▼"
                  : ""}
            </th>
            <th onClick={() => toggleSort("email")}>
              Email{" "}
              {getSortIndicator("email") === "asc"
                ? "▲"
                : getSortIndicator("email") === "desc"
                  ? "▼"
                  : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Windowed pagination controls with ellipses */}
      <div className="pagination">
        <button onClick={prev} disabled={!hasPrev}>
          Previous
        </button>
        {paginationRange.map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${idx}`}>...</span>
          ) : (
            <button
              key={item}
              className={currentPage === item ? "active" : ""}
              onClick={() => goToPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button onClick={next} disabled={!hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

> **Note**: When composing manually, you'll need to handle page-1 resets yourself (e.g. calling `page.goToStart()` when filters change). `useList` handles this automatically.

---

## TypeScript

All hooks are fully generic and infer types from your data automatically:

```tsx
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
}

// T is inferred as User
const page = usePaginate(users, { pageSize: 10 });
const sorted = useSort(users, { initialKey: "name" });
const filtered = useFilter(users, { searchFields: ["name", "email"] });
const list = useList(users, {
  filter: { searchFields: ["name"] },
  paginate: { pageSize: 10 },
});
```

All public types are exported from the package entry point:

```ts
import type {
  UsePaginateOptions,
  UsePaginateReturn,
  UsePaginateState,
  UsePaginateMethods,
  PaginationRangeItem,
  UrlSyncOptions,
  UseSortOptions,
  UseSortReturn,
  UseSortState,
  UseSortMethods,
  SortDirection,
  SortUrlSyncOptions,
  UseFilterOptions,
  UseFilterReturn,
  UseFilterState,
  UseFilterMethods,
  FilterKey,
  FilterUrlSyncOptions,
  UseListOptions,
  UseListReturn,
  ListUrlSyncOptions,
  ContextChildren,
  PaginateProviderProps,
  SortProviderProps,
  FilterProviderProps,
  ListProviderProps,
  CreatedPaginateContext,
  CreatedSortContext,
  CreatedFilterContext,
  CreatedListContext,
} from "@omariyassine/react-list-hooks";
```

---

## License

MIT
