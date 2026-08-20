import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { UseSortOptions, UseSortReturn, SortDirection, SortUrlSyncOptions } from './types';

// Pre-instantiated Intl.Collator for high-performance natural sorting (avoids creating options objects during 100k+ comparisons)
const defaultCollator =
	typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
		? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
		: null;

// A smart default comparator that handles strings, numbers, booleans, dates, and null/undefined values
function compareValues(valueA: unknown, valueB: unknown, directionMultiplier: number): number {
	if (typeof valueA === 'string' && typeof valueB === 'string') {
		const result = defaultCollator ? defaultCollator.compare(valueA, valueB) : valueA.localeCompare(valueB);
		return result * directionMultiplier;
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

interface DecoratedSortItem<T> {
	item: T;
	val: unknown;
	index: number;
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

function getInitialSortState<T>(
	options?: UseSortOptions<T>,
	isUrlSyncEnabled?: boolean,
	sortKeyParam: string = 'sortBy',
	directionParam: string = 'sortDir',
): { key: keyof T | null; direction: SortDirection | null } {
	let key: keyof T | null = options?.initialKey ?? null;
	let direction: SortDirection | null =
		options?.initialDirection !== undefined ? options.initialDirection : key !== null ? 'asc' : null;

	if (isUrlSyncEnabled && typeof window !== 'undefined') {
		const keyFromUrl = getUrlParamString(sortKeyParam);
		const dirFromUrl = getUrlParamString(directionParam);

		if (keyFromUrl !== null) {
			key = keyFromUrl as keyof T;
			if (dirFromUrl === 'asc' || dirFromUrl === 'desc') {
				direction = dirFromUrl;
			} else {
				direction = 'asc';
			}
		}
	}

	return {
		key: direction !== null ? key : null,
		direction: key !== null ? direction : null,
	};
}

export function useSort<T>(items: T[], options?: UseSortOptions<T>): UseSortReturn<T> {
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const comparatorsRef = useRef(options?.comparators);
	comparatorsRef.current = options?.comparators;

	const debounceMs = options?.debounceMs ?? 0;
	const useTransitionOption = Boolean(options?.useTransition);

	const [isPending, startTransition] = useTransition();

	const urlSyncConfig: SortUrlSyncOptions =
		typeof options?.urlSync === 'object' ? options.urlSync : { enabled: Boolean(options?.urlSync) };

	const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
	const sortKeyParam = urlSyncConfig.sortKeyParam ?? 'sortBy';
	const directionParam = urlSyncConfig.directionParam ?? 'sortDir';
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

	const [sortState, setSortState] = useState<{
		key: keyof T | null;
		direction: SortDirection | null;
	}>(() => getInitialSortState(options, isUrlSyncEnabled, sortKeyParam, directionParam));

	const [appliedSortState, setAppliedSortState] = useState(sortState);
	const [isDebouncing, setIsDebouncing] = useState(false);

	const sortKey = sortState.direction === null ? null : sortState.key;
	const sortDirection = sortState.direction;

	const activeSortKey = appliedSortState.direction === null ? null : appliedSortState.key;
	const activeSortDirection = appliedSortState.direction;

	// Refs for stable getSortIndicator callback
	const sortKeyRef = useRef(sortKey);
	sortKeyRef.current = sortKey;
	const sortDirectionRef = useRef(sortDirection);
	sortDirectionRef.current = sortDirection;

	// Handle debounce / transition timing for sorting updates
	useEffect(() => {
		if (
			sortState.key === appliedSortState.key &&
			sortState.direction === appliedSortState.direction
		) {
			setIsDebouncing(false);
			return;
		}

		if (debounceMs <= 0) {
			if (useTransitionOption) {
				startTransition(() => {
					setAppliedSortState(sortState);
				});
			} else {
				setAppliedSortState(sortState);
			}
			setIsDebouncing(false);
			return;
		}

		setIsDebouncing(true);
		const handler = setTimeout(() => {
			if (useTransitionOption) {
				startTransition(() => {
					setAppliedSortState(sortState);
				});
			} else {
				setAppliedSortState(sortState);
			}
			setIsDebouncing(false);
		}, debounceMs);

		return () => {
			clearTimeout(handler);
		};
	}, [sortState, debounceMs, appliedSortState, useTransitionOption]);

	// Sync state to URL search parameters
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		try {
			const currentSearchParams = new URLSearchParams(window.location.search);
			const searchParams = keepOtherParams ? new URLSearchParams(currentSearchParams) : new URLSearchParams();

			if (sortKey !== null && sortDirection !== null) {
				searchParams.set(sortKeyParam, String(sortKey));
				searchParams.set(directionParam, sortDirection);
			} else {
				searchParams.delete(sortKeyParam);
				searchParams.delete(directionParam);
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
	}, [sortKey, sortDirection, isUrlSyncEnabled, sortKeyParam, directionParam, historyMode, keepOtherParams]);

	// Handle popstate
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		const handlePopState = () => {
			const state = getInitialSortState(optionsRef.current, isUrlSyncEnabled, sortKeyParam, directionParam);
			setSortState(state);
			setAppliedSortState(state);
			setIsDebouncing(false);
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [isUrlSyncEnabled, sortKeyParam, directionParam]);

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
		setAppliedSortState({ key: null, direction: null });
		setIsDebouncing(false);
	}, []);

	// Stable callback — reads sort state from refs
	const getSortIndicator = useCallback((key: keyof T): SortDirection | null => {
		return sortKeyRef.current === key ? sortDirectionRef.current : null;
	}, []);

	// Memoized sorted items using the Schwartzian Transform (Decorate-Sort-Undecorate)
	const sortedItems = useMemo(() => {
		if (activeSortKey === null || activeSortDirection === null) {
			return items;
		}

		const len = items.length;
		if (len <= 1) return items;

		const customComparator = comparatorsRef.current?.[activeSortKey];
		const directionMultiplier = activeSortDirection === 'asc' ? 1 : -1;

		// 1. Decorate (Pre-extract sort keys once per item in a single contiguous pass)
		const decorated: Array<DecoratedSortItem<T>> = new Array(len);
		for (let i = 0; i < len; i++) {
			const item = items[i]!;
			decorated[i] = {
				item,
				val: item[activeSortKey],
				index: i,
			};
		}

		// 2. Sort using pre-extracted values
		if (customComparator) {
			decorated.sort((a, b) => {
				const res = customComparator(a.item, b.item) * directionMultiplier;
				return res !== 0 ? res : a.index - b.index;
			});
		} else {
			decorated.sort((a, b) => {
				const valueA = a.val;
				const valueB = b.val;

				const isANullish = valueA === null || valueA === undefined;
				const isBNullish = valueB === null || valueB === undefined;

				// Both null/undefined maintain relative stable order
				if (isANullish && isBNullish) return a.index - b.index;
				// NULLS LAST
				if (isANullish) return 1;
				if (isBNullish) return -1;

				const cmp = compareValues(valueA, valueB, directionMultiplier);
				return cmp !== 0 ? cmp : a.index - b.index;
			});
		}

		// 3. Undecorate (Extract items into pre-allocated result array)
		const result: T[] = new Array(len);
		for (let i = 0; i < len; i++) {
			result[i] = decorated[i]!.item;
		}
		return result;
	}, [items, activeSortKey, activeSortDirection]);

	const isSorting = isDebouncing || isPending;

	return useMemo(
		() => ({
			sortedItems,
			sortKey,
			sortDirection,
			setSort,
			toggleSort,
			clearSort,
			getSortIndicator,
			isSorting,
		}),
		[sortedItems, sortKey, sortDirection, setSort, toggleSort, clearSort, getSortIndicator, isSorting],
	);
}
