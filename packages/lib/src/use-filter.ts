import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { getUrlParamString } from './url-params';

import type { FilterKey, FilterUrlSyncOptions, UseFilterOptions, UseFilterReturn } from './types';

function isMatch(itemVal: unknown, filterVal: unknown): boolean {
	if (Object.is(itemVal, filterVal) || itemVal === filterVal) return true;
	if (itemVal instanceof Date && filterVal instanceof Date) {
		return itemVal.getTime() === filterVal.getTime();
	}
	if (itemVal instanceof Date && (typeof filterVal === 'string' || typeof filterVal === 'number')) {
		const parsed = new Date(filterVal).getTime();
		if (!Number.isNaN(parsed)) return itemVal.getTime() === parsed;
	}
	if (filterVal instanceof Date && (typeof itemVal === 'string' || typeof itemVal === 'number')) {
		const parsed = new Date(itemVal).getTime();
		if (!Number.isNaN(parsed)) return parsed === filterVal.getTime();
	}
	// URL round-trip coercion: filter values restored from the URL arrive as
	// strings. Coerce strictly so `?price=10` matches an item `price: 10`
	// (rejects `'1e2'`, `' 10'`, `'10.0'` for `10`).
	if (typeof itemVal === 'number' && typeof filterVal === 'string' && filterVal.trim() !== '') {
		const n = Number(filterVal);
		if (Number.isFinite(n) && String(n) === filterVal.trim()) return itemVal === n;
	}
	if (typeof itemVal === 'boolean' && (filterVal === 'true' || filterVal === 'false')) {
		return itemVal === (filterVal === 'true');
	}
	return false;
}

function getInitialQuery(
	initialQuery?: string,
	isUrlSyncEnabled?: boolean,
	queryParam: string = 'q',
): string {
	const defaultQuery = initialQuery ?? '';
	if (!isUrlSyncEnabled) return defaultQuery;
	const fromUrl = getUrlParamString(queryParam);
	return fromUrl !== null ? fromUrl : defaultQuery;
}

function getInitialFilters<ActualKey extends string>(
	initialFilters?: Partial<Record<ActualKey, unknown>>,
	isUrlSyncEnabled?: boolean,
	paramMap: Partial<Record<ActualKey, string>> = {},
	restoreKeys?: Array<ActualKey>,
): Partial<Record<ActualKey, unknown>> {
	const initial = initialFilters ?? {};
	if (!isUrlSyncEnabled || typeof window === 'undefined') return initial;

	// Keys eligible for URL restoration: mapped keys, keys pre-declared in
	// initialFilters, and keys explicitly opted in via restoreKeys. Without
	// this, params the hook itself wrote (unmapped keys) would be ignored on
	// refresh — an asymmetric read/write path.
	const restorable = new Set<string>([
		...Object.keys(paramMap),
		...Object.keys(initial),
		...(restoreKeys ?? []),
	]);

	try {
		const searchParams = new URLSearchParams(window.location.search);
		const result: Partial<Record<ActualKey, unknown>> = { ...initial };

		// 1. Mapped keys: URL param name -> filter key (e.g. ?cat=Audio -> category)
		for (const [filterKey, mappedName] of Object.entries(paramMap) as Array<[ActualKey, string]>) {
			const urlVal = searchParams.get(mappedName);
			if (urlVal !== null) {
				result[filterKey] = urlVal;
			}
		}

		// 2. Unmapped keys declared via initialFilters or restoreKeys: URL param
		//    name is the filter key itself (e.g. ?category=Audio -> category).
		for (const key of restorable) {
			if (key in paramMap) continue; // already handled above
			const urlVal = searchParams.get(key);
			if (urlVal !== null) {
				(result as Record<string, unknown>)[key] = urlVal;
			}
		}
		return result;
	} catch {
		return initial;
	}
}

