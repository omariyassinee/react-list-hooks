import { useCallback, useEffect, useMemo, useRef } from "react";

import { getUrlParamNumber } from "./url-params";
import { usePaginate } from "./use-paginate";
import { useFilter } from "./use-filter";
import { useSort } from "./use-sort";

import type {
  FilterKey,
  ListUrlSyncOptions,
  UseListOptions,
  UseListReturn,
} from "./types";

// Identity-stable empty map — a `?? {}` inline default would create a new object
// every render, destabilizing the filterUrlSync memo and re-running the filter
// URL-sync effect on every host render (see BUGS.md #3).
const EMPTY_PARAM_MAP: Record<string, string> = {};

export function useList<T, K extends string = string>(
  items: T[],
  options?: UseListOptions<T, K>,
): UseListReturn<T, K> {
  type ActualKey = K | FilterKey<T>;

  // ─── Parse unified URL sync config ─────────────────────────────────────
  const urlSyncConfig: ListUrlSyncOptions<ActualKey> =
    typeof options?.urlSync === "object"
      ? options.urlSync
      : { enabled: Boolean(options?.urlSync) };

  const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
  const historyMode = urlSyncConfig.historyMode ?? "replace";
  const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

  // Filter URL params
  const queryParam = urlSyncConfig.queryParam ?? "q";
  const filterParamMap = urlSyncConfig.filterParamMap ?? EMPTY_PARAM_MAP;

  // Sort URL params
  const sortKeyParam = urlSyncConfig.sortKeyParam ?? "sortBy";
  const directionParam = urlSyncConfig.directionParam ?? "sortDir";

  // Paginate URL params
  const pageParam = urlSyncConfig.pageParam ?? "page";
  const pageSizeParam = urlSyncConfig.pageSizeParam ?? "pageSize";
  const syncPageSize = urlSyncConfig.syncPageSize ?? true;

  // ─── Build per-hook URL sync configs (delegated to each hook) ──────────
  // A stage's URL sync is only enabled when that stage is configured —
  // "omit to disable" must hold for URL restoration too, otherwise an
  // omitted stage reads its params from the URL and reports state that is
  // never applied to the data (see BUGS.md #6).
  const isFilterStageEnabled = options?.filter !== undefined;
  const isSortStageEnabled = options?.sort !== undefined;
  const isPaginateStageEnabled = options?.paginate !== undefined;

  // Params owned by each stage — used to populate preserveParams so that
  // keepOtherParams:false doesn't let stages wipe each other's URL state
  // (see BUGS.md #2).
  const filterParamNames = useMemo(() => {
    const paramMap = filterParamMap as Record<string, string | undefined>;
    const names = new Set<string>([queryParam]);
    for (const [filterKey, mapped] of Object.entries(paramMap)) {
      names.add(mapped ?? filterKey);
    }
    // Unmapped declared filter keys round-trip under their own name
    for (const key of Object.keys(options?.filter?.initialFilters ?? {})) {
      names.add(paramMap[key] ?? key);
    }
    return Array.from(names);
  }, [queryParam, filterParamMap, options?.filter?.initialFilters]);

  const sortParamNames = useMemo(
    () => [sortKeyParam, directionParam],
    [sortKeyParam, directionParam],
  );
  const paginateParamNames = useMemo(
    () => (syncPageSize ? [pageParam, pageSizeParam] : [pageParam]),
    [pageParam, pageSizeParam, syncPageSize],
  );

  const filterUrlSync = useMemo(
    () =>
      isUrlSyncEnabled && isFilterStageEnabled
        ? {
            enabled: true,
            queryParam,
            paramMap: filterParamMap as Record<string, string>,
            // Round-trip unmapped filter keys that are declared in
            // initialFilters — the common pipeline case (see BUGS.md #11).
            restoreKeys: Object.keys(
              options?.filter?.initialFilters ?? {},
            ) as Array<ActualKey>,
            historyMode,
            keepOtherParams,
            preserveParams: [...sortParamNames, ...paginateParamNames],
          }
        : false,
    [
      isUrlSyncEnabled,
      isFilterStageEnabled,
      queryParam,
      filterParamMap,
      options?.filter?.initialFilters,
      historyMode,
      keepOtherParams,
      sortParamNames,
      paginateParamNames,
    ],
  );

  const sortUrlSync = useMemo(
    () =>
      isUrlSyncEnabled && isSortStageEnabled
        ? {
            enabled: true,
            sortKeyParam,
            directionParam,
            historyMode,
            keepOtherParams,
            preserveParams: [...filterParamNames, ...paginateParamNames],
          }
        : false,
    [
      isUrlSyncEnabled,
      isSortStageEnabled,
      sortKeyParam,
      directionParam,
      historyMode,
      keepOtherParams,
      filterParamNames,
      paginateParamNames,
    ],
  );

  const paginateUrlSync = useMemo(
    () =>
      isUrlSyncEnabled && isPaginateStageEnabled
        ? {
            enabled: true,
            pageParam,
            pageSizeParam,
            syncPageSize,
            historyMode,
            keepOtherParams,
            preserveParams: [...filterParamNames, ...sortParamNames],
          }
        : false,
    [
      isUrlSyncEnabled,
      isPaginateStageEnabled,
      pageParam,
      pageSizeParam,
      syncPageSize,
      historyMode,
      keepOtherParams,
      filterParamNames,
      sortParamNames,
    ],
  );

  // ─── Stage 1: Filter ───────────────────────────────────────────────────
  const filterResult = useFilter<T, K>(items, {
    ...options?.filter,
    urlSync: filterUrlSync,
  } as Parameters<typeof useFilter<T, K>>[1]);

  // Namespaced filter stage result: filteredItems + state + methods
  const filteredItems = filterResult.filteredItems;
  const { appliedQuery, query, filters, isFiltering } = filterResult.state;
  const {
    setQuery: rawSetQuery,
    setFilter: rawSetFilter,
    clearFilter: rawClearFilter,
    clearFilters: rawClearFilters,
    clearAll: rawClearAll,
  } = filterResult.methods;

  // ─── Stage 2: Sort ─────────────────────────────────────────────────────
  const sortInput = isFilterStageEnabled ? filteredItems : items;

  const sortResult = useSort<T>(sortInput, {
    ...options?.sort,
    urlSync: sortUrlSync,
  });

  // Namespaced sort stage result: sortedItems + state + methods
  const sortedItems = sortResult.sortedItems;
  const {
    sortKey,
    sortDirection,
    activeSortKey,
    activeSortDirection,
    isSorting,
  } = sortResult.state;
  const {
    setSort: rawSetSort,
    toggleSort: rawToggleSort,
    clearSort: rawClearSort,
    getSortIndicator,
  } = sortResult.methods;

  // ─── Stage 3: Paginate ─────────────────────────────────────────────────
  // Consume the sort output whenever the sort hook is actually sorting —
  // keying off `options.sort !== undefined` alone would discard the sorted
  // output if sort state originates elsewhere (see BUGS.md #6).
  const paginateInput =
    activeSortKey !== null
      ? sortedItems
      : isFilterStageEnabled
        ? filteredItems
        : items;

  // Read initial page from URL if url sync is enabled AND the paginate stage
  // is configured — an omitted stage must not read its params from the URL
  // (see BUGS.md #6).
  // biome-ignore lint/correctness/useExhaustiveDependencies: <!-->
  const initialPageFromUrl = useMemo(() => {
    if (!isUrlSyncEnabled || !isPaginateStageEnabled) return undefined;
    const fromUrl = getUrlParamNumber(pageParam);
    return fromUrl !== null ? fromUrl : undefined;
  }, []);

  const data = usePaginate<T>(paginateInput, {
    ...options?.paginate,
    initialPage: initialPageFromUrl ?? options?.paginate?.initialPage,
    urlSync: paginateUrlSync,
  });

  // Stable paginate callbacks (useCallback([], …) inside usePaginate) —
  // depending on these instead of `data` keeps the page-reset effect below
  // from re-running on every page/items/pageSize identity change, and makes
  // resetAll identity-stable.
  const { goToStart, resetPageSize } = data.methods;

  // ─── Automatic page-1 reset on filter/sort change ──────────────────────
  // Track the *applied* (post-debounce) pipeline inputs so the page resets
  // when the data actually changes, not when the live state flips (see
  // BUGS.md #14: with a debounced sort, the live key resets the page while
  // the user is still looking at the old ordering).
  const prevAppliedQueryRef = useRef(appliedQuery);
  const prevActiveSortKeyRef = useRef(activeSortKey);
  const prevActiveSortDirectionRef = useRef(activeSortDirection);
  const prevFiltersRef = useRef(filters);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Skip the first render — don't reset on mount
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevAppliedQueryRef.current = appliedQuery;
      prevActiveSortKeyRef.current = activeSortKey;
      prevActiveSortDirectionRef.current = activeSortDirection;
      prevFiltersRef.current = filters;
      return;
    }

    const queryChanged = prevAppliedQueryRef.current !== appliedQuery;
    const filtersChanged = prevFiltersRef.current !== filters;
    const sortKeyChanged = prevActiveSortKeyRef.current !== activeSortKey;
    const sortDirectionChanged =
      prevActiveSortDirectionRef.current !== activeSortDirection;

    prevAppliedQueryRef.current = appliedQuery;
    prevActiveSortKeyRef.current = activeSortKey;
    prevActiveSortDirectionRef.current = activeSortDirection;
    prevFiltersRef.current = filters;

    if (
      queryChanged ||
      filtersChanged ||
      sortKeyChanged ||
      sortDirectionChanged
    ) {
      goToStart();
    }
  }, [appliedQuery, filters, activeSortKey, activeSortDirection, goToStart]);

  // ─── Wrapped callbacks ─────────────────────────────────────────────────
  // The page-1 reset is handled reactively via the useEffect above,
  // so these simply delegate to the underlying hooks.

  const setQuery = rawSetQuery;
  const setFilter = rawSetFilter;
  const clearFilter = rawClearFilter;
  const clearFilters = rawClearFilters;

  const setSort = rawSetSort;
  const toggleSort = rawToggleSort;
  const clearSort = rawClearSort;

  // ─── Unified resetAll ──────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    rawClearAll();
    rawClearSort();
    goToStart();
    // Restore the initial pageSize too — "reset all" that skips a core
    // paginate option is surprising (see BUGS.md #15).
    resetPageSize();
  }, [rawClearAll, rawClearSort, goToStart, resetPageSize]);

  // ─── Aggregate isProcessing ────────────────────────────────────────────
  const isProcessing = isFiltering || isSorting;

  // ─── Return memoized result ────────────────────────────────────────────
  return useMemo(
    () => ({
      // Pipeline stage outputs
      data,
      filter: filterResult,
      sort: sortResult,

      // Filter access
      query,
      setQuery,
      filters,
      setFilter,
      clearFilter,
      clearFilters,

      // Sort access
      sortKey,
      sortDirection,
      setSort,
      toggleSort,
      clearSort,
      getSortIndicator,

      // Paginate access (proxied for convenience)
      currentPage: data.state.currentPage,
      totalPages: data.state.totalPages,
      totalItems: data.state.totalItems,
      pageSize: data.state.pageSize,
      hasNext: data.state.hasNext,
      hasPrev: data.state.hasPrev,
      next: data.methods.next,
      prev: data.methods.prev,
      goToPage: data.methods.goToPage,
      goToStart: data.methods.goToStart,
      goToEnd: data.methods.goToEnd,
      setPageSize: data.methods.setPageSize,
      resetPageSize: data.methods.resetPageSize,
      pageNumbers: data.state.pageNumbers,
      paginationRange: data.state.paginationRange,

      // Pipeline metadata
      filteredCount: filteredItems.length,
      isProcessing,

      // Unified actions
      resetAll,
    }),
    [
      data,
      filterResult,
      sortResult,
      query,
      setQuery,
      filters,
      setFilter,
      clearFilter,
      clearFilters,
      sortKey,
      sortDirection,
      setSort,
      toggleSort,
      clearSort,
      getSortIndicator,
      filteredItems.length,
      isProcessing,
      resetAll,
    ],
  );
}
