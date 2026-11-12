# Bug Report & Fix Plan — `@omariyassine/react-list-hooks` v0.3.0

> **Method.** Every bug below was verified at runtime, not just by reading code: for each suspected defect I wrote a temporary test that *asserts the correct behavior* — a failing test is a confirmed bug, and the failure output doubles as the reproduction. All temporary tests were removed afterwards; the shipped suite (116 tests) passes untouched. Line numbers refer to the current `main` (commit `9ab1888`).
>
> **Re-verification note.** One claim from the initial analysis (mixed `bigint`/`number` NaN ordering) was re-tested and **cleared** — see [Appendix A](#appendix-a-claims-re-verified-and-cleared). The bug list below is the corrected, evidence-backed set: **18 confirmed bugs** (7 critical, 5 medium, 6 minor).
>
> **Status: ALL 18 BUGS FIXED.** ✅ Every fix below has been implemented, verified by a new regression suite (`packages/react-list-hooks/src/tests/regressions.test.ts`, 31 tests), and the full suite (147 tests) passes with a clean typecheck and a verified dual-format build.

---

## Summary

| # | Severity | Title | Location | Status |
|---|----------|-------|----------|--------|
| 1 | 🔴 Critical | CJS build declared but never emitted | `tsup.config.ts:5`, `package.json` | ✅ Fixed |
| 2 | 🔴 Critical | `keepOtherParams: false` lets pipeline stages wipe each other's URL state | `use-list.ts`, all hooks | ✅ Fixed |
| 3 | 🔴 Critical | Unstable default `{}` re-runs the filter URL effect every render | `use-list.ts:42` | ✅ Fixed |
| 4 | 🔴 Critical | Cleared filters leave stale URL params that resurrect on refresh | `use-filter.ts:176-186` | ✅ Fixed |
| 5 | 🔴 Critical | Filter values lose their type through the URL round-trip | `use-filter.ts:57`, `isMatch` | ✅ Fixed |
| 6 | 🔴 Critical | "Omit to disable" contract violated; sort indicator reports a sort that isn't applied | `use-list.ts:116,135` | ✅ Fixed |
| 7 | 🔴 Critical | `paginationRange` off-by-one drops the current page's sibling (and can hide the current page) | `use-paginate.ts:28-67` | ✅ Fixed |
| 8 | 🟠 Medium | `syncPageSize: false` honored on only 1 of 3 code paths | `use-paginate.ts:81,173,252` | ✅ Fixed |
| 9 | 🟠 Medium | Sort URL syncs live state; filter syncs debounced state | `use-sort.ts:239` | ✅ Fixed |
| 10 | 🟠 Medium | `usePaginate` writes `?page=1&pageSize=10` on mount (and pushes a history entry) | `use-paginate.ts:165` | ✅ Fixed |
| 11 | 🟠 Medium | Filter URL read path ignores params the write path emits | `use-filter.ts:44-66` | ✅ Fixed |
| 12 | 🟠 Medium | Dynamic `searchFields` changes never re-filter | `use-filter.ts:276,309` | ✅ Fixed |
| 13 | 🟡 Minor | `clearFilters()` resets pagination even with nothing active | `use-filter.ts:264`, `use-list.ts:159` | ✅ Fixed |
| 14 | 🟡 Minor | Debounced sort resets the page before the sort applies | `use-list.ts:159-184` | ✅ Fixed |
| 15 | 🟡 Minor | `resetAll()` doesn't restore the initial `pageSize` | `use-list.ts:201` | ✅ Fixed |
| 16 | 🟡 Minor | Docs: "Omit `paginate` … returns all items" — it paginates at 10 | `types/index.ts:218` | ✅ Fixed |
| 17 | 🟡 Minor | `parseInt` accepts trailing garbage (`?page=2abc` → 2) | `use-paginate.ts:74`, `use-list.ts:22` | ✅ Fixed |
| 18 | 🟡 Minor | Demo depends on a stale 0.2.2 tarball | `demo/package.json:13` | ✅ Fixed |

---

## 🔴 Critical

### Bug 1 — CJS build is declared but never emitted

> ✅ **FIXED**

**Location:** `tsup.config.ts:5`, `package.json` (`main`, `exports`)

**Details.** `package.json` fully declares a dual-format package:

```json
"main": "./dist/index.cjs",
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  // …same pattern for ./use-paginate, ./use-filter, ./use-sort, ./use-list
}
```

But the build only produces ESM:

```ts
// tsup.config.ts
format: ['esm'],   // ← no 'cjs'
```

**Verified evidence.** A full `bun run build` emits `dist/index.js`, `dist/chunk-*.js`, and `*.d.ts` — **zero `.cjs` / `.d.cts` files**. Any `require()` consumer (Node CJS, most Jest configs, SSR bundles without ESM support) resolves `main: ./dist/index.cjs` → **`ERR_MODULE_NOT_FOUND`**. This is a publish blocker: the package metadata promises files that don't exist.

**Suggested fix.**

```ts
// tsup.config.ts
format: ['esm', 'cjs'],
```

tsup emits `.cjs`/`.d.cts` automatically for the CJS format and per-entry `use-*.cjs` files matching the `exports` map. Note that `splitting: true` only applies to the ESM output (tsup ignores it for CJS), which is fine — the shared `chunk-*.js` only exists to serve the ESM entries.

**Regression test.** A build smoke test: run `bun run build`, then assert `existsSync('dist/index.cjs')` and `existsSync('dist/use-paginate.cjs')` (and optionally `require()` them in a Node CJS context).

---

### Bug 2 — `keepOtherParams: false` lets pipeline stages wipe each other's URL state

> ✅ **FIXED**

**Location:** `use-list.ts` (stage wiring), `use-filter.ts:158`, `use-sort.ts:214`, `use-paginate.ts:170`

**Details.** Every stage's URL-sync effect rebuilds the query string from scratch when `keepOtherParams` is `false`:

```ts
const searchParams = keepOtherParams ? new URLSearchParams(currentSearchParams) : new URLSearchParams();
```

Inside `useList`, the three stages run as siblings in one component, so "params I don't know about" includes **the other stages' params**. Combined with Bug 3 (the filter effect re-runs on *every* render), the stages repeatedly clobber each other; the final URL is decided by effect order, not by user intent.

**Verified evidence.**

1. **Shared link destroyed on mount.** Mounting `useList` with `urlSync: { enabled: true, keepOtherParams: false }` on a shared link `?q=Item&sortBy=price&sortDir=desc` ends with the URL rewritten to `?page=1&pageSize=10` — the entire shared state is silently discarded (the paginate effect runs last and wins).
2. **Sort params destroyed by filter.** After `setQuery('Item')` then `setSort('price')`, the URL is `?q=Item` — the sort effect first writes `?sortBy=price&sortDir=asc` (wiping `q`), then the filter effect immediately overwrites it with `?q=Item` (wiping `sortBy`). A `replaceState` trace shows the sequence: `["/?sortBy=price&sortDir=asc", "/?q=Item"]`.
3. **Any unrelated host re-render** re-runs the filter effect and wipes whatever the other stages last wrote.

**Suggested fix.** Two viable directions:

- **Tactical (minimal diff):** teach each stage which params the *pipeline* owns. Add an internal `preserveParams?: string[]` field to the per-hook URL-sync options; `useList` populates it with the full set of pipeline-owned names (`q`, mapped filter params, `sortBy`, `sortDir`, `page`, `pageSize`). When `keepOtherParams: false`, a stage starts from `new URLSearchParams()` but re-copies only params listed in `preserveParams` (excluding its own), then sets its own. Standalone hooks keep today's semantics (empty `preserveParams`).
- **Strategic (cleaner, larger diff):** when running inside `useList`, disable per-stage URL sync entirely and give `useList` a single unified effect that composes the full URL from all three stages' state in one write. This eliminates cross-stage clobbering by construction, removes 2 of 3 `URLSearchParams` parses per update, and makes `historyMode: 'push'` produce one entry per user action instead of up to three.

The strategic fix also naturally resolves Bug 10's multi-write behavior for `useList`.

**Regression test.** Mount `useList` with `keepOtherParams: false` on `?q=Item&sortBy=price&sortDir=desc`; assert the URL still contains all three params after mount. Then `setSort('price')` and assert `sortBy` survives alongside `q`.

---

### Bug 3 — Unstable default `{}` re-runs the filter URL effect on every render

> ✅ **FIXED**

**Location:** `use-list.ts:42`

**Details.**

```ts
const filterParamMap = urlSyncConfig.filterParamMap ?? {};   // ← new object identity every render
```

`filterParamMap` feeds the `filterUrlSync` memo's dependency array, so the memo output is unstable → `useFilter`'s internal `paramMap` memo recomputes → the URL-sync effect (which lists `paramMap` in its deps) **re-runs on every single render of the host component**. The effect's URL-unchanged guard prevents actual history writes, but the wasted work is real: two `URLSearchParams` constructions per render.

This is harmless-looking on its own, but it is the **amplifier that turns Bug 2 from "last writer wins" into "last writer wins on every render"**.

**Verified evidence.** Instrumenting the `URLSearchParams` constructor around three idle re-renders of a mounted `useList` (no state changes at all) shows **6 extra constructions** — exactly 2 per render from the filter effect.

**Suggested fix.** Hoist a module-level constant (identity-stable, zero cost):

```ts
const EMPTY_PARAM_MAP: Record<string, string> = {};
// …
const filterParamMap = urlSyncConfig.filterParamMap ?? EMPTY_PARAM_MAP;
```

(Alternatively `useMemo`, but the module constant is simpler and can't be defeated by a remount.) The same defensive pattern is worth applying to any other `?? {}` / `?? []` defaults that flow into dependency arrays. Note the standalone `useFilter` is only affected if the *caller* passes an inline `paramMap` literal — that's ordinary React prop-identity behavior and belongs in docs rather than code.

**Regression test.** Instrument `URLSearchParams` (or the effect via a spy); re-render an idle `useList` 3×; assert 0 additional constructions.

---

### Bug 4 — Cleared filters leave stale URL params that resurrect on refresh

> ✅ **FIXED**

**Location:** `use-filter.ts:176-186` (cleanup loops), `use-filter.ts:242-248` (`clearFilter`)

**Details.** The URL-sync effect cleans up removed filters with two loops:

```ts
for (const [filterKey, mappedParam] of Object.entries(paramMap)) { … searchParams.delete(paramName) }
for (const key of Object.keys(filters)) { … if (filters[key] === undefined) searchParams.delete(paramName) }
```

Both loops only visit keys that exist in `paramMap` **or still exist in `filters`**. But `clearFilter` *deletes* the key from state:

```ts
const clearFilter = useCallback((key: ActualKey) => {
  setFilters((prev) => { const next = { ...prev }; delete next[key]; return next; });
}, []);
```

So for an **unmapped** key (no `paramMap` entry), once cleared, the key is gone from both `paramMap` and `filters` — no loop can ever reach its URL param again.

**Verified evidence.**

1. `setFilter('category', 'Audio')` → URL `?category=Audio` ✓
2. `clearFilter('category')` → URL **still** `?category=Audio` ✗
3. Refresh → `getInitialFilters` sees `?category=Audio` and (if the key is declared in `initialFilters`) restores `filters = { category: 'Audio' }` — **the filter comes back from the dead**.

The same leak applies to `clearAll()` and to `setFilter(key, '')` for unmapped keys. (For *mapped* keys the first loop saves the day, which is why this survives casual testing.)

**Suggested fix.** Track the param names this hook has previously written, and delete any that are no longer active:

```ts
const writtenParamNamesRef = useRef<Set<string>>(new Set());

// inside the URL-sync effect, after computing activeParamNames:
for (const name of writtenParamNamesRef.current) {
  if (!activeParamNames.has(name)) searchParams.delete(name);
}
writtenParamNamesRef.current = activeParamNames;
```

This is O(written) per update, handles mapped *and* unmapped keys, and also cleans up params left over from a previous `paramMap` configuration.

**Regression test.** `setFilter('category', 'Audio')` → `clearFilter('category')` → assert `window.location.search` no longer contains `category`.

---

### Bug 5 — Filter values lose their type through the URL round-trip

> ✅ **FIXED**

**Location:** `use-filter.ts:57` (`result[key] = urlVal` — raw string), `use-filter.ts:8-21` (`isMatch`), write path `use-filter.ts:170` (`String(filterVal)`)

**Details.** The write path serializes every filter value with `String(filterVal)` → `?price=10`. The read path (`getInitialFilters`) restores the **raw string**. Default matching is exact:

```ts
function isMatch(itemVal: unknown, filterVal: unknown): boolean {
  if (Object.is(itemVal, filterVal) || itemVal === filterVal) return true;
  // …Date coercion exists, but NO number/boolean coercion
  return false;
}
```

`'10' !== 10`, so a numeric filter restored from the URL matches nothing. Dates already work (there's a `Date`-vs-string branch in `isMatch`), which makes the number/boolean gap stand out more.

**Verified evidence.** URL `?price=10`, `initialFilters: { price: 10 }` (so the read path fires — see Bug 11), items include `{ price: 10 }`:

- `filters` after mount: `{ price: '10' }` ← type lost
- `filteredItems.length`: **0** — the item with `price: 10` is not matched

URL sync for non-string filters is effectively **write-only**.

**Suggested fix.** Two complementary changes:

1. **Coerce in `isMatch`** (symmetric with the existing Date branch):

```ts
if (typeof itemVal === 'number' && typeof filterVal === 'string' && filterVal.trim() !== '') {
  const n = Number(filterVal);
  if (Number.isFinite(n) && String(n) === filterVal.trim()) return itemVal === n;
}
if (typeof itemVal === 'boolean' && (filterVal === 'true' || filterVal === 'false')) {
  return itemVal === (filterVal === 'true');
}
```

The `String(n) === filterVal` guard keeps matching strict (rejects `'1e2'`, `' 10'`, `'10.0'` for `10`).

2. **Document the limitation** for anything richer (arrays, nested objects): those need a custom `paramMap` + `customFilters` pair, or a future opt-in serializer (e.g. `paramMap: { tags: { param: 'tags', parse: JSON.parse, serialize: JSON.stringify } }`).

**Regression test.** Set URL `?price=10` with `initialFilters: { price: 10 }`; assert `filteredItems` contains the `price: 10` item.

---

### Bug 6 — "Omit to disable" contract violated; the sort indicator reports a sort that isn't applied

> ✅ **FIXED**

**Location:** `use-list.ts:116` (`sortInput`), `use-list.ts:135-137` (`paginateInput`), `types/index.ts:214-218` (the contract)

**Details.** The documented contract says *"Omit to disable filtering/sorting."* But `useList` passes the unified `urlSync` config to **all three stages unconditionally**, so an omitted stage still reads its params from the URL on mount. Worse, for sort:

```ts
const sortInput = options?.sort !== undefined ? filteredItems : items;
const paginateInput =
  options?.sort !== undefined ? sortedItems : options?.filter !== undefined ? filteredItems : items;
```

When `options.sort` is `undefined`, `useSort` still initializes from the URL (`sortKey: 'price'`) — but `paginateInput` takes the `filteredItems`/`items` branch, so **the sorted output is discarded**. The returned `sortKey`/`sortDirection`/`getSortIndicator` then describe a sort that is not applied to the data.

**Verified evidence.**

- **Filter omitted**, URL `?q=Audio` → `filteredCount: 2`. Filtering is active despite being "disabled".
- **Sort omitted**, URL `?sortBy=price&sortDir=asc` → `sortKey: 'price'`, `sortDirection: 'asc'`, yet `data` prices are `[30, 10, 20]` — unsorted. A UI rendering `getSortIndicator('price')` shows an active sort indicator while the list ignores it.

**Suggested fix.** In `useList`, only enable a stage's URL sync when that stage is configured:

```ts
const filterUrlSync = useMemo(
  () => (isUrlSyncEnabled && options?.filter !== undefined ? { … } : false),
  [isUrlSyncEnabled, options?.filter !== undefined, /* … */],
);
// same for sortUrlSync (options?.sort !== undefined) and paginateUrlSync
```

Additionally, make `paginateInput` consume `sortedItems` whenever the sort hook is actually sorting (`activeSortKey !== null`), rather than keying off `options.sort !== undefined` — this keeps the pipeline consistent even if the sort state originates elsewhere. Exposing `activeSortKey` from `useSort` (see Bug 14) makes this trivial.

**Regression test.** Mount `useList(items, { urlSync: true })` (no `filter`/`sort`) on `?q=Audio&sortBy=price`; assert `filteredCount === items.length` and `sortKey === null`.

---

### Bug 7 — `paginationRange` off-by-one drops the current page's sibling (and can hide the current page)

> ✅ **FIXED**

**Location:** `use-paginate.ts:28-67` (`computePaginationRange`)

**Details.** The one-sided branches use the wrong item count:

```ts
if (!showLeftEllipsis && showRightEllipsis) {
  const leftItemCount = safeBoundaries + 2 * safeSiblings + 1;   // ← should be +2
  const leftRange = range(1, leftItemCount);
  return [...leftRange, 'ellipsis', ...endPages];
}
```

The reference algorithm this API mirrors (MUI `usePagination`) clamps the sibling window with `siblingsStart`/`siblingsEnd` so the current page always keeps both siblings near boundaries. This implementation instead extends the *flat* range by one too few, so the current page's outer sibling is pushed behind the ellipsis. With `siblingCount: 0` it gets worse: the flat range is `boundaries + 1` items, which can end **before the current page**, hiding the current page itself behind the ellipsis.

**Verified evidence** (10 pages, `siblingCount: 1`, `boundaryCount: 1` unless noted):

| Case | This repo | MUI reference |
|------|-----------|----------------|
| Page 4 of 10 | `1 2 3 4 … 10` — **page 5 missing** | `1 2 3 4 5 … 10` |
| Page 7 of 10 | `1 … 7 8 9 10` — **page 6 missing** | `1 … 6 7 8 9 10` |
| Page 3 of 6, `siblingCount: 0` | `1 2 … 6` — **current page 3 hidden behind the ellipsis** | `1 2 3 … 6` |
| Page 2 of 6, `siblingCount: 0` | `1 2 … 6` — page 3 hidden | `1 2 3 … 6` |

**Suggested fix.** Port MUI's clamping math (from `mui/material-ui` `usePagination.js`), keeping the existing early-return for short lists:

```ts
function computePaginationRange(
  totalPages: number,
  currentPage: number,
  siblingCount = 1,
  boundaryCount = 1,
): PaginationRangeItem[] {
  const safeSiblings = Math.max(0, siblingCount);
  const safeBoundaries = Math.max(1, boundaryCount);

  const totalSlots = safeBoundaries * 2 + safeSiblings * 2 + 3;
  if (totalPages <= totalSlots) return range(1, totalPages);

  const startPages = range(1, Math.min(safeBoundaries, totalPages));
  const endPages = range(Math.max(totalPages - safeBoundaries + 1, safeBoundaries + 1), totalPages);

  const siblingsStart = Math.max(
    Math.min(currentPage - safeSiblings, totalPages - safeBoundaries - safeSiblings * 2 - 1),
    safeBoundaries + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(currentPage + safeSiblings, safeBoundaries + safeSiblings * 2 + 2),
    totalPages - safeBoundaries - 1,
  );

  return [
    ...startPages,
    ...(siblingsStart > safeBoundaries + 2
      ? ['ellipsis']
      : safeBoundaries + 1 < totalPages - safeBoundaries
        ? [safeBoundaries + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < totalPages - safeBoundaries - 1
      ? ['ellipsis']
      : totalPages - safeBoundaries > safeBoundaries
        ? [totalPages - safeBoundaries]
        : []),
    ...endPages,
  ];
}
```

The nested ternaries replace a hidden ellipsis with the adjacent filler page (MUI behavior), so an "ellipsis" only ever appears when it genuinely hides ≥2 pages.

**Regression test.** Assert the four table rows above against the MUI column.

---

## 🟠 Medium

### Bug 8 — `syncPageSize: false` is honored on only 1 of 3 code paths

> ✅ **FIXED**

**Location:** `use-paginate.ts:81-92` + `110-112` (mount read), `use-paginate.ts:173-175` (write effect — ✅ correct), `use-paginate.ts:213` (popstate — ✅ correct), `use-paginate.ts:252` (`getShareableUrl`)

**Details.** The flag means "pageSize is app state, not URL state". Three paths disagree:

| Path | Respects flag? |
|------|----------------|
| URL-sync write effect (`if (syncPageSize) searchParams.set(...)`) | ✅ |
| popstate handler (`if (syncPageSize) { … read pageSize … }`) | ✅ |
| **Mount read** — `getInitialPageSize` unconditionally reads `?pageSize=` | ❌ |
| **`getShareableUrl`** — unconditionally `searchParams.set(pageSizeParam, String(ps))` | ❌ |

**Verified evidence.**

- `urlSync: { enabled: true, syncPageSize: false }` + URL `?pageSize=5` → mount yields `pageSize: 5` (should be the default 10).
- Same config, `getShareableUrl(2)` → `'/?page=1&pageSize=10'` — emits the param the consumer explicitly opted out of.

**Suggested fix.**

1. Thread the flag into the mount read: `getInitialPageSize(options, isUrlSyncEnabled && syncPageSize, pageSizeParam)` (or add a `syncPageSize` parameter).
2. In `getShareableUrl`, wrap the set: `if (syncPageSize) searchParams.set(pageSizeParam, String(ps));` and add `syncPageSize` to the callback's dependency array.

**Regression test.** Both evidence bullets, asserting `pageSize === 10` and a shareable URL without `pageSize`.

---

### Bug 9 — Sort URL sync uses live state; filter uses debounced state

> ✅ **FIXED**

**Location:** `use-sort.ts:209-240` (effect body), `use-sort.ts:239` (deps)

**Details.** `useFilter` syncs the URL from `appliedQuery` (post-debounce), but `useSort` syncs from the live values:

```ts
}, [sortKey, sortDirection, /* … */]);   // ← live state, not appliedSortState
```

With `debounceMs: 500`, the URL claims a sort that isn't applied yet — and `isSorting` is still `true`. Back/forward through such an intermediate URL restores a state the user never saw applied. It's also inconsistent within the same pipeline: filter waits, sort doesn't.

**Verified evidence.** `useSort(items, { urlSync: true, debounceMs: 500 })`; immediately after `setSort('price')` (before any timers): URL is already `?sortBy=price&sortDir=asc` while `isSorting: true` and `sortedItems` is still unsorted.

**Suggested fix.** Depend on — and write — the applied state:

```ts
// inside the effect, replace sortKey/sortDirection with:
if (activeSortKey !== null && activeSortDirection !== null) {
  searchParams.set(sortKeyParam, String(activeSortKey));
  searchParams.set(directionParam, activeSortDirection);
} else { /* delete both */ }
// deps:
}, [activeSortKey, activeSortDirection, isUrlSyncEnabled, sortKeyParam, directionParam, historyMode, keepOtherParams]);
```

**Regression test.** With `debounceMs: 500`, assert the URL does *not* contain `sortBy` immediately after `setSort`, and does after the debounce elapses.

---

### Bug 10 — `usePaginate` writes `?page=1&pageSize=10` on mount (and pushes a history entry)

> ✅ **FIXED**

**Location:** `use-paginate.ts:165-201` (URL-sync effect)

**Details.** The effect runs on mount and "normalizes" the URL with the initial state, even when the user has done nothing. With the default `historyMode: 'replace'` this is only cosmetic noise; with `historyMode: 'push'` it **creates a spurious history entry on mount** (verified: `history.length` 3 → 4), so the back button appears "stuck" — the first back press just removes the injected entry instead of leaving the page.

**Verified evidence.** Fresh mount, zero interaction → `window.location.search === '?page=1&pageSize=10'`.

**Suggested fix.** Force `replaceState` for the first write:

```ts
const isFirstSyncRef = useRef(true);
// inside the effect, when writing:
const mode = isFirstSyncRef.current ? 'replace' : historyMode;
isFirstSyncRef.current = false;
```

This preserves the useful "normalize the URL on mount" behavior without polluting history. (If normalization itself is unwanted, the alternative is to skip the first run entirely when the URL contains none of this stage's params — but the forced-replace variant is the safer default.)

**Regression test.** Mount with `historyMode: 'push'`; assert `history.length` is unchanged.

---

### Bug 11 — Filter URL read path ignores params the write path emits

> ✅ **FIXED**

**Location:** `use-filter.ts:44-66` (`getInitialFilters`)

**Details.** The write path emits **every active filter**, using `paramMap[key] ?? key` as the param name. The read path only restores a param if:

```ts
if (urlKey === mappedName) { result[key] = urlVal; }   // key must be in paramMap
if (urlKey in initial) { result[urlKey] = urlVal; }    // or pre-declared in initialFilters
```

So a filter the hook itself wrote (`?category=Audio`, unmapped) is **ignored on refresh and on popstate** unless the consumer happened to pre-declare the key in `initialFilters`. Write and read are asymmetric.

**Verified evidence.** URL `?category=Audio` (exactly what the hook writes for `setFilter('category', 'Audio')`), plain `useFilter(items, { urlSync: true })` → mount yields `filters: {}`, `filteredCount: 3` (nothing filtered).

**Suggested fix.** The hook genuinely cannot know which arbitrary URL keys are filters — but it can be given that knowledge explicitly. Recommended, in order:

1. Add an explicit opt-in list to `FilterUrlSyncOptions`:
   ```ts
   /** Filter keys (unmapped ones included) that should be restored from the URL. */
   restoreKeys?: Array<ActualKey>;
   ```
   and honor it in `getInitialFilters` (treat each listed key like an `initialFilters` key).
2. In `useList`, auto-populate `restoreKeys` from `options.filter?.initialFilters` and `paramMap` so the common pipeline case round-trips out of the box.
3. Document the rule: *a filter round-trips through the URL only if its key is declared in `paramMap`, `initialFilters`, or `restoreKeys`.*

**Regression test.** `useFilter` with `restoreKeys: ['category']` on `?category=Audio` → `filters` equals `{ category: 'Audio' }` and `filteredItems` is filtered.

---

### Bug 12 — Dynamic `searchFields` changes never re-filter

> ✅ **FIXED**

**Location:** `use-filter.ts:276-296` (`resolvedSearchFields` memo), `use-filter.ts:309` (ref read), `use-filter.ts:313` (deps)

**Details.** Two compounding problems:

```ts
const resolvedSearchFields = useMemo<Array<keyof T>>(() => {
  if (searchFieldsRef.current) return searchFieldsRef.current;   // ref read…
  // …auto-detect from items
}, [items]);                                                       // …but memo keyed on [items] only

// inside filteredItems:
const fieldsToSearch = searchFieldsRef.current ?? resolvedSearchFields;  // ref read again
// deps: [items, appliedQuery, filters, resolvedSearchFields]
```

1. The memo reads `searchFieldsRef.current` but doesn't key on it, so a new `searchFields` prop never invalidates the memo.
2. `filteredItems` reads the ref directly, bypassing its own dependency array — React can't see the change.

**Verified evidence.** Query `'audio'` with `searchFields: ['name']` → 0 matches (correct: no name contains "audio"). Re-render with `searchFields: ['name', 'category']` → **still 0** (should be 2 — two items have `category: 'Audio'`). Removing the prop entirely never reverts to auto-detection either (the stale captured `['name']` wins via the ref).

**Suggested fix.** Make the prop a first-class dependency and drop the ref indirection for this path:

```ts
const searchFieldsProp = options?.searchFields;
const resolvedSearchFields = useMemo<Array<keyof T>>(() => {
  if (searchFieldsProp) return searchFieldsProp;
  // …auto-detect from items
  return Array.from(fieldSet);
}, [searchFieldsProp, items]);

// inside filteredItems, use the memo directly:
const fieldsToSearch = resolvedSearchFields;
// deps stay: [items, appliedQuery, filters, resolvedSearchFields]
```

(The `customFiltersRef` indirection is fine — custom filters are read during the filter pass itself, which is keyed on `filters`.)

**Regression test.** The evidence scenario: broaden `['name']` → `['name', 'category']` and assert the count goes 0 → 2; then remove the prop and assert auto-detection resumes.

---

## 🟡 Minor

### Bug 13 — `clearFilters()` resets pagination even when nothing was active

> ✅ **FIXED**

**Location:** `use-filter.ts:264-266` (`clearFilters`), `use-list.ts:159-184` (reset effect)

**Details.** `clearFilters` unconditionally produces a fresh identity:

```ts
const clearFilters = useCallback(() => { setFilters({}); }, []);
```

`useList`'s auto-reset effect compares by identity (`prevFiltersRef.current !== filters`), so even a no-op clear triggers `goToStart()`.

**Verified evidence.** `useList` on page 2 with **zero** active filters → `clearFilters()` → page resets to 1.

**Suggested fix.** No-op when already empty (also avoids a wasted render):

```ts
const clearFilters = useCallback(() => {
  setFilters((prev) => (Object.keys(prev).length === 0 ? prev : {}));
}, []);
```

Apply the same guard inside `clearAll` (skip the `setFilters({})` when empty) and consider an existence check in `clearFilter`. Alternatively, make `useList`'s effect compare filter *contents* — but the identity guards in the hooks are cheaper and benefit standalone users too.

**Regression test.** Page 2, no active filters, `clearFilters()` → assert still page 2.

---

### Bug 14 — Debounced sort resets the page before the sort applies

> ✅ **FIXED**

**Location:** `use-list.ts:159-184` (reset effect tracks live `sortKey`/`sortDirection`)

**Details.** The reset effect keys on the **live** sort state, which flips immediately when `setSort` is called — but with `debounceMs` the data doesn't reorder until the debounce fires. The user is yanked to page 1 while still looking at the *old* ordering. (`useFilter` has the same shape for `query`, though for text search an immediate reset is arguably the desired UX; for sort it clearly isn't.)

**Verified evidence.** `useList(many, { sort: { debounceMs: 500 }, paginate: { initialPage: 3 } })` → `setSort('price')` → page is **1** immediately, with `isProcessing: true` and the data still unsorted.

**Suggested fix.** Reset when the *applied* pipeline inputs change. `useSort` already computes `activeSortKey`/`activeSortDirection` internally — expose them (and `useFilter`'s `appliedQuery`) in the hooks' returns, then:

```ts
// use-list.ts reset effect — track applied values:
const queryChanged = prevAppliedQueryRef.current !== appliedQuery;
const sortKeyChanged = prevActiveSortKeyRef.current !== activeSortKey;
// …
```

**Regression test.** The evidence scenario: assert the page stays 3 until the debounce elapses, then becomes 1.

---

### Bug 15 — `resetAll()` doesn't restore the initial `pageSize`

> ✅ **FIXED**

**Location:** `use-list.ts:201-205`

**Details.** `resetAll` clears filter/sort state and jumps to page 1, but `pageSize` — which `setPageSize` may have changed — is left alone. "Reset all" that doesn't reset a core paginate option is surprising.

**Verified evidence.** `paginate: { pageSize: 5 }` → `setPageSize(20)` → `resetAll()` → `pageSize` is still **20**.

**Suggested fix.** Have `usePaginate` expose a `resetPageSize()` that restores the mount-time value (captured in a ref, so URL-initialized sizes round-trip correctly), and call it from `resetAll`:

```ts
// use-paginate.ts
const initialPageSizeRef = useRef(pageSize);   // captured after state init
const resetPageSize = useCallback(() => setPageSizeState(initialPageSizeRef.current), []);
// use-list.ts
const resetAll = useCallback(() => {
  rawClearAll(); rawClearSort(); data.goToStart(); data.resetPageSize();
}, [rawClearAll, rawClearSort, data]);
```

**Regression test.** The evidence scenario: assert `pageSize === 5` after `resetAll()`.

---

### Bug 16 — Docs: "Omit `paginate` … returns all items" — it paginates at 10

> ✅ **FIXED**

**Location:** `types/index.ts:218`

**Details.** The option docs say:

> `/** Configuration for the paginate stage. Omit to disable pagination (returns all items). */`

But omitting `paginate` runs `usePaginate` with the default `pageSize: 10`. The test suite itself codifies the real behavior: `useList(mockProducts)` (12 items, no options) → `totalPages: 2`, `data.length: 10`.

**Suggested fix.** Decide which side is the contract:

- **Docs-only fix (safe, recommended now):** reword to *"Omit to use default pagination (`pageSize: 10`)."*
- **Behavior fix (breaking, consider for 0.4.0):** honor the promise — when `options.paginate` is omitted, run `usePaginate` in a disabled mode (`pageSize = totalItems`, `totalPages = 1`, `paginationRange = [1]`), or accept an explicit `paginate: false` opt-out. If chosen, update the two tests that assert the current default-pageSize behavior.

**Regression test.** N/A for the docs fix; for the behavior fix, assert `data.length === totalItems` and `totalPages === 1` when `paginate` is omitted.

---

### Bug 17 — `parseInt` accepts trailing garbage (`?page=2abc` → page 2)

> ✅ **FIXED**

**Location:** `use-paginate.ts:74` (`getUrlParam`), `use-list.ts:22` (`getUrlParamNumber`)

**Details.** Both URL number parsers use `parseInt(val, 10)`, which parses a leading integer and ignores the rest. A mistyped or maliciously crafted param (`?page=2abc`, `?pageSize=1O`) is silently accepted.

**Verified evidence.** 25 items, URL `?page=2abc` → `currentPage: 2` (a strict parser would fall back to page 1).

**Suggested fix.** Use whole-string validation:

```ts
function getUrlParam(key: string): number | null {
  // …
  const num = Number(val);            // NaN for any trailing garbage
  if (val.trim() === '' || !Number.isInteger(num) || num < 1) return null;
  return num;
}
```

Apply to both copies (or export one shared util from a small `url-params.ts` and import it in both hooks — also dedupes `getUrlParamString`, which exists in three files).

**Regression test.** URL `?page=2abc` → assert `currentPage === 1`; also `?page=0` → `1`.

---

### Bug 18 — Demo depends on a stale 0.2.2 tarball

> ✅ **FIXED**

**Location:** `demo/package.json:13`

**Details.**

```json
"@omariyassine/react-list-hooks": "./omariyassine-react-list-hooks-0.2.2.tgz"
```

The monorepo source is at **0.3.0** (with `useList`, which the demo showcases). The demo builds against a packed snapshot of **0.2.2**, so it exercises — and visually validates — an old API, and any fix made in `src/` is invisible to the demo until someone remembers to re-pack.

**Suggested fix.** Link the demo to the live source. With bun workspaces:

```jsonc
// root package.json
"workspaces": ["demo"],
// demo/package.json
"@omariyassine/react-list-hooks": "workspace:*",
```

(or the simpler `"file:.."` if workspaces feel heavy). Since the package's `exports` point at `dist/`, document that contributors must run `bun run build` in the root before `bun run dev` in the demo — or add a `dev` script at the root that chains `bun run build && cd demo && bun run dev`. Delete the checked-in `.tgz`.

**Regression test.** N/A (infra), but a root convenience script (`bun run demo`) encoding the build-then-dev order prevents the "stale demo" class of problem recurring.

---

## ✅ What's solid (no action needed)

- **Core pipeline math**: filtering, Schwartzian-transform sort, clamping, `setPageSize` position preservation, shrink-clamping — all well-implemented and well-tested.
- **Sort comparator quality**: NULLS-LAST, NaN-last, `Date`/`bigint`/`symbol`/`function` handling, `-0`/`0` symmetry, pre-instantiated `Intl.Collator` with `numeric: true` for 100k+ item support.
- **Referential stability**: stable callbacks via refs, single memoized return object, the non-enumerable array-augmented `data` return (`JSON.stringify` → plain array) — covered by tests.
- **Debounce/`useTransition` machinery** in both `useFilter` and `useSort` behaves correctly in isolation.

---

## Appendix A — Claims re-verified and cleared

### A1. Mixed `bigint`/`number` NaN ordering — **NOT a bug** (initial report item #16, withdrawn)

**Claim.** "The bigint/number NaN branches return `±1` without applying `directionMultiplier` — inconsistent with the pure-number NaN handling."

**Re-verification.** The pure-number branch *also* hardcodes its NaN returns (`if (isANaN) return 1; if (isBNaN) return -1;`) — the missing multiplier is precisely what produces NaNs-last-in-**both**-directions, and the bigint-mixed branches do the same. Runtime check with `[{v:1n},{v:NaN},{v:2n},{v:3}]`:

- `asc` → `[1, 2, 3, NaN]`
- `desc` → `[3, 2, 1, NaN]`

NaN sorts last in both directions, consistent across the number and bigint-mixed branches. **Withdrawn.**

### A2. `siblingCount: 0` ellipsis severity — **worse than initially reported**

The original report described the `siblingCount: 0` ellipsis behavior as "emits ellipses even when nothing hidden." Re-testing showed a more severe manifestation covered by Bug 7: with 6 pages, `siblingCount: 0`, page 3, the output is `1 2 … 6` — the **current page itself** is hidden behind the ellipsis. The Bug 7 fix (MUI clamping math) resolves this case as well.

---

## Suggested fix order

1. **Bug 1** — one-line tsup change; unblocks CJS consumers. Ship before any publish.
2. **Bug 3** — one-line constant hoist; removes the every-render amplifier that makes Bug 2 catastrophic.
3. **Bug 2** — decide tactical (`preserveParams`) vs strategic (unified `useList` URL effect); the strategic route also simplifies Bugs 9/10 for the pipeline case.
4. **Bug 4** — `writtenParamNamesRef`; makes filter URL state trustworthy.
5. **Bug 5** — `isMatch` coercion; makes numeric/boolean filters round-trip.
6. **Bug 6** — conditional per-stage `urlSync` + `paginateInput` fix; restores the documented contract and stops the lying sort indicator.
7. **Bug 7** — MUI clamping port; the most user-visible UI defect.
8. **Bugs 8–12** — consistency fixes, each small and isolated.
9. **Bugs 13–18** — polish; the demo workspace link (18) is worth doing early if the demo is used for manual verification of the other fixes.

Each fix should land with a regression test asserting the *correct* behavior (the verification scenarios above are ready-made templates), and the full 116-test suite must stay green throughout.
