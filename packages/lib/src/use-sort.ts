import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { UseSortOptions, UseSortReturn, SortDirection, SortUrlSyncOptions } from './types';

import { getUrlParamString } from './url-params';

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

// ─── Specialized comparators for homogeneous columns ───────────────────────
// When every non-nullish value in the sort column shares one type, the sort
// can use one of these instead of compareValues' per-comparison type-dispatch
// chain (~10 branches × n log n comparisons — the dominant sort cost at
// 100k+ items). Each replicates compareValues' exact semantics for its type,
// including NULLS LAST (nullish always sort after non-nullish, regardless of
// direction) and the original NaN handling for numbers.

function numericComparator<T>(directionMultiplier: number) {
	return (a: DecoratedSortItem<T>, b: DecoratedSortItem<T>): number => {
		const valueA = a.val;
		const valueB = b.val;
		const isANullish = valueA === null || valueA === undefined;
		const isBNullish = valueB === null || valueB === undefined;
		if (isANullish && isBNullish) return a.index - b.index;
		if (isANullish) return 1;
		if (isBNullish) return -1;
		const na = valueA as number;
		const nb = valueB as number;
		const isANaN = Number.isNaN(na);
		const isBNaN = Number.isNaN(nb);
		if (isANaN && isBNaN) return a.index - b.index;
		if (isANaN) return 1;
		if (isBNaN) return -1;
		const cmp = (na - nb) * directionMultiplier;
		return cmp !== 0 ? cmp : a.index - b.index;
	};
}

// Dates are pre-extracted to timestamps during decoration, so this mirrors
// compareValues' Date branch (plain subtraction, no NaN special-casing)
// exactly — including its behavior for invalid dates.
function timestampComparator<T>(directionMultiplier: number) {
	return (a: DecoratedSortItem<T>, b: DecoratedSortItem<T>): number => {
		const valueA = a.val;
		const valueB = b.val;
		const isANullish = valueA === null || valueA === undefined;
		const isBNullish = valueB === null || valueB === undefined;
		if (isANullish && isBNullish) return a.index - b.index;
		if (isANullish) return 1;
		if (isBNullish) return -1;
		const cmp = ((valueA as number) - (valueB as number)) * directionMultiplier;
		return cmp !== 0 ? cmp : a.index - b.index;
	};
}

function stringComparator<T>(directionMultiplier: number) {
	return (a: DecoratedSortItem<T>, b: DecoratedSortItem<T>): number => {
		const valueA = a.val;
		const valueB = b.val;
		const isANullish = valueA === null || valueA === undefined;
		const isBNullish = valueB === null || valueB === undefined;
		if (isANullish && isBNullish) return a.index - b.index;
		if (isANullish) return 1;
		if (isBNullish) return -1;
		const cmp =
			(defaultCollator
				? defaultCollator.compare(valueA as string, valueB as string)
				: (valueA as string).localeCompare(valueB as string)) * directionMultiplier;
		return cmp !== 0 ? cmp : a.index - b.index;
	};
}

