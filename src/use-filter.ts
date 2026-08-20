import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

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
	return false;
}

function getUrlParamString(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try {
		const searchParams = new URLSearchParams(window.location.search);
		return searchParams.get(key);
	} catch {
		return null;
	}
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
): Partial<Record<ActualKey, unknown>> {
	const initial = initialFilters ?? {};
	if (!isUrlSyncEnabled || typeof window === 'undefined') return initial;

	try {
		const searchParams = new URLSearchParams(window.location.search);
		const result: Partial<Record<ActualKey, unknown>> = { ...initial };

		for (const [urlKey, urlVal] of searchParams.entries()) {
			for (const [key, mappedName] of Object.entries(paramMap) as Array<[ActualKey, string]>) {
				if (urlKey === mappedName) {
					result[key] = urlVal;
				}
			}
			if (urlKey in initial) {
				(result as Record<string, unknown>)[urlKey] = urlVal;
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

	const searchFieldsRef = useRef(options?.searchFields);
	searchFieldsRef.current = options?.searchFields;

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
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

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
		),
	);

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
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		try {
			const currentSearchParams = new URLSearchParams(window.location.search);
			const searchParams = keepOtherParams ? new URLSearchParams(currentSearchParams) : new URLSearchParams();

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

			// Clean up removed filters from query params
			for (const [filterKey, mappedParam] of Object.entries(paramMap)) {
				const paramName = (mappedParam as string) ?? filterKey;
				if (!activeParamNames.has(paramName)) {
					searchParams.delete(paramName);
				}
			}
			for (const key of Object.keys(filters)) {
				const paramName = paramMap[key as ActualKey] ?? key;
				if (filters[key as ActualKey] === undefined) {
					searchParams.delete(paramName);
				}
			}

			const queryString = searchParams.toString();
			const newSearch = queryString ? `?${queryString}` : '';
			const currentPathWithSearch = window.location.pathname + window.location.search + window.location.hash;
			const targetPathWithSearch = window.location.pathname + newSearch + window.location.hash;

			if (currentPathWithSearch !== targetPathWithSearch) {
				if (historyMode === 'push') {
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
		setFilters({});
	}, []);

	const clearAll = useCallback(() => {
		setQueryState('');
		setAppliedQuery('');
		setIsDebouncing(false);
		setFilters({});
	}, []);

	// Compute search fields: fallback to sample of items with string/number values across items
	const resolvedSearchFields = useMemo<Array<keyof T>>(() => {
		if (searchFieldsRef.current) return searchFieldsRef.current;
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
	}, [items]);

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
				const fieldsToSearch = searchFieldsRef.current ?? resolvedSearchFields;
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
			setQuery,
			filters,
			setFilter,
			clearFilter,
			clearFilters,
			clearAll,
			isFiltering,
		}),
		[filteredItems, query, setQuery, filters, setFilter, clearFilter, clearFilters, clearAll, isFiltering],
	);
}
