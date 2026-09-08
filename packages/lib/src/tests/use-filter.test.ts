import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useFilter } from '../use-filter';

interface Product {
	id: number;
	name: string;
	category: string;
	price: number;
}

const mockProducts: Product[] = [
	{ id: 1, name: 'CyberDeck Pro', category: 'Gadgets', price: 299 },
	{ id: 2, name: 'HoloLens Mini', category: 'Gadgets', price: 150 },
	{ id: 3, name: 'Acoustic Pulse', category: 'Audio', price: 99 },
];

describe('useFilter', () => {
	// ─── Return shape contract ────────────────────────────────────
	describe('return shape contract', () => {
		it('returns { filteredItems, state, methods } — only those three keys', () => {
			const { result } = renderHook(() => useFilter(mockProducts));
			expect(Object.keys(result.current)).toEqual(['filteredItems', 'state', 'methods']);
			expect(result.current.filteredItems).toEqual(mockProducts);
			expect(result.current.state.query).toBe('');
			expect(result.current.state.isFiltering).toBe(false);
			expect(typeof result.current.methods.setQuery).toBe('function');
		});

		it('never attaches metadata to the items array passed by the caller', () => {
			const { result } = renderHook(() => useFilter(mockProducts));
			expect(result.current.filteredItems).toEqual(mockProducts);
			// The caller array stays a plain array — no props leaked onto it
			expect((mockProducts as unknown as Record<string, unknown>).query).toBeUndefined();
			expect((mockProducts as unknown as Record<string, unknown>).setQuery).toBeUndefined();
		});
	});

	it('returns items unmodified when query and filters are empty', () => {
		const { result } = renderHook(() => useFilter(mockProducts));
		expect([...result.current.filteredItems]).toEqual(mockProducts);
		expect(result.current.state.query).toBe('');
		expect(result.current.state.filters).toEqual({});
	});

	it('filters items by global text search query case-insensitively', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.methods.setQuery('holo'));
		expect([...result.current.filteredItems]).toEqual([mockProducts[1]!]);

		act(() => result.current.methods.setQuery('pro')); // Matches 'CyberDeck Pro'
		expect([...result.current.filteredItems]).toEqual([mockProducts[0]!]);

		act(() => result.current.methods.setQuery('  GADGETS  ')); // Matches category string value case-insensitively
		expect([...result.current.filteredItems]).toEqual([mockProducts[0]!, mockProducts[1]!]);
	});

	it('filters items by structured field filters', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.methods.setFilter('category', 'Audio'));
		expect([...result.current.filteredItems]).toEqual([mockProducts[2]!]);

		act(() => result.current.methods.setFilter('price', 150));
		// Category is still 'Audio', so matching both category=Audio and price=150 should yield []
		expect([...result.current.filteredItems]).toEqual([]);

		act(() => result.current.methods.clearFilter('category'));
		// Category cleared, matching price=150 yields HoloLens Mini
		expect([...result.current.filteredItems]).toEqual([mockProducts[1]!]);
	});

	it('handles clearing all search query and structured filters', () => {
		const { result } = renderHook(() =>
			useFilter(mockProducts, {
				initialQuery: 'pro',
				initialFilters: { category: 'Gadgets' },
			}),
		);
		expect([...result.current.filteredItems]).toEqual([mockProducts[0]!]);

		act(() => result.current.methods.clearFilters());
		expect(result.current.state.filters).toEqual({});
		expect(result.current.state.query).toBe('pro');

		act(() => result.current.methods.clearAll());
		expect(result.current.state.query).toBe('');
		expect(result.current.state.filters).toEqual({});
		expect([...result.current.filteredItems]).toEqual(mockProducts);
	});

	it('supports custom field filter predicates', () => {
		// Custom filter checking if price is less than target value
		const customFilters = {
			price: (item: Product, maxPrice: unknown) => item.price < (maxPrice as number),
		};

		const { result } = renderHook(() =>
			useFilter(mockProducts, {
				customFilters,
			}),
		);

		act(() => result.current.methods.setFilter('price', 200)); // returns products with price < 200
		expect(result.current.filteredItems.map((p) => p.name)).toEqual(['HoloLens Mini', 'Acoustic Pulse']);
	});

	it('preserves referential equality of return object when state does not change', () => {
		const { result, rerender } = renderHook(() => useFilter(mockProducts));
		const firstReturn = result.current;
		rerender();
		const secondReturn = result.current;
		expect(firstReturn).toBe(secondReturn);
	});

	it('correctly filters items by string literal "All"', () => {
		const itemsWithAll = [
			{ id: 1, status: 'All' },
			{ id: 2, status: 'Active' },
		];
		const { result } = renderHook(() => useFilter(itemsWithAll));

		act(() => result.current.methods.setFilter('status', 'All'));
		expect([...result.current.filteredItems]).toEqual([{ id: 1, status: 'All' }]);
	});

	it('derives searchFields across items when items[0] has missing or non-string fields', () => {
		const itemsWithMissingFirst = [
			{ id: 1, name: null, description: null },
			{ id: 2, name: 'Widget', description: 'Gadget detail' },
		];
		const { result } = renderHook(() => useFilter(itemsWithMissingFirst as any));

		act(() => result.current.methods.setQuery('detail'));
		expect([...result.current.filteredItems]).toEqual([
			{ id: 2, name: 'Widget', description: 'Gadget detail' },
		]);
	});

	it('removes the filter key entirely when setFilter is called with undefined', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.methods.setFilter('category', 'Audio'));
		expect('category' in result.current.state.filters).toBe(true);
		expect(result.current.state.filters.category).toBe('Audio');

		act(() => result.current.methods.setFilter('category', undefined));
		expect('category' in result.current.state.filters).toBe(false);
		expect(Object.keys(result.current.state.filters)).toEqual([]);
	});

	it('maintains return referential equality when inline customFilters reference changes', () => {
		const { result, rerender } = renderHook(
			({ customFilters }) =>
				useFilter(mockProducts, {
					customFilters,
				}),
			{
				initialProps: {
					customFilters: { category: (item: Product, val: unknown) => item.category === val },
				},
			},
		);

		const firstFilteredItems = result.current;

		// Rerender with a NEW inline object reference for customFilters
		rerender({
			customFilters: { category: (item: Product, val: unknown) => item.category === val },
		});

		const secondFilteredItems = result.current;
		expect(firstFilteredItems).toBe(secondFilteredItems);
	});

	it('maintains return referential equality when inline searchFields array reference changes', () => {
		const { result, rerender } = renderHook(
			({ searchFields }) =>
				useFilter(mockProducts, {
					searchFields,
				}),
			{
				initialProps: {
					searchFields: ['name', 'category'] as Array<keyof Product>,
				},
			},
		);

		const firstFilteredItems = result.current;

		// Rerender with a NEW inline array literal for searchFields
		rerender({
			searchFields: ['name', 'category'] as Array<keyof Product>,
		});

		const secondFilteredItems = result.current;
		expect(firstFilteredItems).toBe(secondFilteredItems);
	});

	// (Covered in the return shape contract describe above: the caller array
	// never gets metadata attached — the return is a plain object, so there is
	// no array to decorate and no copy required.)

	it('correctly filters items by NaN and Date values', () => {
		const complexItems = [
			{ id: 1, val: NaN, date: new Date('2023-01-01') },
			{ id: 2, val: 10, date: new Date('2023-05-01') },
			{ id: 3, val: NaN, date: new Date('2023-05-01') },
		];

		const { result } = renderHook(() => useFilter(complexItems));

		act(() => result.current.methods.setFilter('val', NaN));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([1, 3]);

		act(() => result.current.methods.clearFilter('val'));
		act(() => result.current.methods.setFilter('date', new Date('2023-01-01')));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([1]);

		// Test date string filter matching Date instance
		act(() => result.current.methods.setFilter('date', '2023-05-01'));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([2, 3]);
	});

	it('matches -0 and 0 symmetrically in exact filter matching', () => {
		const itemsWithZeros = [
			{ id: 1, count: 0 },
			{ id: 2, count: 5 },
		];

		const { result } = renderHook(() => useFilter(itemsWithZeros));

		act(() => result.current.methods.setFilter('count', -0));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([1]);
	});

	it('supports synthetic/custom filter keys that do not exist on the item type', () => {
		interface User {
			id: number;
			name: string;
			email: string;
			isAdmin: boolean;
			archived: boolean;
		}

		const users: User[] = [
			{ id: 1, name: 'Alice', email: 'alice@example.com', isAdmin: true, archived: false },
			{ id: 2, name: 'Bob', email: 'bob@example.com', isAdmin: false, archived: false },
			{ id: 3, name: 'Charlie', email: 'charlie@example.com', isAdmin: false, archived: true },
		];

		const { result } = renderHook(() =>
			useFilter(users, {
				customFilters: {
					status: (user, statusVal) => {
						if (statusVal === 'active') return !user.archived;
						if (statusVal === 'admins') return user.isAdmin && !user.archived;
						if (statusVal === 'archived') return user.archived;
						return true;
					},
				},
				initialFilters: { status: 'active' },
			}),
		);

		// Initial filter: active (Alice and Bob)
		expect(result.current.filteredItems.map((u) => u.name)).toEqual(['Alice', 'Bob']);

		// Change to admins
		act(() => result.current.methods.setFilter('status', 'admins'));
		expect(result.current.filteredItems.map((u) => u.name)).toEqual(['Alice']);

		// Change to archived
		act(() => result.current.methods.setFilter('status', 'archived'));
		expect(result.current.filteredItems.map((u) => u.name)).toEqual(['Charlie']);

		// Clear status filter
		act(() => result.current.methods.clearFilter('status'));
		expect(result.current.filteredItems.length).toBe(3);
	});

	it('preserves field autocompletion and prevents key from collapsing to never when ternary/empty initialFilters are passed', () => {
		interface Patient {
			id: string;
			fullName: string;
			treatmentStatus: 'ongoing' | 'improved' | 'discharged';
		}
		const patients: Patient[] = [
			{ id: '1', fullName: 'John Doe', treatmentStatus: 'ongoing' },
			{ id: '2', fullName: 'Jane Smith', treatmentStatus: 'discharged' },
		];
		const filter = { status: 'ongoing', search: 'John' };

		const { result } = renderHook(() =>
			useFilter(patients, {
				initialQuery: filter.search || '',
				initialFilters: filter.status !== 'all' ? { treatmentStatus: filter.status } : {},
				searchFields: ['fullName'],
			}),
		);

		expect(result.current.filteredItems.length).toBe(1);
		act(() => result.current.methods.setFilter('treatmentStatus', 'discharged'));
		expect(result.current.filteredItems.length).toBe(0);
	});

	// ─── Debounce & isFiltering ──────────────────────────────────────────────
	describe('debounceMs and isFiltering', () => {
		it('delays text filter computation and sets isFiltering during debounce interval', async () => {
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					debounceMs: 50,
				}),
			);

			// Initially synchronous
			expect(result.current.state.isFiltering).toBe(false);
			expect(result.current.filteredItems.length).toBe(3);

			// Update query
			act(() => result.current.methods.setQuery('HoloLens'));
			expect(result.current.state.query).toBe('HoloLens');
			expect(result.current.state.isFiltering).toBe(true);
			// Still returns all 3 items before debounce timer expires
			expect(result.current.filteredItems.length).toBe(3);

			// Wait for debounce timer
			await new Promise((r) => setTimeout(r, 70));

			expect(result.current.state.isFiltering).toBe(false);
			expect(result.current.filteredItems.length).toBe(1);
			expect(result.current.filteredItems[0]?.name).toBe('HoloLens Mini');
		});

		it('immediately resets query and debouncedQuery on clearAll', () => {
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					initialQuery: 'HoloLens',
					debounceMs: 100,
				}),
			);

			act(() => result.current.methods.clearAll());
			expect(result.current.state.query).toBe('');
			expect(result.current.state.isFiltering).toBe(false);
			expect(result.current.filteredItems.length).toBe(3);
		});
	});

	// ─── urlSync ──────────────────────────────────────────────────────────────
	describe('urlSync', () => {
		it('reads initial query and structured filters from URL search params', () => {
			window.history.replaceState({}, '', '?q=CyberDeck&category=Gadgets');
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					urlSync: true,
					initialFilters: { category: undefined },
				}),
			);

			expect(result.current.state.query).toBe('CyberDeck');
			expect(result.current.state.filters.category).toBe('Gadgets');
			expect(result.current.filteredItems.length).toBe(1);
			expect(result.current.filteredItems[0]?.name).toBe('CyberDeck Pro');
			window.history.replaceState({}, '', '/');
		});

		it('updates URL search params when query and filters change', () => {
			window.history.replaceState({}, '', '/');
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					urlSync: {
						enabled: true,
						queryParam: 'search',
						paramMap: { category: 'cat' },
					},
				}),
			);

			act(() => result.current.methods.setQuery('CyberDeck'));
			expect(window.location.search).toContain('search=CyberDeck');

			act(() => result.current.methods.setFilter('category', 'Audio'));
			expect(window.location.search).toContain('cat=Audio');

			act(() => result.current.methods.clearFilter('category'));
			expect(window.location.search).not.toContain('cat=');

			window.history.replaceState({}, '', '/');
		});

		it('handles popstate browser back navigation', () => {
			window.history.replaceState({}, '', '?q=Initial');
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					urlSync: true,
				}),
			);

			expect(result.current.state.query).toBe('Initial');

			// Simulate back button navigating to new search
			window.history.replaceState({}, '', '?q=Acoustic');
			act(() => {
				window.dispatchEvent(new window.Event('popstate'));
			});

			expect(result.current.state.query).toBe('Acoustic');
			expect(result.current.filteredItems.length).toBe(1);
			expect(result.current.filteredItems[0]?.name).toBe('Acoustic Pulse');
			window.history.replaceState({}, '', '/');
		});

		it('supports React 18/19 useTransition option', () => {
			const { result } = renderHook(() =>
				useFilter(mockProducts, {
					useTransition: true,
				}),
			);

			expect(result.current.state.isFiltering).toBe(false);
			act(() => result.current.methods.setQuery('Pulse'));
			expect(result.current.state.query).toBe('Pulse');
			expect(result.current.filteredItems.length).toBe(1);
			expect(result.current.filteredItems[0]?.name).toBe('Acoustic Pulse');
		});
	});
});
