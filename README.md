# @omariyassine/react-list-hooks

A lightweight, zero-dependency (peer React only) collection of generic React hooks for managing list state — pagination, sorting, and filtering. Each hook is composable, type-safe, and designed to handle massive datasets (100,000+ items) with high performance and optional URL state synchronization.

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
- [Composing the Hooks](#composing-the-hooks)
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

## Overview

The package exports three independent hooks that can be used alone or composed together in a pipeline (**Filter → Sort → Paginate**):

| Hook | Purpose |
|------|---------|
| `usePaginate` | Slice an array into pages, navigate with windowed range (`paginationRange`), sync state to the URL, and generate shareable links. |
| `useSort` | Sort an array with automatic type-aware comparison, Schwartzian transform for 100k+ speed, custom comparators, `isSorting`, and URL sync. |
| `useFilter` | Filter an array by a global text query and/or structured filters with debouncing, `isFiltering`, `useTransition`, and URL sync. |

All hooks are fully typed with generics and work with any object shape.

---

## Subpath Imports

In addition to importing from the package root, direct subpath imports are available for individual hooks:

```tsx
// Root import (all hooks & types)
import { usePaginate, useSort, useFilter } from '@omariyassine/react-list-hooks';

// Individual subpath imports
import { usePaginate } from '@omariyassine/react-list-hooks/use-paginate';
import { useSort } from '@omariyassine/react-list-hooks/use-sort';
import { useFilter } from '@omariyassine/react-list-hooks/use-filter';
```

---

## `usePaginate`

`usePaginate` takes an array and options, and returns a paginated slice along with navigation controls, status flags, windowed pagination ranges with ellipses, and optional URL synchronization.

### Basic Usage

```tsx
import { usePaginate } from '@omariyassine/react-list-hooks';

function ProductList({ products }) {
  const page = usePaginate(products, {
    pageSize: 20,
    siblingCount: 1,
    boundaryCount: 1,
  });

  return (
    <div>
      {page.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      <div className="controls">
        <button onClick={page.prev} disabled={!page.hasPrev}>Previous</button>

        {page.paginationRange.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              key={item}
              className={page.currentPage === item ? 'active' : ''}
              onClick={() => page.goToPage(item)}
            >
              {item}
            </button>
          )
        )}

        <button onClick={page.next} disabled={!page.hasNext}>Next</button>
      </div>
    </div>
  );
}
```

The returned value is an **array-like object**: it spreads and maps like a normal array (the current page's items), but also carries properties for pagination metadata and controls.

### Return Value

The return type `UsePaginateReturn<T>` extends `Array<T>` and exposes the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `currentPage` | `number` | The current page number (1-indexed). |
| `totalPages` | `number` | Total number of pages. Always at least 1. |
| `totalItems` | `number` | Total number of items in the source array. |
| `pageSize` | `number` | Current page size. |
| `hasNext` | `boolean` | Whether a next page exists. |
| `hasPrev` | `boolean` | Whether a previous page exists. |
| `isFirstPage` | `boolean` | Whether the current page is the first. |
| `isLastPage` | `boolean` | Whether the current page is the last. |
| `next` | `() => void` | Go to the next page (no-op if on last). |
| `prev` | `() => void` | Go to the previous page (no-op if on first). |
| `goToPage` | `(page: number) => void` | Jump to a specific page. Clamped to `[1, totalPages]`. |
| `goToStart` | `() => void` | Jump to page 1. |
| `goToEnd` | `() => void` | Jump to the last page. |
| `setPageSize` | `(size: number) => void` | Change the page size. Preserves the user's approximate scroll position by recalculating the current page. |
| `pageNumbers` | `number[]` | An array of all page numbers, e.g. `[1, 2, 3, 4, 5]`. |
| `paginationRange` | `Array<number \| 'ellipsis'>` | Smart windowed page numbers with ellipsis markers (e.g. `[1, 'ellipsis', 4, 5, 6, 'ellipsis', 100]`). |
| `isUrlSyncEnabled` | `boolean` | Whether URL synchronization is active. |
| `getShareableUrl` | `(targetPage?, targetPageSize?, baseUrl?) => string` | Generate a URL string with the pagination params applied. |

> **Note on Array Properties**: The extra pagination properties are non-enumerable. Iterating with `for...in`, reading `Object.keys()`, or calling `JSON.stringify(page)` will cleanly serialize only the items of the current page.

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
// page.paginationRange -> [1, 'ellipsis', 4, 5, 6, 'ellipsis', 100]
```

### URL Synchronization

When `urlSync` is enabled, the current page and page size are read from and written to the browser's URL search parameters. This makes pagination state bookmarkable, shareable, and respects browser back/forward buttons.

```tsx
const page = usePaginate(products, {
  pageSize: 20,
  urlSync: {
    enabled: true,
    pageParam: 'p',           // default: 'page'
    pageSizeParam: 'limit',   // default: 'pageSize'
    syncPageSize: true,       // default: true
    historyMode: 'push',      // default: 'replace'
    keepOtherParams: true,    // default: true (preserves filter/sort params)
  },
});
```

---

## `useSort`

`useSort` sorts an array by a given key with automatic type-aware comparison, Schwartzian Transform optimization for massive datasets, URL synchronization, custom comparators, and React 18/19 `useTransition` support.

### Basic Usage

```tsx
import { useSort } from '@omariyassine/react-list-hooks';

function UserTable({ users }) {
  const { sortedItems, sortKey, sortDirection, toggleSort, getSortIndicator, isSorting } = useSort(users, {
    initialKey: 'name',
    initialDirection: 'asc',
    useTransition: true, // Non-blocking concurrent rendering
  });

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => toggleSort('name')}>
            Name {getSortIndicator('name') === 'asc' ? '▲' : getSortIndicator('name') === 'desc' ? '▼' : ''}
          </th>
          <th onClick={() => toggleSort('age')}>
            Age {getSortIndicator('age') === 'asc' ? '▲' : getSortIndicator('age') === 'desc' ? '▼' : ''}
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

### Return Value

```ts
interface UseSortReturn<T> {
  sortedItems: T[];
  sortKey: keyof T | null;
  sortDirection: SortDirection | null;
  setSort: (key: keyof T, direction?: SortDirection) => void;
  toggleSort: (key: keyof T) => void;
  clearSort: () => void;
  getSortIndicator: (key: keyof T) => SortDirection | null;
  isSorting: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `sortedItems` | `T[]` | The array sorted by the current key and direction. Returns original array reference if no sort is active. |
| `sortKey` | `keyof T \| null` | The key currently being sorted by. `null` if inactive. |
| `sortDirection` | `'asc' \| 'desc' \| null` | The current sort direction. |
| `setSort` | `(key, direction?) => void` | Explicitly sort by a key. Direction defaults to `'asc'`. |
| `toggleSort` | `(key) => void` | Cycle through sort states for a key: **asc → desc → clear → asc**. |
| `clearSort` | `() => void` | Remove sorting and return to the original order. |
| `getSortIndicator` | `(key) => SortDirection \| null` | Returns the current direction for a given key, or `null` if inactive. |
| `isSorting` | `boolean` | `true` while a debounce timer or React 18/19 concurrent transition is in progress. |

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
const { sortedItems } = useSort(users, {
  urlSync: {
    enabled: true,
    sortKeyParam: 'sortBy',    // default: 'sortBy'
    directionParam: 'sortDir', // default: 'sortDir'
    historyMode: 'replace',    // default: 'replace'
    keepOtherParams: true,     // default: true
  },
});
```

### Default Comparator & Fast Collation

`useSort` uses a cached, module-level singleton `Intl.Collator` instance with `{ numeric: true, sensitivity: 'base' }` for natural string comparisons (e.g. `"item2"` sorts before `"item10"`), avoiding repeated instantiation penalties on large lists.

| Type | Comparison Strategy |
|------|---------------------|
| `string` | Natural sort using cached `Intl.Collator` singleton. |
| `Date` | Compares timestamps via `.getTime()`. |
| `boolean` | `true` (1) comes after `false` (0). |
| `number` | Numeric comparison. `NaN` values are stably pushed to the bottom. |
| `bigint` / mixed | Safely compares `bigint` with `bigint` and mixed `bigint` / `number` without throwing errors. |
| `function` | Deterministically compared by function `.name`. |
| `symbol` | Deterministically compared by symbol `.description`. |
| `object` | Stringified representation comparison. |
| `null` / `undefined` | **NULLS LAST**: Always placed at the bottom in both `asc` and `desc` directions. |

### Large Dataset Optimization (Schwartzian Transform)

`useSort` automatically uses the **Schwartzian Transform** (Decorate-Sort-Undecorate) during sorting:
1. Pre-extracts sort keys into pre-allocated memory structures in a single contiguous $O(N)$ pass.
2. Sorts pre-extracted primitives with guaranteed index stability fallback (`a.index - b.index`).
3. Direct un-decorates into the final output array.

This avoids repeated $N \log N$ object property lookups, making sorting over **100,000+ items** blazing fast.

### Custom Comparators

```tsx
const { sortedItems } = useSort(employees, {
  comparators: {
    fullName: (a, b) => {
      const aLast = a.name.split(' ').pop()!;
      const bLast = b.name.split(' ').pop()!;
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
import { useFilter } from '@omariyassine/react-list-hooks';

function ProductList({ products }) {
  const {
    filteredItems,
    query,
    setQuery,
    filters,
    setFilter,
    clearAll,
    isFiltering,
  } = useFilter(products, {
    searchFields: ['name', 'category'],
    debounceMs: 200,      // Debounce heavy text search
    useTransition: true,   // Non-blocking concurrent rendering
    urlSync: true,        // Sync query & filters with URL
  });

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
        value={filters.category ?? ''}
        onChange={(e) => setFilter('category', e.target.value || undefined)}
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

### Return Value

```ts
interface UseFilterReturn<T, K extends string = FilterKey<T>> {
  filteredItems: T[];
  query: string;
  setQuery: (query: string) => void;
  filters: Partial<Record<K, unknown>>;
  setFilter: (key: K, value: unknown) => void;
  clearFilter: (key: K) => void;
  clearFilters: () => void;
  clearAll: () => void;
  isFiltering: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `filteredItems` | `T[]` | The array containing only items that match the query and all active filters. Returns original array reference if no filters are active. |
| `query` | `string` | The current global text search query. |
| `setQuery` | `(query: string) => void` | Update the global search query. |
| `filters` | `Partial<Record<K, unknown>>` | The currently active structured filter values. |
| `setFilter` | `(key: K, value: unknown) => void` | Set a filter value for a field or custom filter key. Passing `undefined` clears that filter. |
| `clearFilter` | `(key: K) => void` | Remove the filter for a specific key. |
| `clearFilters` | `() => void` | Remove all field/structured filters (keeps the global text query). |
| `clearAll` | `() => void` | Reset both the global query and all filters immediately. |
| `isFiltering` | `boolean` | `true` while a debounce timer or React 18/19 transition is pending. |

### Options

```ts
interface UseFilterOptions<T, K extends string = FilterKey<T>> {
  /** Default search query. */
  initialQuery?: string;
  /** Default structured filter field values (used on initial mount). */
  initialFilters?: Partial<Record<K | FilterKey<T>, unknown>>;
  /** Custom filter/matching predicate functions for specific keys of T or custom filter keys. */
  customFilters?: Partial<Record<K | FilterKey<T>, (item: T, filterValue: any) => boolean>>;
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
const { filteredItems, query, filters } = useFilter(products, {
  urlSync: {
    enabled: true,
    queryParam: 'q',                      // default: 'q'
    paramMap: { category: 'cat' },        // Map internal filter key to custom URL query name
    historyMode: 'replace',               // default: 'replace'
    keepOtherParams: true,                // default: true
  },
});
```

### Debounce & React 18/19 `useTransition`

When filtering large datasets (100k+ records):
- **`debounceMs`**: Delays filter execution until the user stops typing, ensuring input fields never lag.
- **`useTransition: true`**: Marks filter calculations as non-blocking React transitions, ensuring the UI stays at 60 FPS.
- **`isFiltering`**: Provides an immediate loading state for spinners and status badges while computing.

### Custom Filter Predicates & Synthetic Keys

```tsx
const { filteredItems, setFilter } = useFilter(products, {
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

setFilter('priceRange', [10, 100]);
setFilter('tags', 'react');
```

---

## Composing the Hooks

The three hooks compose together seamlessly into a high-performance **Filter → Sort → Paginate** pipeline:

```tsx
import { usePaginate, useSort, useFilter } from '@omariyassine/react-list-hooks';

function DataTable({ data }) {
  // 1. Filter first (reduces the dataset)
  const { filteredItems, query, setQuery, filters, setFilter, clearAll, isFiltering } = useFilter(data, {
    searchFields: ['name', 'email'],
    debounceMs: 150,
    useTransition: true,
    urlSync: true,
  });

  // 2. Sort the filtered results
  const { sortedItems, toggleSort, getSortIndicator, isSorting } = useSort(filteredItems, {
    initialKey: 'name',
    useTransition: true,
    urlSync: true,
  });

  // 3. Paginate the sorted results
  const page = usePaginate(sortedItems, {
    pageSize: 10,
    siblingCount: 1,
    boundaryCount: 1,
    urlSync: true,
  });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      {(isFiltering || isSorting) && <span>Updating...</span>}

      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort('name')}>
              Name {getSortIndicator('name') === 'asc' ? '▲' : getSortIndicator('name') === 'desc' ? '▼' : ''}
            </th>
            <th onClick={() => toggleSort('email')}>
              Email {getSortIndicator('email') === 'asc' ? '▲' : getSortIndicator('email') === 'desc' ? '▼' : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {page.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Windowed pagination controls with ellipses */}
      <div className="pagination">
        <button onClick={page.prev} disabled={!page.hasPrev}>Previous</button>
        {page.paginationRange.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`}>...</span>
          ) : (
            <button
              key={item}
              className={page.currentPage === item ? 'active' : ''}
              onClick={() => page.goToPage(item)}
            >
              {item}
            </button>
          )
        )}
        <button onClick={page.next} disabled={!page.hasNext}>Next</button>
      </div>
    </div>
  );
}
```

---

## TypeScript

All hooks are fully generic and infer types from your data automatically:

```tsx
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

// T is inferred as User
const page = usePaginate(users, { pageSize: 10 });
const { sortedItems } = useSort(users, { initialKey: 'name' });
const { filteredItems } = useFilter(users, { searchFields: ['name', 'email'] });
```

All public types are exported from the package entry point:

```ts
import type {
  UsePaginateOptions,
  UsePaginateReturn,
  PaginationRangeItem,
  PaginateUrlSyncOptions,
  UseSortOptions,
  UseSortReturn,
  SortDirection,
  SortUrlSyncOptions,
  UseFilterOptions,
  UseFilterReturn,
  FilterKey,
  FilterUrlSyncOptions,
} from '@omariyassine/react-list-hooks';
```

---

## License

MIT