function booleanComparator<T>(directionMultiplier: number) {
	return (a: DecoratedSortItem<T>, b: DecoratedSortItem<T>): number => {
		const valueA = a.val;
		const valueB = b.val;
		const isANullish = valueA === null || valueA === undefined;
		const isBNullish = valueB === null || valueB === undefined;
		if (isANullish && isBNullish) return a.index - b.index;
		if (isANullish) return 1;
		if (isBNullish) return -1;
		const cmp = ((valueA ? 1 : 0) - (valueB ? 1 : 0)) * directionMultiplier;
		return cmp !== 0 ? cmp : a.index - b.index;
	};
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
			} else direction = 'asc';
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
	const preserveParams = urlSyncConfig.preserveParams;

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

	// Handle debounce / transition timing for sorting updates
	useEffect(() => {
		if (sortState.key === appliedSortState.key && sortState.direction === appliedSortState.direction) {
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
	// Uses the *applied* (post-debounce) sort state so the URL never claims a
	// sort that isn't yet reflected in sortedItems — consistent with useFilter,
	// which syncs appliedQuery rather than the live query.
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

			if (activeSortKey !== null && activeSortDirection !== null) {
				searchParams.set(sortKeyParam, String(activeSortKey));
				searchParams.set(directionParam, activeSortDirection);
			} else {
				searchParams.delete(sortKeyParam);
				searchParams.delete(directionParam);
			}

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
		activeSortKey,
		activeSortDirection,
		isUrlSyncEnabled,
		sortKeyParam,
		directionParam,
		historyMode,
		keepOtherParams,
		preserveParams,
	]);

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

	const getSortIndicator = useCallback(
		(key: keyof T): SortDirection | null => {
			return sortKey === key ? sortDirection : null;
		},
		[sortKey, sortDirection],
	);

	// Memoized sorted items using the Schwartzian Transform (Decorate-Sort-Undecorate)
	const sortedItems = useMemo(() => {
		if (activeSortKey === null || activeSortDirection === null) {
			return items;
		}

		const len = items.length;
		if (len <= 1) return items;

		const customComparator = comparatorsRef.current?.[activeSortKey];
		const directionMultiplier = activeSortDirection === 'asc' ? 1 : -1;

		// 1. Decorate (Pre-extract sort keys once per item in a single contiguous
		//    pass). While decorating, track type homogeneity among non-nullish
		//    values — a homogeneous column lets step 2 skip compareValues'
		//    per-comparison type-dispatch chain (the dominant sort cost at
		//    100k+ items).
		const decorated: Array<DecoratedSortItem<T>> = new Array(len);
		let allStrings = true;
		let allNumbers = true;
		let allDates = true;
		let allBooleans = true;
		for (let i = 0; i < len; i++) {
			const item = items[i] as T;
			const val = item[activeSortKey];
			decorated[i] = {
				item,
				val,
				index: i,
			};
			if (val !== null && val !== undefined) {
				const type = typeof val;
				if (type !== 'string') allStrings = false;
				if (type !== 'number') allNumbers = false;
				if (type !== 'boolean') allBooleans = false;
				if (!(val instanceof Date)) allDates = false;
			}
		}

		// 2. Sort using pre-extracted values — homogeneous columns get a
		//    specialized comparator; mixed columns fall back to compareValues.
		if (customComparator) {
			decorated.sort((a, b) => {
				const res = customComparator(a.item, b.item) * directionMultiplier;
				return res !== 0 ? res : a.index - b.index;
			});
		} else if (allDates) {
			// Pre-extract timestamps once per item — compareValues would call
			// getTime() twice per comparison.
			for (let i = 0; i < len; i++) {
				const entry = decorated[i] as DecoratedSortItem<T>;
				const val = entry.val;
				if (val !== null && val !== undefined) {
					entry.val = (val as Date).getTime();
				}
			}
			decorated.sort(timestampComparator<T>(directionMultiplier));
		} else if (allNumbers) {
			decorated.sort(numericComparator<T>(directionMultiplier));
		} else if (allStrings) {
			decorated.sort(stringComparator<T>(directionMultiplier));
		} else if (allBooleans) {
			decorated.sort(booleanComparator<T>(directionMultiplier));
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

	// Namespaced return: the sorted data plus `state` (stateful properties)
	// and `methods` (controls) — the shared return contract for all sub hooks.
	return useMemo(
		() =>
			({
				sortedItems,
				state: {
					sortKey,
					sortDirection,
					activeSortKey,
					activeSortDirection,
					isSorting,
				},
				methods: {
					setSort,
					toggleSort,
					clearSort,
					getSortIndicator,
				},
			}) satisfies UseSortReturn<T>,
		[
			sortedItems,
			sortKey,
			sortDirection,
			activeSortKey,
			activeSortDirection,
			isSorting,
			setSort,
			toggleSort,
			clearSort,
			getSortIndicator,
		],
	);
}
