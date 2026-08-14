import { useCallback, useMemo, useRef, useState } from 'react';
import type { UseSortOptions, UseSortReturn, SortDirection } from './types';

// A smart default comparator that handles strings, numbers, booleans, dates, and null/undefined values
function compareValues(valueA: unknown, valueB: unknown, directionMultiplier: number): number {
	if (typeof valueA === 'string' && typeof valueB === 'string') {
		return (
			valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' }) * directionMultiplier
		);
	}

	if (valueA instanceof Date && valueB instanceof Date) {
		return (valueA.getTime() - valueB.getTime()) * directionMultiplier;
	}

	if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
		return ((valueA ? 1 : 0) - (valueB ? 1 : 0)) * directionMultiplier;
	}

	if (typeof valueA === 'number' && typeof valueB === 'number') {
		const isANaN = Number.isNaN(valueA);
		const isBNaN = Number.isNaN(valueB);
		if (isANaN && isBNaN) return 0;
		if (isANaN) return 1;
		if (isBNaN) return -1;
		return (valueA - valueB) * directionMultiplier;
	}

	if (typeof valueA === 'bigint' || typeof valueB === 'bigint') {
		if (typeof valueA === 'bigint' && typeof valueB === 'bigint') {
			if (valueA < valueB) return -1 * directionMultiplier;
			if (valueA > valueB) return 1 * directionMultiplier;
			return 0;
		}
		if (typeof valueA === 'bigint' && typeof valueB === 'number') {
			if (Number.isNaN(valueB)) return -1;
			const numA = Number(valueA);
			if (numA < valueB) return -1 * directionMultiplier;
			if (numA > valueB) return 1 * directionMultiplier;
			return 0;
		}
		if (typeof valueA === 'number' && typeof valueB === 'bigint') {
			if (Number.isNaN(valueA)) return 1;
			const numB = Number(valueB);
			if (valueA < numB) return -1 * directionMultiplier;
			if (valueA > numB) return 1 * directionMultiplier;
			return 0;
		}
		return String(valueA).localeCompare(String(valueB)) * directionMultiplier;
	}

	if (typeof valueA === 'function' || typeof valueB === 'function') {
		if (typeof valueA === 'function' && typeof valueB === 'function') {
			return (valueA.name || '').localeCompare(valueB.name || '') * directionMultiplier;
		}
		return typeof valueA === 'function' ? 1 : -1;
	}

	if (typeof valueA === 'symbol' && typeof valueB === 'symbol') {
		return (valueA.description ?? '').localeCompare(valueB.description ?? '') * directionMultiplier;
	}

	if (typeof valueA === 'object' && typeof valueB === 'object' && valueA !== null && valueB !== null) {
		return String(valueA).localeCompare(String(valueB)) * directionMultiplier;
	}

	if (valueA !== null && valueA !== undefined && valueB !== null && valueB !== undefined) {
		if (typeof valueA === 'symbol' || typeof valueB === 'symbol') {
			return String(valueA).localeCompare(String(valueB)) * directionMultiplier;
		}
		if (valueA < valueB) return -1 * directionMultiplier;
		if (valueA > valueB) return 1 * directionMultiplier;
	}
	return 0;
}

function defaultSortCompare<T>(a: T, b: T, key: keyof T, directionMultiplier: number): number {
	const valueA = a[key];
	const valueB = b[key];

	const isANullish = valueA === null || valueA === undefined;
	const isBNullish = valueB === null || valueB === undefined;

	// Both null/undefined are equal
	if (isANullish && isBNullish) return 0;
	// Push single null/undefined to the bottom (NULLS LAST in both asc and desc)
	if (isANullish) return 1;
	if (isBNullish) return -1;

	return compareValues(valueA, valueB, directionMultiplier);
}

export function useSort<T>(items: T[], options?: UseSortOptions<T>): UseSortReturn<T> {
	const comparatorsRef = useRef(options?.comparators);
	comparatorsRef.current = options?.comparators;

	const [sortState, setSortState] = useState<{
		key: keyof T | null;
		direction: SortDirection | null;
	}>(() => {
		const key = options?.initialKey ?? null;
		const direction =
			options?.initialDirection !== undefined ? options.initialDirection : key !== null ? 'asc' : null;
		return {
			key: direction !== null ? key : null,
			direction: key !== null ? direction : null,
		};
	});

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
			if (prev.key !== key || prev.direction === null) {
				return { key, direction: 'asc' };
			}

			if (prev.direction === 'asc') {
				return { key, direction: 'desc' };
			}

			return { key: null, direction: null };
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
		const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
		const comparator = customComparator
			? (a: T, b: T) => customComparator(a, b) * directionMultiplier
			: (a: T, b: T) => defaultSortCompare(a, b, sortKey, directionMultiplier);

		// Use slice to avoid mutating the original source array
		return [...items].sort(comparator);
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
