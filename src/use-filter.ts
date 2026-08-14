import { useCallback, useMemo, useRef, useState } from 'react';

import type { UseFilterOptions, UseFilterReturn } from './types';

export function useFilter<T>(items: T[], options?: UseFilterOptions<T>): UseFilterReturn<T> {
	const customFiltersRef = useRef(options?.customFilters);
	customFiltersRef.current = options?.customFilters;

	const searchFieldsRef = useRef(options?.searchFields);
	searchFieldsRef.current = options?.searchFields;

	const [query, setQuery] = useState(options?.initialQuery ?? '');
	const [filters, setFilters] = useState<Partial<Record<keyof T, unknown>>>(options?.initialFilters ?? {});

	const clearFilter = useCallback((key: keyof T) => {
		setFilters((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const setFilter = useCallback(
		(key: keyof T, value: unknown) => {
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

	// Compute search fields: fallback to all fields with string/number values across items
	const resolvedSearchFields = useMemo<Array<keyof T>>(() => {
		if (searchFieldsRef.current) return searchFieldsRef.current;
		if (items.length === 0) return [];

		const fieldSet = new Set<keyof T>();
		for (const item of items) {
			if (item && typeof item === 'object') {
				for (const key of Object.keys(item)) {
					const val = (item as Record<string, any>)[key];
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
				const key = filterKey as keyof T;

				// Custom filter predicate
				const customFilter = customFiltersRef.current?.[key];
				if (customFilter) {
					if (!customFilter(item, filterVal)) return false;
					continue;
				}

				// Default exact matching
				const itemVal = item[key];
				if (itemVal !== filterVal) {
					return false;
				}
			}

			return true;
		});
	}, [items, query, filters, resolvedSearchFields]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <!-->
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
