import { useCallback, useMemo, useRef, useState } from 'react';
import type { UseSortOptions, UseSortReturn, SortDirection } from './types';

// A smart default comparator that handles strings, numbers, booleans, dates, and null/undefined values
function defaultComparator<T>(a: T, b: T, key: keyof T): number {
	const valueA = a[key];
	const valueB = b[key];

	const isANullish = valueA === null || valueA === undefined;
	const isBNullish = valueB === null || valueB === undefined;

	// Both null/undefined are equal
	if (isANullish && isBNullish) return 0;
	// Push single null/undefined to the bottom
	if (isANullish) return 1;
	if (isBNullish) return -1;

	if (typeof valueA === 'string' && typeof valueB === 'string') {
		return valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' });
	}

	if (valueA instanceof Date && valueB instanceof Date) {
		return valueA.getTime() - valueB.getTime();
	}

	if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
		return (valueA ? 1 : 0) - (valueB ? 1 : 0);
	}

	if (typeof valueA === 'number' && typeof valueB === 'number') {
		return valueA - valueB;
	}

	if (typeof valueA === 'object' && typeof valueB === 'object') {
		return String(valueA).localeCompare(String(valueB));
	}

	if (valueA < valueB) return -1;
	if (valueA > valueB) return 1;
	return 0;
}

export function useSort<T>(items: T[], options?: UseSortOptions<T>): UseSortReturn<T> {
	const comparatorsRef = useRef(options?.comparators);
	comparatorsRef.current = options?.comparators;

	const [sortState, setSortState] = useState<{
		key: keyof T | null;
		direction: SortDirection | null;
	}>(() => ({
		key: options?.initialKey ?? null,
		direction: options?.initialDirection ?? (options?.initialKey ? 'asc' : null),
	}));

	const sortKey = sortState.direction === null ? null : sortState.key;
	const sortDirection = sortState.direction;

	const setSort = useCallback((key: keyof T, direction?: SortDirection) => {
		setSortState({
			key,
			direction: direction ?? 'asc',
		});
	}, []);

	const toggleSort = useCallback((key: keyof T) => {
		setSortState((prev) => {
			if (prev.key !== key) {
				return { key, direction: 'asc' };
			}

			if (prev.direction === 'asc') {
				return { key, direction: 'desc' };
			}

			if (prev.direction === 'desc') {
				return { key: null, direction: null };
			}

			return { key, direction: 'asc' };
		});
	}, []);

	const clearSort = useCallback(() => {
		setSortState({ key: null, direction: null });
	}, []);

	const getSortIndicator = useCallback(
		(key: keyof T): SortDirection | null => {
			return sortKey === key ? sortDirection : null;
		},
		[sortKey, sortDirection],
	);

	// Memoized sorted items
	const sortedItems = useMemo(() => {
		if (sortKey === null || sortDirection === null) {
			return items;
		}

		const customComparator = comparatorsRef.current?.[sortKey];
		const comparator = customComparator
			? (a: T, b: T) => customComparator(a, b)
			: (a: T, b: T) => defaultComparator(a, b, sortKey);

		const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

		// Use slice to avoid mutating the original source array
		return [...items].sort((a, b) => comparator(a, b) * directionMultiplier);
	}, [items, sortKey, sortDirection]);

	return useMemo(
		() => ({
			sortedItems,
			sortKey,
			sortDirection,
			setSort,
			toggleSort,
			clearSort,
			getSortIndicator,
		}),
		[sortedItems, sortKey, sortDirection, setSort, toggleSort, clearSort, getSortIndicator],
	);
}