export function useFilter<T, K extends string = string>(
	items: T[],
	options?: UseFilterOptions<T, K>,
): UseFilterReturn<T, K> {
	type ActualKey = K | FilterKey<T>;

	const optionsRef = useRef(options);
	optionsRef.current = options;

	const customFiltersRef = useRef(options?.customFilters);
	customFiltersRef.current = options?.customFilters;

	const debounceMs = options?.debounceMs ?? 0;
	const useTransitionOption = Boolean(options?.useTransition);

	const [isPending, startTransition] = useTransition();

	const urlSyncConfig: FilterUrlSyncOptions<ActualKey> =
		typeof options?.urlSync === 'object' ? options.urlSync : { enabled: Boolean(options?.urlSync) };

	const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
	const queryParam = urlSyncConfig.queryParam ?? 'q';
	const paramMap = useMemo<Partial<Record<ActualKey, string>>>(
		() => (urlSyncConfig.paramMap ?? {}) as Partial<Record<ActualKey, string>>,
		[urlSyncConfig.paramMap],
	);
	const restoreKeys = urlSyncConfig.restoreKeys as Array<ActualKey> | undefined;
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;
	const preserveParams = urlSyncConfig.preserveParams;

	// Latest restoreKeys for the popstate handler (stable across renders)
	const restoreKeysRef = useRef(restoreKeys);
	restoreKeysRef.current = restoreKeys;

	const [query, setQueryState] = useState(() =>
		getInitialQuery(options?.initialQuery, isUrlSyncEnabled, queryParam),
	);
	const [appliedQuery, setAppliedQuery] = useState(query);
	const [isDebouncing, setIsDebouncing] = useState(false);

	const [filters, setFilters] = useState<Partial<Record<ActualKey, unknown>>>(() =>
		getInitialFilters<ActualKey>(
			options?.initialFilters as Partial<Record<ActualKey, unknown>> | undefined,
			isUrlSyncEnabled,
			paramMap,
			restoreKeys,
		),
	);

	// Param names this hook has previously written to the URL. Lets the sync
	// effect delete params for filters that no longer exist in state (e.g.
	// after clearFilter removed the key entirely) — including unmapped keys.
	const writtenParamNamesRef = useRef<Set<string>>(new Set());

	// Handle debounce / transition timing for text query
	useEffect(() => {
		if (query === appliedQuery) {
			setIsDebouncing(false);
			return;
		}

		if (debounceMs <= 0) {
			if (useTransitionOption) {
				startTransition(() => {
					setAppliedQuery(query);
				});
			} else {
				setAppliedQuery(query);
			}
			setIsDebouncing(false);
			return;
		}

		setIsDebouncing(true);
		const handler = setTimeout(() => {
			if (useTransitionOption) {
				startTransition(() => {
					setAppliedQuery(query);
				});
			} else {
				setAppliedQuery(query);
			}
			setIsDebouncing(false);
		}, debounceMs);

		return () => {
			clearTimeout(handler);
		};
	}, [query, debounceMs, appliedQuery, useTransitionOption]);

	// Sync state to URL search parameters
	const isFirstUrlSyncRef = useRef(true);
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		try {
			const currentSearchParams = new URLSearchParams(window.location.search);
			// When keepOtherParams is false, still re-copy params owned by other
			// pipeline stages (populated via preserveParams by useList) so sibling
			// stages don't wipe each other's state.
			const searchParams = new URLSearchParams();
			if (keepOtherParams) {
				for (const [key, value] of currentSearchParams) searchParams.set(key, value);
			} else if (preserveParams) {
				for (const name of preserveParams) {
					const value = currentSearchParams.get(name);
					if (value !== null) searchParams.set(name, value);
				}
			}

			if (appliedQuery.trim()) {
				searchParams.set(queryParam, appliedQuery.trim());
			} else {
				searchParams.delete(queryParam);
			}

			const activeParamNames = new Set<string>();
			for (const [filterKey, filterVal] of Object.entries(filters)) {
				if (filterVal !== undefined && filterVal !== null && filterVal !== '') {
					const paramName = paramMap[filterKey as ActualKey] ?? filterKey;
					searchParams.set(paramName, String(filterVal));
					activeParamNames.add(paramName);
				}
			}

			// Clean up params for filters that are no longer active — including
			// unmapped keys whose entries were deleted from state (clearFilter)
			// and params written under a previous paramMap configuration.
			for (const paramName of writtenParamNamesRef.current) {
				if (!activeParamNames.has(paramName)) {
					searchParams.delete(paramName);
				}
			}
			writtenParamNamesRef.current = activeParamNames;

			const queryString = searchParams.toString();
			const newSearch = queryString ? `?${queryString}` : '';
			const currentPathWithSearch = window.location.pathname + window.location.search + window.location.hash;
			const targetPathWithSearch = window.location.pathname + newSearch + window.location.hash;

			if (currentPathWithSearch !== targetPathWithSearch) {
				// Never push a history entry for the initial normalization write —
				// otherwise mounting with historyMode 'push' pollutes history.
				const mode = isFirstUrlSyncRef.current ? 'replace' : historyMode;
				isFirstUrlSyncRef.current = false;
				if (mode === 'push') {
					window.history.pushState(window.history.state, '', targetPathWithSearch);
				} else {
					window.history.replaceState(window.history.state, '', targetPathWithSearch);
				}
			}
		} catch {
			// Ignore URL manipulation failures in restricted environments
		}
	}, [
		appliedQuery,
		filters,
		isUrlSyncEnabled,
		queryParam,
		paramMap,
		historyMode,
		keepOtherParams,
		preserveParams,
	]);

	// Handle popstate events for back/forward navigation
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		const handlePopState = () => {
			const q = getUrlParamString(queryParam);
			const defaultQuery = optionsRef.current?.initialQuery ?? '';
			const resolvedQuery = q !== null ? q : defaultQuery;
			setQueryState(resolvedQuery);
			setAppliedQuery(resolvedQuery);
			setIsDebouncing(false);

			const currentFilters = getInitialFilters<ActualKey>(
				optionsRef.current?.initialFilters as Partial<Record<ActualKey, unknown>> | undefined,
				isUrlSyncEnabled,
				paramMap,
				restoreKeysRef.current,
			);
			setFilters(currentFilters);
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [isUrlSyncEnabled, queryParam, paramMap]);

	const setQuery = useCallback((newQuery: string) => {
		setQueryState(newQuery);
	}, []);

	const clearFilter = useCallback((key: ActualKey) => {
		setFilters((prev) => {
			if (!(key in prev)) return prev; // no-op when already absent
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const setFilter = useCallback(
		(key: ActualKey, value: unknown) => {
			if (value === undefined) {
				clearFilter(key);
			} else {
				setFilters((prev) => ({
					...prev,
					[key]: value,
				}));
			}
		},
		[clearFilter],
	);

	const clearFilters = useCallback(() => {
		// No-op when nothing is active — avoids a new state identity that would
		// trigger useList's page-reset effect (and a wasted render).
		setFilters((prev) => (Object.keys(prev).length === 0 ? prev : {}));
	}, []);

	const clearAll = useCallback(() => {
		setQueryState((prev) => {
			if (prev !== '') return '';
			return prev;
		});
		setAppliedQuery((prev) => {
			if (prev !== '') return '';
			return prev;
		});
		setIsDebouncing(false);
		setFilters((prev) => (Object.keys(prev).length === 0 ? prev : {}));
	}, []);

	// Compute search fields: fallback to sample of items with string/number values across items
	const searchFieldsProp = options?.searchFields;
	const resolvedSearchFields = useMemo<Array<keyof T>>(() => {
		if (searchFieldsProp) return searchFieldsProp;
		if (items.length === 0) return [];

		const fieldSet = new Set<keyof T>();
		const sampleSize = Math.min(items.length, 20);
		for (let i = 0; i < sampleSize; i++) {
			const item = items[i];
			if (item && typeof item === 'object') {
				for (const key of Object.keys(item)) {
					const val = (item as Record<string, unknown>)[key];
					if (val !== null && val !== undefined && (typeof val === 'string' || typeof val === 'number')) {
						fieldSet.add(key as keyof T);
					}
				}
			}
		}
		return Array.from(fieldSet);
	}, [searchFieldsProp, items]);

	// Memoized filtered items (uses appliedQuery for filtering)
	const filteredItems = useMemo(() => {
		const trimmedQuery = appliedQuery.trim();
		const normalizedQuery = trimmedQuery ? trimmedQuery.toLowerCase() : '';
		const activeFilterEntries = Object.entries(filters).filter(([_, val]) => val !== undefined);

		if (!normalizedQuery && activeFilterEntries.length === 0) {
			return items;
		}

		return items.filter((item) => {
			// 1. Check global text query
			if (normalizedQuery) {
				const fieldsToSearch = resolvedSearchFields;
				const matchesQuery = fieldsToSearch.some((field) => {
					const val = item[field];
					if (val === null || val === undefined) return false;
					return String(val).toLowerCase().includes(normalizedQuery);
				});

				if (!matchesQuery) return false;
			}

			// 2. Check field-specific filters
			for (const [filterKey, filterVal] of activeFilterEntries) {
				const key = filterKey as K;

				// Custom filter predicate
				const customFilter = customFiltersRef.current?.[key];
				if (customFilter) {
					if (!customFilter(item, filterVal)) return false;
					continue;
				}

				// Default exact matching
				const itemVal = (item as Record<string, unknown>)[key];
				if (!isMatch(itemVal, filterVal)) {
					return false;
				}
			}

			return true;
		});
	}, [items, appliedQuery, filters, resolvedSearchFields]);

	const isFiltering = isDebouncing || isPending;

	return useMemo(
		() => ({
			filteredItems,
			query,
			appliedQuery,
			setQuery,
			filters,
			setFilter,
			clearFilter,
			clearFilters,
			clearAll,
			isFiltering,
		}),
		[
			filteredItems,
			query,
			appliedQuery,
			setQuery,
			filters,
			setFilter,
			clearFilter,
			clearFilters,
			clearAll,
			isFiltering,
		],
	);
}
