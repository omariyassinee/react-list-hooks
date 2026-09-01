import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useFilter } from './use-filter';
import { useSort } from './use-sort';
import { usePaginate } from './use-paginate';

import type { FilterKey, ListUrlSyncOptions, UseListOptions, UseListReturn } from './types';

function getUrlParamString(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try {
		const searchParams = new URLSearchParams(window.location.search);
		return searchParams.get(key);
	} catch {
		return null;
	}
}

function getUrlParamNumber(key: string): number | null {
	const val = getUrlParamString(key);
	if (val === null) return null;
	const num = parseInt(val, 10);
	return Number.isNaN(num) ? null : num;
}

export function useList<T, K extends string = string>(
	items: T[],
	options?: UseListOptions<T, K>,
): UseListReturn<T, K> {
	type ActualKey = K | FilterKey<T>;

	// ─── Parse unified URL sync config ─────────────────────────────────────
	const urlSyncConfig: ListUrlSyncOptions<ActualKey> =
		typeof options?.urlSync === 'object' ? options.urlSync : { enabled: Boolean(options?.urlSync) };

	const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

	// Filter URL params
	const queryParam = urlSyncConfig.queryParam ?? 'q';
	const filterParamMap = urlSyncConfig.filterParamMap ?? {};

	// Sort URL params
	const sortKeyParam = urlSyncConfig.sortKeyParam ?? 'sortBy';
	const directionParam = urlSyncConfig.directionParam ?? 'sortDir';

	// Paginate URL params
	const pageParam = urlSyncConfig.pageParam ?? 'page';
	const pageSizeParam = urlSyncConfig.pageSizeParam ?? 'pageSize';
	const syncPageSize = urlSyncConfig.syncPageSize ?? true;

	// ─── Build per-hook URL sync configs (delegated to each hook) ──────────
	const filterUrlSync = useMemo(
		() =>
			isUrlSyncEnabled
				? {
						enabled: true,
						queryParam,
						paramMap: filterParamMap as Record<string, string>,
						historyMode,
						keepOtherParams,
					}
				: false,
		[isUrlSyncEnabled, queryParam, filterParamMap, historyMode, keepOtherParams],
	);

	const sortUrlSync = useMemo(
		() =>
			isUrlSyncEnabled
				? {
						enabled: true,
						sortKeyParam,
						directionParam,
						historyMode,
						keepOtherParams,
					}
				: false,
		[isUrlSyncEnabled, sortKeyParam, directionParam, historyMode, keepOtherParams],
	);

	const paginateUrlSync = useMemo(
		() =>
			isUrlSyncEnabled
				? {
						enabled: true,
						pageParam,
						pageSizeParam,
						syncPageSize,
						historyMode,
						keepOtherParams,
					}
				: false,
		[isUrlSyncEnabled, pageParam, pageSizeParam, syncPageSize, historyMode, keepOtherParams],
	);

	// ─── Stage 1: Filter ───────────────────────────────────────────────────
	const filterResult = useFilter<T, K>(items, {
		...options?.filter,
		urlSync: filterUrlSync,
	} as Parameters<typeof useFilter<T, K>>[1]);

	const {
		filteredItems,
		query,
		setQuery: rawSetQuery,
		filters,
		setFilter: rawSetFilter,
		clearFilter: rawClearFilter,
		clearFilters: rawClearFilters,
		clearAll: rawClearAll,
		isFiltering,
	} = filterResult;

	// ─── Stage 2: Sort ─────────────────────────────────────────────────────
	const sortInput = options?.sort !== undefined ? filteredItems : items;

	const sortResult = useSort<T>(sortInput, {
		...options?.sort,
		urlSync: sortUrlSync,
	});

	const {
		sortedItems,
		sortKey,
		sortDirection,
		setSort: rawSetSort,
		toggleSort: rawToggleSort,
		clearSort: rawClearSort,
		getSortIndicator,
		isSorting,
	} = sortResult;

	// ─── Stage 3: Paginate ─────────────────────────────────────────────────
	const paginateInput =
		options?.sort !== undefined ? sortedItems : options?.filter !== undefined ? filteredItems : items;

	// Read initial page from URL if url sync is enabled, so we can honor it on first render
	const initialPageFromUrl = useMemo(() => {
		if (!isUrlSyncEnabled) return undefined;
		const fromUrl = getUrlParamNumber(pageParam);
		return fromUrl !== null ? fromUrl : undefined;
	}, []);

	const data = usePaginate<T>(paginateInput, {
		...options?.paginate,
		initialPage: initialPageFromUrl ?? options?.paginate?.initialPage,
		urlSync: paginateUrlSync,
	});

	// ─── Automatic page-1 reset on filter/sort change ──────────────────────
	const prevFilteredCountRef = useRef(filteredItems.length);
	const prevSortKeyRef = useRef(sortKey);
	const prevSortDirectionRef = useRef(sortDirection);
	const prevQueryRef = useRef(query);
	const prevFiltersRef = useRef(filters);
	const isFirstRenderRef = useRef(true);

	useEffect(() => {
		// Skip the first render — don't reset on mount
		if (isFirstRenderRef.current) {
			isFirstRenderRef.current = false;
			prevFilteredCountRef.current = filteredItems.length;
			prevSortKeyRef.current = sortKey;
			prevSortDirectionRef.current = sortDirection;
			prevQueryRef.current = query;
			prevFiltersRef.current = filters;
			return;
		}

		const queryChanged = prevQueryRef.current !== query;
		const filtersChanged = prevFiltersRef.current !== filters;
		const sortKeyChanged = prevSortKeyRef.current !== sortKey;
		const sortDirectionChanged = prevSortDirectionRef.current !== sortDirection;

		prevFilteredCountRef.current = filteredItems.length;
		prevSortKeyRef.current = sortKey;
		prevSortDirectionRef.current = sortDirection;
		prevQueryRef.current = query;
		prevFiltersRef.current = filters;

		if (queryChanged || filtersChanged || sortKeyChanged || sortDirectionChanged) {
			data.goToStart();
		}
	}, [query, filters, sortKey, sortDirection, filteredItems.length, data]);

	// ─── Wrapped callbacks that trigger page-1 reset ───────────────────────
	// The page-1 reset is handled reactively via the useEffect above,
	// so these wrappers simply delegate to the underlying hooks.

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
		data.goToStart();
	}, [rawClearAll, rawClearSort, data]);

	// ─── Aggregate isProcessing ────────────────────────────────────────────
	const isProcessing = isFiltering || isSorting;

	// ─── Return memoized result ────────────────────────────────────────────
	return useMemo(
		() => ({
			// Pipeline output
			data,

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
			currentPage: data.currentPage,
			totalPages: data.totalPages,
			totalItems: data.totalItems,
			pageSize: data.pageSize,
			hasNext: data.hasNext,
			hasPrev: data.hasPrev,
			next: data.next,
			prev: data.prev,
			goToPage: data.goToPage,
			goToStart: data.goToStart,
			goToEnd: data.goToEnd,
			setPageSize: data.setPageSize,
			pageNumbers: data.pageNumbers,
			paginationRange: data.paginationRange,

			// Pipeline metadata
			filteredCount: filteredItems.length,
			isProcessing,

			// Unified actions
			resetAll,
		}),
		[
			data,
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
