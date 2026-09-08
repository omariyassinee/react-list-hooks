import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useList } from '../use-list';

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
	{ id: 4, name: 'NeuroPad', category: 'Gadgets', price: 450 },
	{ id: 5, name: 'Bass Blaster', category: 'Audio', price: 199 },
	{ id: 6, name: 'Quantum Screen', category: 'Workstation', price: 899 },
	{ id: 7, name: 'Pulse Watch', category: 'Wearables', price: 350 },
	{ id: 8, name: 'Echo Buds', category: 'Audio', price: 79 },
	{ id: 9, name: 'VR Deck', category: 'Gadgets', price: 599 },
	{ id: 10, name: 'Smart Ring', category: 'Wearables', price: 249 },
	{ id: 11, name: 'MechBoard', category: 'Workstation', price: 189 },
	{ id: 12, name: 'Hover Mouse', category: 'Workstation', price: 129 },
];

function items(n: number): number[] {
	return Array.from({ length: n }, (_, i) => i + 1);
}

describe('useList', () => {
	// ─── Pipeline composition ─────────────────────────────────────────────
	describe('pipeline composition', () => {
		it('applies filter → sort → paginate in correct order', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: { initialQuery: 'Audio' },
					sort: { initialKey: 'price', initialDirection: 'asc' },
					paginate: { pageSize: 2 },
				}),
			);

			// Filter: Audio items are Acoustic Pulse (99), Bass Blaster (199), Echo Buds (79)
			expect(result.current.filteredCount).toBe(3);
			// Sort by price asc: Echo Buds (79), Acoustic Pulse (99), Bass Blaster (199)
			// Paginate page 1, size 2: Echo Buds, Acoustic Pulse
			expect(result.current.data.paginatedItems.length).toBe(2);
			expect([...result.current.data.paginatedItems].map((p) => p.name)).toEqual([
				'Echo Buds',
				'Acoustic Pulse',
			]);
			expect(result.current.totalPages).toBe(2);
			expect(result.current.currentPage).toBe(1);
		});

		it('returns all items when no options are provided', () => {
			const { result } = renderHook(() => useList(mockProducts));

			// No filter, no sort, default paginate (pageSize 10)
			expect(result.current.data.paginatedItems.length).toBe(10);
			expect(result.current.totalItems).toBe(12);
			expect(result.current.totalPages).toBe(2);
			expect(result.current.filteredCount).toBe(12);
		});

		it('works with filter-only config (no sort, no paginate options)', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: { initialQuery: 'Gadgets' },
				}),
			);

			// Filter matches Gadgets category items: CyberDeck Pro, HoloLens Mini, NeuroPad, VR Deck
			expect(result.current.filteredCount).toBe(4);
			expect(result.current.sortKey).toBeNull();
		});

		it('works with sort-only config (no filter options)', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					sort: { initialKey: 'price', initialDirection: 'desc' },
					paginate: { pageSize: 3 },
				}),
			);

			// Sort by price desc: Quantum Screen (899), VR Deck (599), NeuroPad (450), ...
			expect([...result.current.data.paginatedItems].map((p) => p.name)).toEqual([
				'Quantum Screen',
				'VR Deck',
				'NeuroPad',
			]);
		});
	});

	// ─── Automatic page-1 reset on filter change ──────────────────────────
	describe('automatic page-1 reset', () => {
		it('resets to page 1 when search query changes', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			// Navigate to page 3
			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			// Change query → should reset to page 1
			act(() => result.current.setQuery('Audio'));
			expect(result.current.currentPage).toBe(1);
		});

		it('resets to page 1 when a field filter changes', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.setFilter('category', 'Audio'));
			expect(result.current.currentPage).toBe(1);
		});

		it('resets to page 1 when sort key changes', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.setSort('price', 'asc'));
			expect(result.current.currentPage).toBe(1);
		});

		it('resets to page 1 when sort direction toggles', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: { initialKey: 'price', initialDirection: 'asc' },
					paginate: { pageSize: 3 },
				}),
			);

			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.toggleSort('price'));
			expect(result.current.currentPage).toBe(1);
		});

		it('resets to page 1 when clearFilters is called', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: { initialFilters: { category: 'Audio' } },
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			// Ensure we're on page 1 from filter narrowing, then change page
			act(() => result.current.goToPage(1));
			act(() => result.current.clearFilter('category'));

			// After clearing, we go back to all items and reset to page 1
			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.setFilter('category', 'Audio'));
			expect(result.current.currentPage).toBe(1);
		});

		it('resets to page 1 when clearSort is called', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: { initialKey: 'price', initialDirection: 'asc' },
					paginate: { pageSize: 3 },
				}),
			);

			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.clearSort());
			expect(result.current.currentPage).toBe(1);
		});

		it('does NOT reset page on next/prev/goToPage navigation', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			act(() => result.current.next());
			expect(result.current.currentPage).toBe(2);

			act(() => result.current.next());
			expect(result.current.currentPage).toBe(3);

			act(() => result.current.prev());
			expect(result.current.currentPage).toBe(2);

			act(() => result.current.goToPage(4));
			expect(result.current.currentPage).toBe(4);

			act(() => result.current.goToEnd());
			expect(result.current.currentPage).toBe(4);

			act(() => result.current.goToStart());
			expect(result.current.currentPage).toBe(1);
		});
	});

	// ─── resetAll ─────────────────────────────────────────────────────────
	describe('resetAll', () => {
		it('clears query, filters, sort, and resets to page 1', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			// Set up some state
			act(() => {
				result.current.setQuery('Cyber');
				result.current.setFilter('category', 'Gadgets');
				result.current.setSort('price', 'desc');
			});

			expect(result.current.query).toBe('Cyber');
			expect(result.current.filters.category).toBe('Gadgets');
			expect(result.current.sortKey).toBe('price');
			expect(result.current.sortDirection).toBe('desc');

			act(() => result.current.resetAll());

			expect(result.current.query).toBe('');
			expect(result.current.filters).toEqual({});
			expect(result.current.sortKey).toBeNull();
			expect(result.current.sortDirection).toBeNull();
			expect(result.current.currentPage).toBe(1);
		});
	});

	// ─── isProcessing ─────────────────────────────────────────────────────
	describe('isProcessing', () => {
		it('reflects isFiltering during debounced filter', async () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: { debounceMs: 50 },
					sort: {},
					paginate: { pageSize: 5 },
				}),
			);

			expect(result.current.isProcessing).toBe(false);

			act(() => result.current.setQuery('Audio'));
			expect(result.current.isProcessing).toBe(true);

			await new Promise((r) => setTimeout(r, 70));
			expect(result.current.isProcessing).toBe(false);
		});

		it('reflects isSorting during debounced sort', async () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: { debounceMs: 50 },
					paginate: { pageSize: 5 },
				}),
			);

			expect(result.current.isProcessing).toBe(false);

			act(() => result.current.setSort('price', 'asc'));
			expect(result.current.isProcessing).toBe(true);

			await new Promise((r) => setTimeout(r, 70));
			expect(result.current.isProcessing).toBe(false);
		});
	});

	// ─── Referential stability ────────────────────────────────────────────
	describe('referential stability', () => {
		it('preserves callback references across re-renders', () => {
			const { result, rerender } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 5 },
				}),
			);

			const initial = {
				setQuery: result.current.setQuery,
				setFilter: result.current.setFilter,
				clearFilter: result.current.clearFilter,
				clearFilters: result.current.clearFilters,
				setSort: result.current.setSort,
				toggleSort: result.current.toggleSort,
				clearSort: result.current.clearSort,
				getSortIndicator: result.current.getSortIndicator,
				resetAll: result.current.resetAll,
			};

			rerender();

			expect(result.current.setQuery).toBe(initial.setQuery);
			expect(result.current.setFilter).toBe(initial.setFilter);
			expect(result.current.clearFilter).toBe(initial.clearFilter);
			expect(result.current.clearFilters).toBe(initial.clearFilters);
			expect(result.current.setSort).toBe(initial.setSort);
			expect(result.current.toggleSort).toBe(initial.toggleSort);
			expect(result.current.clearSort).toBe(initial.clearSort);
			expect(result.current.getSortIndicator).toBe(initial.getSortIndicator);
			expect(result.current.resetAll).toBe(initial.resetAll);
		});

		it('preserves return object identity when state does not change', () => {
			const data = mockProducts;
			const { result, rerender } = renderHook(() =>
				useList(data, {
					filter: {},
					sort: {},
					paginate: { pageSize: 5 },
				}),
			);

			const first = result.current;
			rerender();
			const second = result.current;
			expect(first).toBe(second);
		});
	});

	// ─── URL sync ─────────────────────────────────────────────────────────
	describe('urlSync', () => {
		it('reads initial state from URL when urlSync is enabled', () => {
			window.history.replaceState({}, '', '?q=Audio&sortBy=price&sortDir=desc&page=1&pageSize=5');
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: {},
					urlSync: true,
				}),
			);

			expect(result.current.query).toBe('Audio');
			expect(result.current.sortKey).toBe('price');
			expect(result.current.sortDirection).toBe('desc');
			expect(result.current.pageSize).toBe(5);

			window.history.replaceState({}, '', '/');
		});

		it('writes filter, sort, and paginate params to URL', () => {
			window.history.replaceState({}, '', '/');
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 5 },
					urlSync: true,
				}),
			);

			act(() => result.current.setQuery('Pulse'));
			act(() => result.current.setSort('price', 'asc'));

			const search = new URLSearchParams(window.location.search);
			expect(search.get('q')).toBe('Pulse');
			expect(search.get('sortBy')).toBe('price');
			expect(search.get('sortDir')).toBe('asc');
			expect(search.get('page')).toBe('1');
			expect(search.get('pageSize')).toBe('5');

			window.history.replaceState({}, '', '/');
		});

		it('supports custom param names via ListUrlSyncOptions', () => {
			window.history.replaceState({}, '', '?search=Audio&sort=price&order=asc&p=1&limit=3');
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: {},
					urlSync: {
						enabled: true,
						queryParam: 'search',
						sortKeyParam: 'sort',
						directionParam: 'order',
						pageParam: 'p',
						pageSizeParam: 'limit',
					},
				}),
			);

			expect(result.current.query).toBe('Audio');
			expect(result.current.sortKey).toBe('price');
			expect(result.current.sortDirection).toBe('asc');
			expect(result.current.pageSize).toBe(3);

			window.history.replaceState({}, '', '/');
		});

		it('handles popstate for all pipeline stages', () => {
			window.history.replaceState({}, '', '?q=Audio&sortBy=price&sortDir=asc&page=1&pageSize=5');
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: {},
					urlSync: true,
				}),
			);

			expect(result.current.query).toBe('Audio');

			// Simulate back navigation
			window.history.replaceState({}, '', '?q=Gadgets&sortBy=name&sortDir=desc&page=2&pageSize=3');
			act(() => {
				window.dispatchEvent(new window.Event('popstate'));
			});

			expect(result.current.query).toBe('Gadgets');
			expect(result.current.sortKey).toBe('name');
			expect(result.current.sortDirection).toBe('desc');

			window.history.replaceState({}, '', '/');
		});
	});

	// ─── Edge cases ───────────────────────────────────────────────────────
	describe('edge cases', () => {
		it('handles empty items array gracefully', () => {
			const { result } = renderHook(() =>
				useList([] as Product[], {
					filter: {},
					sort: {},
					paginate: { pageSize: 5 },
				}),
			);

			expect(result.current.data.paginatedItems.length).toBe(0);
			expect(result.current.totalPages).toBe(1);
			expect(result.current.currentPage).toBe(1);
			expect(result.current.filteredCount).toBe(0);
			expect(result.current.isProcessing).toBe(false);
		});

		it('data field is an array-augmented paginate result that can be mapped', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 3 },
				}),
			);

			const names = result.current.data.paginatedItems.map((p) => p.name);
			expect(names.length).toBe(3);
			expect(Array.isArray(result.current.data.paginatedItems)).toBe(true);
		});

		it('proxied paginate properties match data properties', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 4 },
				}),
			);

			expect(result.current.currentPage).toBe(result.current.data.state.currentPage);
			expect(result.current.totalPages).toBe(result.current.data.state.totalPages);
			expect(result.current.totalItems).toBe(result.current.data.state.totalItems);
			expect(result.current.pageSize).toBe(result.current.data.state.pageSize);
			expect(result.current.hasNext).toBe(result.current.data.state.hasNext);
			expect(result.current.hasPrev).toBe(result.current.data.state.hasPrev);
			expect(result.current.next).toBe(result.current.data.methods.next);
			expect(result.current.prev).toBe(result.current.data.methods.prev);
			expect(result.current.goToPage).toBe(result.current.data.methods.goToPage);
			expect(result.current.goToStart).toBe(result.current.data.methods.goToStart);
			expect(result.current.goToEnd).toBe(result.current.data.methods.goToEnd);
			expect(result.current.setPageSize).toBe(result.current.data.methods.setPageSize);
			expect(result.current.pageNumbers).toBe(result.current.data.state.pageNumbers);
			expect(result.current.paginationRange).toBe(result.current.data.state.paginationRange);
		});

		it('getSortIndicator works correctly through the pipeline', () => {
			const { result } = renderHook(() =>
				useList(mockProducts, {
					filter: {},
					sort: {},
					paginate: { pageSize: 5 },
				}),
			);

			expect(result.current.getSortIndicator('price')).toBeNull();

			act(() => result.current.setSort('price', 'desc'));
			expect(result.current.getSortIndicator('price')).toBe('desc');
			expect(result.current.getSortIndicator('name')).toBeNull();
		});

		it('handles items array changing reference', () => {
			const { result, rerender } = renderHook(
				({ data }) =>
					useList(data, {
						filter: {},
						sort: { initialKey: 'price', initialDirection: 'asc' },
						paginate: { pageSize: 5 },
					}),
				{ initialProps: { data: mockProducts } },
			);

			expect(result.current.totalItems).toBe(12);

			const smallerSet = mockProducts.slice(0, 3);
			rerender({ data: smallerSet });

			expect(result.current.totalItems).toBe(3);
			expect(result.current.currentPage).toBe(1);
		});
	});
});
