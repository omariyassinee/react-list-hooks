import { useCallback, useMemo, useRef, useState } from 'react';

import type { FilterKey, UseFilterOptions, UseFilterReturn } from './types';

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

export function useFilter<T, K extends string = FilterKey<T>>(
	items: T[],
	options?: UseFilterOptions<T, K>,
): UseFilterReturn<T, K> {
	const customFiltersRef = useRef(options?.customFilters);
	customFiltersRef.current = options?.customFilters;

	const searchFieldsRef = useRef(options?.searchFields);
	searchFieldsRef.current = options?.searchFields;

	const [query, setQuery] = useState(options?.initialQuery ?? '');
	const [filters, setFilters] = useState<Partial<Record<K, unknown>>>(options?.initialFilters ?? {});

	const clearFilter = useCallback((key: K) => {
		setFilters((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const setFilter = useCallback(
		(key: K, value: unknown) => {
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
		setQuery('');
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

	// Memoized filtered items
	const filteredItems = useMemo(() => {
		const trimmedQuery = query.trim();
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
	}, [items, query, filters, resolvedSearchFields]);

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
		}),
		[filteredItems, query, setQuery, filters, setFilter, clearFilter, clearFilters, clearAll],
	);
}
