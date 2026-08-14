# @omariyassine/react-list-hooks

A lightweight, zero-dependency (peer React only) collection of React hooks for managing list state — pagination, sorting, and filtering. Each hook is designed to be composable, type-safe, and fully generic so you can drop them onto any array of data.

---

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [`usePaginator`](#usepaginator)
  - [Basic Usage](#basic-usage)
  - [Return Value](#return-value)
  - [Options](#options)
  - [URL Synchronization](#url-synchronization)
  - [Navigation](#navigation)
  - [Page Size Management](#page-size-management)
  - [Shareable URLs](#shareable-urls)
  - [How It Works Internally](#how-it-works-internally)
- [`useSort`](#usesort)
  - [Basic Usage](#basic-usage-1)
  - [Return Value](#return-value-1)
  - [Options](#options-1)
  - [Default Comparator](#default-comparator)
  - [Custom Comparators](#custom-comparators)
  - [Toggle Sort Cycle](#toggle-sort-cycle)
- [`useFilter`](#usefilter)
  - [Basic Usage](#basic-usage-2)
  - [Return Value](#return-value-2)
  - [Options](#options-2)
  - [Global Text Search](#global-text-search)
  - [Field-Specific Filters](#field-specific-filters)
  - [Custom Filter Predicates](#custom-filter-predicates)
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

The package exports three independent hooks that can be used alone or composed together:

| Hook | Purpose |
|------|---------|
| `usePaginator` | Slice an array into pages, navigate between them, sync state to the URL, and generate shareable links. |
| `useSort` | Sort an array by a key with automatic type-aware comparison, custom comparators, and a toggle-friendly API. |
| `useFilter` | Filter an array by a global text query and/or structured field-level filters with custom predicates. |

All hooks are fully typed with generics and work with any object shape.

---

## `usePaginator`

`usePaginator` takes an array and options, and returns a paginated slice along with navigation controls, status flags, and optional URL synchronization.

### Basic Usage

```tsx
import { usePaginator } from '@omariyassine/react-list-hooks';

function ProductList({ products }) {
  const page = usePaginator(products, { pageSize: 20 });

  return (
    <div>
      {page.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      <div className="controls">
        <button onClick={page.prev} disabled={!page.hasPrev}>
          Previous
        </button>
        <span>
          Page {page.currentPage} of {page.totalPages}
        </span>
        <button onClick={page.next} disabled={!page.hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

The returned value is an **array-like object**: it spreads and maps like a normal array (the current page's items), but also carries properties for pagination metadata and controls.

### Return Value

The return type `UsePaginatorReturn<T>` extends `Array<T>` and exposes the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `currentPage` | `number` | The current page number (1-indexed). |
| `totalPages` | `number` | Total number of pages. Always at least 1. |
| `totalItems` | `number` | Total number of items in the source array. |
| `pageSize` | `number` | Number of items per page. |
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
| `pageNumbers` | `number[]` | An array of all page numbers, e.g. `[1, 2, 3, 4, 5]`. Useful for rendering page buttons. |
| `isUrlSyncEnabled` | `boolean` | Whether URL synchronization is active. |
| `getShareableUrl` | `(targetPage?, targetPageSize?, baseUrl?) => string` | Generate a URL string with the pagination params applied. |

### Options

```ts
interface UsePaginatorOptions {
  /** Number of items per page. Defaults to 10. */
  pageSize?: number;
  /** Initial page number (1-indexed). Defaults to 1. */
  initialPage?: number;
  /** URL sync configuration. See below. */
  urlSync?: boolean | UrlSyncOptions;
}
```

### URL Synchronization

When `urlSync` is enabled, the current page and page size are read from and written to the browser's URL search parameters. This makes pagination state bookmarkable, shareable, and respects the browser back/forward buttons.

```tsx
const page = usePaginator(products, {
  pageSize: 20,
  urlSync: true, // enables sync with defaults
});
```

For fine-grained control, pass an object:

```tsx
const page = usePaginator(products, {
  urlSync: {
    enabled: true,
    pageParam: 'p',           // default: 'page'
    pageSizeParam: 'limit',   // default: 'pageSize'
    syncPageSize: true,       // default: true
    historyMode: 'push',      // default: 'replace'
    keepOtherParams: true,    // default: true
  },
});
```

**URL Sync Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Turn URL sync on or off. |
| `pageParam` | `'page'` | The query parameter name for the current page. |
| `pageSizeParam` | `'pageSize'` | The query parameter name for the page size. |
| `syncPageSize` | `true` | Whether to include `pageSize` in the URL. |
| `historyMode` | `'replace'` | Use `'replace'` to avoid polluting history, or `'push'` to create a new history entry on every change. |
| `keepOtherParams` | `true` | Whether to preserve existing query parameters (e.g. search filters) when updating the URL. |

**Behavior:**
- On mount, the hook reads `page` and `pageSize` from the URL. If present and valid, they override `initialPage` and `pageSize`.
- On state change, the hook updates the URL automatically.
- On `popstate` (browser back/forward), the hook re-reads the URL and updates state accordingly.
- All URL manipulation is wrapped in `try/catch` so it fails silently in restricted environments (e.g. SSR, iframes).

### Navigation

All navigation functions are stable callbacks (safe to pass directly to event handlers):

```tsx
<button onClick={page.next}>Next</button>
<button onClick={page.prev}>Previous</button>
<button onClick={() => page.goToPage(5)}>Go to 5</button>
<button onClick={page.goToStart}>First</button>
<button onClick={page.goToEnd}>Last</button>
```

Boundary checks are built-in: calling `next()` on the last page is a no-op, and `goToPage` clamps its argument to the valid range.

### Page Size Management

`setPageSize` dynamically changes the number of items per page. It is smart about preserving the user's context: when the page size changes, the hook recalculates which page contains the first item that was visible before, so the user doesn't jump to an arbitrary location.

```tsx
<select
  value={page.pageSize}
  onChange={(e) => page.setPageSize(Number(e.target.value))}
>
  <option value={10}>10</option>
  <option value={25}>25</option>
  <option value={50}>50</option>
</select>
```

### Shareable URLs

`getShareableUrl` generates a URL string with the pagination parameters baked in. You can use it to create "copy link to page" buttons or pre-generate links for specific pages.

```tsx
// Current page
const currentUrl = page.getShareableUrl();

// Specific page
const page3Url = page.getShareableUrl(3);

// Specific page and size
const customUrl = page.getShareableUrl(3, 25);

// With a custom base URL
const baseUrl = page.getShareableUrl(3, 25, '/products');
```

If `keepOtherParams` is enabled, existing query parameters are preserved in the generated URL.

### How It Works Internally

- The hook uses `useState` for `currentPage` and `pageSize`, and `useMemo` for the sliced `currentItems` and `pageNumbers`.
- Refs (`useRef`) hold the latest `items` and `options` so that stable callbacks (like `setPageSize` and event handlers) always operate on fresh data without needing to be recreated.
- `useEffect` handles three responsibilities: clamping the page when `totalPages` changes, syncing state to the URL, and listening to `popstate` for back/forward navigation.
- The return value is constructed with `Object.defineProperties` on a spread copy of `currentItems`, making the result array-iterable while attaching non-enumerable metadata properties.

---

## `useSort`

`useSort` sorts an array by a given key with automatic type-aware comparison. It supports custom comparators, explicit sort setting, and a convenient toggle cycle for UI interactions.

### Basic Usage

```tsx
import { useSort } from '@omariyassine/react-list-hooks';

function UserTable({ users }) {
  const { sortedItems, toggleSort, getSortIndicator } = useSort(users, {
    initialKey: 'name',
    initialDirection: 'asc',
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
}
```

| Property | Type | Description |
|----------|------|-------------|
| `sortedItems` | `T[]` | The array sorted by the current key and direction. If no sort is active, this is the original array reference. |
| `sortKey` | `keyof T \| null` | The key currently being sorted by. `null` if no sort is active. |
| `sortDirection` | `'asc' \| 'desc' \| null` | The current sort direction. `null` if no sort is active. |
| `setSort` | `(key, direction?) => void` | Explicitly sort by a key. Direction defaults to `'asc'`. |
| `toggleSort` | `(key) => void` | Cycle through sort states for a key: **asc → desc → clear → asc**. |
| `clearSort` | `() => void` | Remove sorting and return to the original order. |
| `getSortIndicator` | `(key) => SortDirection \| null` | Returns the current direction for a given key, or `null` if that key is not the active sort. Useful for rendering sort icons in table headers. |

### Options

```ts
interface UseSortOptions<T> {
  /** The initial field/key of T to sort by. */
  initialKey?: keyof T | null;
  /** The initial sort direction. Defaults to 'asc'. */
  initialDirection?: SortDirection | null;
  /** Custom comparator functions for specific keys. */
  comparators?: Partial<Record<keyof T, (a: T, b: T) => number>>;
}
```

### Default Comparator

When no custom comparator is provided for a key, `useSort` uses a built-in comparator that intelligently handles common types:

| Type | Comparison Strategy |
|------|---------------------|
| `string` | `localeCompare` with `numeric: true` and `sensitivity: 'base'` (so `"item2"` sorts before `"item10"`). |
| `Date` | Compares timestamps (`getTime()`). |
| `boolean` | `true` (1) comes after `false` (0). |
| `number` / others | Standard `<` / `>` comparison. |
| `null` / `undefined` | Always pushed to the bottom. If both are nullish, they are considered equal. |

The original array is never mutated; `useSort` creates a shallow copy with `[...items].sort(...)`.

### Custom Comparators

For complex types or domain-specific ordering, provide a comparator map:

```tsx
const { sortedItems } = useSort(employees, {
  comparators: {
    // Sort by last name, then first name
    fullName: (a, b) => {
      const aLast = a.name.split(' ').pop()!;
      const bLast = b.name.split(' ').pop()!;
      return aLast.localeCompare(bLast) || a.name.localeCompare(b.name);
    },
    // Custom priority ordering
    priority: (a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    },
  },
});
```

Custom comparators receive the full item objects and return a number (`< 0`, `0`, or `> 0`), just like JavaScript's `Array.prototype.sort`.

### Toggle Sort Cycle

`toggleSort` is designed for clickable table headers. It cycles through three states:

1. **First click** on a new column → sort **ascending**.
2. **Second click** on the same column → sort **descending**.
3. **Third click** on the same column → **clear** sort (return to original order).
4. **Fourth click** → back to ascending.

This gives users an intuitive way to explore data without extra "clear sort" buttons.

---

## `useFilter`

`useFilter` filters an array by a global text query (searched across multiple fields) and/or structured field-specific filters. It supports custom filter predicates for advanced matching logic.

### Basic Usage

```tsx
import { useFilter } from '@omariyassine/react-list-hooks';

function ProductList({ products }) {
  const { filteredItems, query, setQuery, filters, setFilter, clearAll } = useFilter(products, {
    searchFields: ['name', 'description'],
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

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
interface UseFilterReturn<T> {
  filteredItems: T[];
  query: string;
  setQuery: (query: string) => void;
  filters: Partial<Record<keyof T, unknown>>;
  setFilter: (key: keyof T, value: unknown) => void;
  clearFilter: (key: keyof T) => void;
  clearFilters: () => void;
  clearAll: () => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `filteredItems` | `T[]` | The array containing only items that match the query and all active filters. |
| `query` | `string` | The current global text search query. |
| `setQuery` | `(query: string) => void` | Update the global search query. |
| `filters` | `Partial<Record<keyof T, unknown>>` | The currently active field-specific filter values. |
| `setFilter` | `(key, value) => void` | Set a filter value for a specific field. Pass `undefined` to clear that filter. |
| `clearFilter` | `(key) => void` | Remove the filter for a specific field. |
| `clearFilters` | `() => void` | Remove all field-specific filters (keeps the global query). |
| `clearAll` | `() => void` | Reset both the global query and all field filters. |

### Options

```ts
interface UseFilterOptions<T> {
  /** Default search query. */
  initialQuery?: string;
  /** Default structured filter field values (used on initial mount). */
  initialFilters?: Partial<Record<keyof T, unknown>>;
  /** Custom filter/matching predicate functions for specific keys of T. */
  customFilters?: Partial<Record<keyof T, (item: T, filterValue: unknown) => boolean>>;
  /** Optional custom text search fields. Defaults to all string/number properties of T. */
  searchFields?: Array<keyof T>;
}
```

### Global Text Search

The global `query` performs a case-insensitive substring search across the configured `searchFields`. If `searchFields` is omitted, the hook automatically discovers all fields on the items that contain `string` or `number` values.

```tsx
// Explicit fields
useFilter(items, { searchFields: ['title', 'author'] });

// Auto-discover string/number fields
useFilter(items);
```

The search is **inclusive OR**: an item matches if *any* of the search fields contain the query string.

### Field-Specific Filters

Field filters perform **exact equality** by default. This is useful for dropdowns, toggles, and category filters:

```tsx
setFilter('status', 'active');     // only items where item.status === 'active'
setFilter('category', 'books');    // only items where item.category === 'books'
setFilter('inStock', true);        // only items where item.inStock === true
```

To clear a field filter, pass `undefined`:

```tsx
setFilter('status', undefined);    // removes the status filter
// or
clearFilter('status');
```

### Custom Filter Predicates

For ranges, partial matches, or complex logic, provide custom filter predicates:

```tsx
const { filteredItems } = useFilter(products, {
  customFilters: {
    // Price range: filter value is [min, max]
    price: (item, range) => {
      const [min, max] = range as [number, number];
      return item.price >= min && item.price <= max;
    },
    // Tags: filter value is a string, item.tags is an array
    tags: (item, tag) => item.tags.includes(tag as string),
    // Date range
    createdAt: (item, range) => {
      const [start, end] = range as [Date, Date];
      return item.createdAt >= start && item.createdAt <= end;
    },
  },
});

// Usage
setFilter('price', [10, 100]);
setFilter('tags', 'react');
```

Custom filters receive the item and the filter value, and return `true` to keep the item. They override the default exact-match behavior for their key.

---

## Composing the Hooks

The three hooks are designed to work together in a pipeline: **filter → sort → paginate**. Because each hook is pure and memoized, you can chain them with minimal overhead:

```tsx
import { usePaginator, useSort, useFilter } from '@omariyassine/react-list-hooks';

function DataTable({ data }) {
  // 1. Filter first (reduces the dataset)
  const { filteredItems, query, setQuery, filters, setFilter, clearAll } = useFilter(data, {
    searchFields: ['name', 'email'],
  });

  // 2. Sort the filtered results
  const { sortedItems, toggleSort, getSortIndicator } = useSort(filteredItems, {
    initialKey: 'name',
  });

  // 3. Paginate the sorted results
  const page = usePaginator(sortedItems, {
    pageSize: 10,
    urlSync: true,
  });

  return (
    <div>
      {/* Search */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />

      {/* Filters */}
      <select value={filters.role ?? ''} onChange={(e) => setFilter('role', e.target.value || undefined)}>
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      <button onClick={clearAll}>Clear</button>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort('name')}>
              Name {getSortIndicator('name') && (getSortIndicator('name') === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => toggleSort('email')}>
              Email {getSortIndicator('email') && (getSortIndicator('email') === 'asc' ? '▲' : '▼')}
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

      {/* Pagination */}
      <div className="pagination">
        <button onClick={page.prev} disabled={!page.hasPrev}>Previous</button>
        <span>Page {page.currentPage} of {page.totalPages}</span>
        <button onClick={page.next} disabled={!page.hasNext}>Next</button>
      </div>
    </div>
  );
}
```

Because each hook memoizes its output, React only re-renders downstream consumers when the actual derived data changes.

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
const page = usePaginator(users, { pageSize: 10 });
const { sortedItems } = useSort(users, { initialKey: 'name' });
const { filteredItems } = useFilter(users, { searchFields: ['name', 'email'] });
```

TypeScript will autocomplete keys like `'name'`, `'email'`, and `'role'` because the generic `T` is inferred from the `users` array. Custom comparators and filter predicates are also fully typed:

```tsx
useSort(users, {
  comparators: {
    // TypeScript knows 'a' and 'b' are User
    name: (a, b) => a.name.localeCompare(b.name),
  },
});

useFilter(users, {
  customFilters: {
    // TypeScript knows 'item' is User and 'filterValue' is unknown
    role: (item, filterValue) => item.role === filterValue,
  },
});
```

All public types are exported from the package entry point:

```ts
import type {
  UsePaginatorOptions,
  UsePaginatorReturn,
  UseSortOptions,
  UseSortReturn,
  UseFilterOptions,
  UseFilterReturn,
  SortDirection,
  UrlSyncOptions,
} from '@omariyassine/react-list-hooks';
```

---

## License

MIT

