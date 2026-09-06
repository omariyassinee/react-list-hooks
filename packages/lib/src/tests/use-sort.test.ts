import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useSort } from '../use-sort';

interface User {
	id: number;
	name: string;
	age: number;
	isActive: boolean;
	joined: Date;
}

const mockUsers: User[] = [
	{ id: 1, name: 'Alice', age: 30, isActive: true, joined: new Date('2023-01-01') },
	{ id: 2, name: 'charlie', age: 25, isActive: false, joined: new Date('2023-03-01') },
	{ id: 3, name: 'Bob', age: 35, isActive: true, joined: new Date('2022-06-01') },
];

describe('useSort', () => {
	it('returns items unmodified if no key or direction is specified', () => {
		const { result } = renderHook(() => useSort(mockUsers));
		expect(result.current.sortedItems).toEqual(mockUsers);
		expect(result.current.sortKey).toBeNull();
		expect(result.current.sortDirection).toBeNull();
	});

	it('sorts numbers in ascending and descending directions', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		act(() => result.current.setSort('age', 'asc'));
		expect(result.current.sortedItems.map((u) => u.age)).toEqual([25, 30, 35]);
		expect(result.current.sortKey).toBe('age');
		expect(result.current.sortDirection).toBe('asc');

		act(() => result.current.setSort('age', 'desc'));
		expect(result.current.sortedItems.map((u) => u.age)).toEqual([35, 30, 25]);
		expect(result.current.sortDirection).toBe('desc');
	});

	it('sorts strings case-insensitively using natural comparison', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		// Names: Alice, charlie, Bob -> sorted asc: Alice, Bob, charlie
		act(() => result.current.setSort('name', 'asc'));
		expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Alice', 'Bob', 'charlie']);
	});

	it('sorts dates correctly', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		act(() => result.current.setSort('joined', 'asc'));
		expect(result.current.sortedItems.map((u) => u.id)).toEqual([3, 1, 2]); // Bob (2022), Alice (Jan 2023), Charlie (Mar 2023)
	});

	it('sorts booleans correctly', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		act(() => result.current.setSort('isActive', 'asc')); // false (0) then true (1)
		expect(result.current.sortedItems.map((u) => u.isActive)).toEqual([false, true, true]);
	});

	it('cycles sort state using toggleSort (asc -> desc -> null)', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		act(() => result.current.toggleSort('age'));
		expect(result.current.sortKey).toBe('age');
		expect(result.current.sortDirection).toBe('asc');
		expect(result.current.getSortIndicator('age')).toBe('asc');

		act(() => result.current.toggleSort('age'));
		expect(result.current.sortDirection).toBe('desc');
		expect(result.current.getSortIndicator('age')).toBe('desc');

		act(() => result.current.toggleSort('age'));
		expect(result.current.sortDirection).toBeNull();
		expect(result.current.sortKey).toBeNull();
		expect(result.current.getSortIndicator('age')).toBeNull();
	});

	it('switches sort key and resets direction to asc', () => {
		const { result } = renderHook(() => useSort(mockUsers));

		act(() => result.current.setSort('age', 'desc'));
		expect(result.current.sortKey).toBe('age');
		expect(result.current.sortDirection).toBe('desc');

		act(() => result.current.toggleSort('name'));
		expect(result.current.sortKey).toBe('name');
		expect(result.current.sortDirection).toBe('asc');
	});

	it('uses custom comparator function if provided', () => {
		// Custom comparator that sorts names by string length
		const customComparators = {
			name: (a: User, b: User) => a.name.length - b.name.length,
		};

		const { result } = renderHook(() =>
			useSort(mockUsers, {
				comparators: customComparators,
			}),
		);

		// Alice (5), charlie (7), Bob (3) -> asc sorted by length: Bob (3), Alice (5), charlie (7)
		act(() => result.current.setSort('name', 'asc'));
		expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Bob', 'Alice', 'charlie']);
	});

	it('clears sort state with clearSort()', () => {
		const { result } = renderHook(() => useSort(mockUsers, { initialKey: 'age', initialDirection: 'desc' }));
		expect(result.current.sortKey).toBe('age');

		act(() => result.current.clearSort());
		expect(result.current.sortKey).toBeNull();
		expect(result.current.sortDirection).toBeNull();
		expect(result.current.sortedItems).toEqual(mockUsers);
	});

	it('preserves referential equality of return object when state does not change', () => {
		const { result, rerender } = renderHook(() => useSort(mockUsers));
		const firstReturn = result.current;
		rerender();
		const secondReturn = result.current;
		expect(firstReturn).toBe(secondReturn);
	});

	it('handles sorting with multiple null and undefined values stably and symmetrically', () => {
		interface ItemWithNull {
			id: number;
			score: number | null | undefined;
		}
		const items: ItemWithNull[] = [
			{ id: 1, score: 10 },
			{ id: 2, score: null },
			{ id: 3, score: undefined },
			{ id: 4, score: 5 },
			{ id: 5, score: null },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('score', 'asc'));
		// 5 then 10 then nullish values at the bottom
		expect(result.current.sortedItems.slice(0, 2).map((i) => i.score)).toEqual([5, 10]);
		expect(result.current.sortedItems.slice(2).every((i) => i.score === null || i.score === undefined)).toBe(
			true,
		);
	});

	it('maintains sortedItems referential equality when inline comparators reference changes', () => {
		const { result, rerender } = renderHook(
			({ comparators }) =>
				useSort(mockUsers, {
					initialKey: 'name',
					initialDirection: 'asc',
					comparators,
				}),
			{
				initialProps: {
					comparators: { name: (a: User, b: User) => a.name.length - b.name.length },
				},
			},
		);

		const firstSortedItems = result.current.sortedItems;

		// Rerender with a NEW inline object reference for comparators
		rerender({
			comparators: { name: (a: User, b: User) => a.name.length - b.name.length },
		});

		const secondSortedItems = result.current.sortedItems;
		expect(firstSortedItems).toBe(secondSortedItems);
	});

	it('maintains NULLS LAST in descending sort mode', () => {
		interface ItemWithNull {
			id: number;
			score: number | null | undefined;
		}
		const items: ItemWithNull[] = [
			{ id: 1, score: 10 },
			{ id: 2, score: null },
			{ id: 3, score: undefined },
			{ id: 4, score: 5 },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('score', 'desc'));
		// In desc: 10 then 5, then null and undefined at the bottom
		expect(result.current.sortedItems.slice(0, 2).map((i) => i.score)).toEqual([10, 5]);
		expect(result.current.sortedItems.slice(2).every((i) => i.score === null || i.score === undefined)).toBe(
			true,
		);
	});

	it('handles NaN numbers stably and places them at the bottom', () => {
		const items = [
			{ id: 1, val: 20 },
			{ id: 2, val: NaN },
			{ id: 3, val: 5 },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('val', 'asc'));
		expect(result.current.sortedItems[0]?.val).toBe(5);
		expect(result.current.sortedItems[1]?.val).toBe(20);
		expect(Number.isNaN(result.current.sortedItems[2]?.val)).toBe(true);

		act(() => result.current.setSort('val', 'desc'));
		expect(result.current.sortedItems[0]?.val).toBe(20);
		expect(result.current.sortedItems[1]?.val).toBe(5);
		expect(Number.isNaN(result.current.sortedItems[2]?.val)).toBe(true);
	});

	it('sorts Symbol values without throwing TypeError', () => {
		const symA = Symbol('alpha');
		const symB = Symbol('beta');
		const items = [
			{ id: 1, sym: symB },
			{ id: 2, sym: symA },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('sym', 'asc'));
		expect(result.current.sortedItems.map((i) => i.id)).toEqual([2, 1]);
	});

	it('handles initialKey with initialDirection null consistently', () => {
		const { result } = renderHook(() => useSort(mockUsers, { initialKey: 'name', initialDirection: null }));
		expect(result.current.sortKey).toBeNull();
		expect(result.current.sortDirection).toBeNull();
		expect(result.current.sortedItems).toEqual(mockUsers);
	});

	it('sorts BigInt and mixed BigInt/Number values without throwing TypeError', () => {
		const items = [
			{ id: 1, val: 30n },
			{ id: 2, val: 10 },
			{ id: 3, val: 20n },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('val', 'asc'));
		expect(result.current.sortedItems.map((i) => i.id)).toEqual([2, 3, 1]);

		act(() => result.current.setSort('val', 'desc'));
		expect(result.current.sortedItems.map((i) => i.id)).toEqual([1, 3, 2]);
	});

	it('sorts function values deterministically by function name', () => {
		function alpha() {}
		function beta() {}
		const items = [
			{ id: 1, fn: beta },
			{ id: 2, fn: alpha },
		];

		const { result } = renderHook(() => useSort(items));

		act(() => result.current.setSort('fn', 'asc'));
		expect(result.current.sortedItems.map((i) => i.id)).toEqual([2, 1]);
	});

	it('updates getSortIndicator reference and returned value when sort state changes', () => {
		const { result, rerender } = renderHook(() => useSort(mockUsers));
		const initialGetSortIndicator = result.current.getSortIndicator;

		expect(result.current.getSortIndicator('name')).toBeNull();

		// Referential stability across re-renders when sort state does not change
		rerender();
		expect(result.current.getSortIndicator).toBe(initialGetSortIndicator);

		// Updates reference and value when sorting changes
		act(() => result.current.setSort('name', 'asc'));
		expect(result.current.getSortIndicator('name')).toBe('asc');
		expect(result.current.getSortIndicator).not.toBe(initialGetSortIndicator);
		const ascGetSortIndicator = result.current.getSortIndicator;

		act(() => result.current.toggleSort('name'));
		expect(result.current.getSortIndicator('name')).toBe('desc');
		expect(result.current.getSortIndicator).not.toBe(ascGetSortIndicator);
		const descGetSortIndicator = result.current.getSortIndicator;

		act(() => result.current.clearSort());
		expect(result.current.getSortIndicator('name')).toBeNull();
		expect(result.current.getSortIndicator).not.toBe(descGetSortIndicator);
	});

	// ─── urlSync ──────────────────────────────────────────────────────────────
	describe('urlSync', () => {
		it('reads initial sortKey and direction from URL search params', () => {
			window.history.replaceState({}, '', '?sortBy=age&sortDir=desc');
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					urlSync: true,
				}),
			);

			expect(result.current.sortKey).toBe('age');
			expect(result.current.sortDirection).toBe('desc');
			expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Bob', 'Alice', 'charlie']);
			window.history.replaceState({}, '', '/');
		});

		it('updates URL search params when sorting changes and removes params on clearSort', () => {
			window.history.replaceState({}, '', '/');
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					urlSync: {
						enabled: true,
						sortKeyParam: 'sort',
						directionParam: 'order',
					},
				}),
			);

			act(() => result.current.setSort('name', 'asc'));
			expect(window.location.search).toContain('sort=name');
			expect(window.location.search).toContain('order=asc');

			act(() => result.current.clearSort());
			expect(window.location.search).not.toContain('sort=');
			expect(window.location.search).not.toContain('order=');

			window.history.replaceState({}, '', '/');
		});

		it('handles popstate browser back navigation for sorting', () => {
			window.history.replaceState({}, '', '?sortBy=name&sortDir=asc');
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					urlSync: true,
				}),
			);

			expect(result.current.sortKey).toBe('name');

			// Simulate back button navigating to sortBy age desc
			window.history.replaceState({}, '', '?sortBy=age&sortDir=desc');
			act(() => {
				window.dispatchEvent(new window.Event('popstate'));
			});

			expect(result.current.sortKey).toBe('age');
			expect(result.current.sortDirection).toBe('desc');
			window.history.replaceState({}, '', '/');
		});
	});

	// ─── Debounce & isSorting ──────────────────────────────────────────────────
	describe('debounceMs and isSorting', () => {
		it('delays sorting computation and sets isSorting during debounce interval', async () => {
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					debounceMs: 50,
				}),
			);

			expect(result.current.isSorting).toBe(false);
			expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Alice', 'charlie', 'Bob']);

			// Toggle sort to name asc
			act(() => result.current.setSort('name', 'asc'));
			expect(result.current.sortKey).toBe('name');
			expect(result.current.isSorting).toBe(true);
			// Still old order before debounce timer expires
			expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Alice', 'charlie', 'Bob']);

			// Wait for debounce timer
			await new Promise((r) => setTimeout(r, 70));

			expect(result.current.isSorting).toBe(false);
			expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Alice', 'Bob', 'charlie']);
		});

		it('immediately resets isSorting and sortState on clearSort', () => {
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					initialKey: 'name',
					initialDirection: 'asc',
					debounceMs: 100,
				}),
			);

			act(() => result.current.clearSort());
			expect(result.current.sortKey).toBeNull();
			expect(result.current.isSorting).toBe(false);
		});

		it('supports React 18/19 useTransition option', () => {
			const { result } = renderHook(() =>
				useSort(mockUsers, {
					useTransition: true,
				}),
			);

			expect(result.current.isSorting).toBe(false);
			act(() => result.current.setSort('age', 'desc'));
			expect(result.current.sortKey).toBe('age');
			expect(result.current.sortedItems.map((u) => u.name)).toEqual(['Bob', 'Alice', 'charlie']);
		});
	});
});
