import { describe, it, expect } from 'bun:test';

import { renderHook, act } from '@testing-library/react';

import { usePaginator } from '../use-paginator';

// Helper to generate a numbered array [1, 2, ..., n]
function items(n: number): number[] {
	return Array.from({ length: n }, (_, i) => i + 1);
}

describe('usePaginator', () => {
	// ─── Empty array ──────────────────────────────────────────────
	describe('empty array', () => {
		it('returns totalPages = 1 and empty currentItems', () => {
			const { result } = renderHook(() => usePaginator([]));
			expect(result.current.totalPages).toBe(1);
			expect(Array.isArray(result.current)).toBe(true);
			expect([...result.current]).toEqual([]);
			expect(result.current.currentPage).toBe(1);
			expect(result.current.totalItems).toBe(0);
		});

		it('has correct flags on empty array', () => {
			const { result } = renderHook(() => usePaginator([]));
			expect(result.current.isFirstPage).toBe(true);
			expect(result.current.isLastPage).toBe(true);
			expect(result.current.hasNext).toBe(false);
			expect(result.current.hasPrev).toBe(false);
		});
	});

	// ─── Exact multiple of pageSize ───────────────────────────────
	describe('exact multiple of pageSize', () => {
		it('slices correctly across pages (10 items, pageSize 5)', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));
			expect(result.current.totalPages).toBe(2);
			expect([...result.current]).toEqual([1, 2, 3, 4, 5]);
			expect(result.current.pageNumbers).toEqual([1, 2]);

			act(() => result.current.next());
			expect([...result.current]).toEqual([6, 7, 8, 9, 10]);
			expect(result.current.currentPage).toBe(2);
		});
	});

	// ─── Non-multiple of pageSize ─────────────────────────────────
	describe('non-multiple of pageSize', () => {
		it('last page has remaining items (7 items, pageSize 3)', () => {
			const { result } = renderHook(() => usePaginator(items(7), { pageSize: 3 }));
			expect(result.current.totalPages).toBe(3);
			expect(result.current.pageNumbers).toEqual([1, 2, 3]);

			// Go to last page
			act(() => result.current.goToEnd());
			expect([...result.current]).toEqual([7]);
			expect(result.current.currentPage).toBe(3);
		});
	});

	// ─── Boundary navigation ──────────────────────────────────────
	describe('boundary navigation', () => {
		it('prev() on page 1 is a no-op', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));
			expect(result.current.currentPage).toBe(1);

			act(() => result.current.prev());
			expect(result.current.currentPage).toBe(1);
			expect(result.current.hasPrev).toBe(false);
		});

		it('next() on last page is a no-op', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5, initialPage: 2 }));
			expect(result.current.currentPage).toBe(2);

			act(() => result.current.next());
			expect(result.current.currentPage).toBe(2);
			expect(result.current.hasNext).toBe(false);
		});

		it('goToStart and goToEnd work correctly', () => {
			const { result } = renderHook(() => usePaginator(items(30), { pageSize: 10 }));

			act(() => result.current.goToEnd());
			expect(result.current.currentPage).toBe(3);
			expect(result.current.isLastPage).toBe(true);

			act(() => result.current.goToStart());
			expect(result.current.currentPage).toBe(1);
			expect(result.current.isFirstPage).toBe(true);
		});
	});

	// ─── goToPage clamping ────────────────────────────────────────
	describe('goToPage clamping', () => {
		it('clamps negative page to 1', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));
			act(() => result.current.goToPage(-5));
			expect(result.current.currentPage).toBe(1);
		});

		it('clamps zero to 1', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));
			act(() => result.current.goToPage(0));
			expect(result.current.currentPage).toBe(1);
		});

		it('clamps beyond totalPages to totalPages', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));
			act(() => result.current.goToPage(100));
			expect(result.current.currentPage).toBe(2);
		});
	});

	// ─── setPageSize with position preservation ───────────────────
	describe('setPageSize (position preservation)', () => {
		it('preserves approximate position when page size changes', () => {
			const { result } = renderHook(() => usePaginator(items(50), { pageSize: 5 }));

			// Go to page 3 → first visible item is index 10 (item 11)
			act(() => result.current.goToPage(3));
			expect(result.current.currentPage).toBe(3);
			expect(result.current[0]).toBe(11);

			// Change to pageSize 10 → index 10 falls on page 2
			act(() => result.current.setPageSize(10));
			expect(result.current.pageSize).toBe(10);
			expect(result.current.currentPage).toBe(2);
			expect([...result.current]).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
		});

		it('clamps to 1 for zero or negative pageSize', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5 }));

			act(() => result.current.setPageSize(0));
			expect(result.current.pageSize).toBe(1);

			act(() => result.current.setPageSize(-3));
			expect(result.current.pageSize).toBe(1);
		});
	});

	// ─── Source array shrinking ───────────────────────────────────
	describe('source array shrinking', () => {
		it('clamps currentPage when items shrink', () => {
			const { result, rerender } = renderHook(({ data }) => usePaginator(data, { pageSize: 5 }), {
				initialProps: { data: items(50) },
			});

			// Go to page 10 (last page)
			act(() => result.current.goToPage(10));
			expect(result.current.currentPage).toBe(10);

			// Shrink to 12 items → only 3 pages now
			rerender({ data: items(12) });
			expect(result.current.totalPages).toBe(3);
			expect(result.current.currentPage).toBe(3);
		});
	});

	// ─── Status flags ─────────────────────────────────────────────
	describe('status flags', () => {
		it('reflects correct state on first page', () => {
			const { result } = renderHook(() => usePaginator(items(20), { pageSize: 5 }));
			expect(result.current.isFirstPage).toBe(true);
			expect(result.current.isLastPage).toBe(false);
			expect(result.current.hasNext).toBe(true);
			expect(result.current.hasPrev).toBe(false);
		});

		it('reflects correct state on middle page', () => {
			const { result } = renderHook(() => usePaginator(items(20), { pageSize: 5, initialPage: 2 }));
			expect(result.current.isFirstPage).toBe(false);
			expect(result.current.isLastPage).toBe(false);
			expect(result.current.hasNext).toBe(true);
			expect(result.current.hasPrev).toBe(true);
		});

		it('reflects correct state on last page', () => {
			const { result } = renderHook(() => usePaginator(items(20), { pageSize: 5, initialPage: 4 }));
			expect(result.current.isFirstPage).toBe(false);
			expect(result.current.isLastPage).toBe(true);
			expect(result.current.hasNext).toBe(false);
			expect(result.current.hasPrev).toBe(true);
		});
	});

	// ─── pageNumbers ──────────────────────────────────────────────
	describe('pageNumbers', () => {
		it('generates correct array of page numbers', () => {
			const { result } = renderHook(() => usePaginator(items(23), { pageSize: 5 }));
			expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5]);
		});

		it('returns [1] for single page', () => {
			const { result } = renderHook(() => usePaginator(items(3), { pageSize: 5 }));
			expect(result.current.pageNumbers).toEqual([1]);
		});
	});

	// ─── initialPage clamping ─────────────────────────────────────
	describe('initialPage', () => {
		it('clamps initialPage that exceeds totalPages', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5, initialPage: 99 }));
			expect(result.current.currentPage).toBe(2);
		});

		it('clamps negative initialPage to 1', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: 5, initialPage: -1 }));
			expect(result.current.currentPage).toBe(1);
		});
	});

	// ─── Default pageSize ─────────────────────────────────────────
	describe('default pageSize', () => {
		it('defaults to 10 when no pageSize is provided', () => {
			const { result } = renderHook(() => usePaginator(items(25)));
			expect(result.current.pageSize).toBe(10);
			expect(result.current.totalPages).toBe(3);
			expect([...result.current]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		});
	});

	// ─── URL Search Params Sync (urlSync) ─────────────────────────
	describe('urlSync', () => {
		it('reads initial page and pageSize from URL when urlSync: true', () => {
			window.history.replaceState({}, '', '?page=2&pageSize=5');
			const { result } = renderHook(() =>
				usePaginator(items(20), { pageSize: 10, urlSync: true }),
			);
			expect(result.current.isUrlSyncEnabled).toBe(true);
			expect(result.current.currentPage).toBe(2);
			expect(result.current.pageSize).toBe(5);
			window.history.replaceState({}, '', '/');
		});

		it('updates window.location.search when navigating with urlSync: true', () => {
			window.history.replaceState({}, '', '/');
			const { result } = renderHook(() =>
				usePaginator(items(30), { pageSize: 10, urlSync: true }),
			);

			act(() => result.current.goToPage(3));
			expect(window.location.search).toBe('?page=3&pageSize=10');

			act(() => result.current.prev());
			expect(window.location.search).toBe('?page=2&pageSize=10');

			window.history.replaceState({}, '', '/');
		});

		it('supports custom pageParam and pageSizeParam names', () => {
			window.history.replaceState({}, '', '?p=3&limit=5');
			const { result } = renderHook(() =>
				usePaginator(items(30), {
					urlSync: {
						enabled: true,
						pageParam: 'p',
						pageSizeParam: 'limit',
					},
				}),
			);
			expect(result.current.currentPage).toBe(3);
			expect(result.current.pageSize).toBe(5);

			act(() => result.current.next());
			expect(window.location.search).toBe('?p=4&limit=5');
			window.history.replaceState({}, '', '/');
		});

		it('preserves existing non-pagination query params when keepOtherParams: true', () => {
			window.history.replaceState({}, '', '?search=react&category=tech');
			const { result } = renderHook(() =>
				usePaginator(items(20), { pageSize: 5, urlSync: true }),
			);

			act(() => result.current.goToPage(2));
			const search = new URLSearchParams(window.location.search);
			expect(search.get('search')).toBe('react');
			expect(search.get('category')).toBe('tech');
			expect(search.get('page')).toBe('2');
			expect(search.get('pageSize')).toBe('5');

			window.history.replaceState({}, '', '/');
		});

		it('generates shareable URLs via getShareableUrl helper', () => {
			window.history.replaceState({}, '', '/products');
			const { result } = renderHook(() =>
				usePaginator(items(50), { pageSize: 10, urlSync: { enabled: true, pageParam: 'p', pageSizeParam: 's' } }),
			);

			const page3Url = result.current.getShareableUrl(3);
			expect(page3Url).toBe('/products?p=3&s=10');

			const customSizeUrl = result.current.getShareableUrl(2, 25);
			expect(customSizeUrl).toBe('/products?p=2&s=25');

			window.history.replaceState({}, '', '/');
		});

		it('preserves referential equality of return object when state does not change', () => {
			const data = items(20);
			const { result, rerender } = renderHook(() => usePaginator(data, { pageSize: 5 }));
			const firstReturn = result.current;
			rerender();
			const secondReturn = result.current;
			expect(firstReturn).toBe(secondReturn);
		});
	});

	// ─── Non-enumerable return properties ─────────────────────────
	describe('non-enumerable return properties', () => {
		it('only enumerates numeric array indices on for...in and Object.keys', () => {
			const { result } = renderHook(() => usePaginator(items(5), { pageSize: 3 }));
			const keys = Object.keys(result.current);
			expect(keys).toEqual(['0', '1', '2']);

			const forInKeys: string[] = [];
			for (const k in result.current) {
				forInKeys.push(k);
			}
			expect(forInKeys).toEqual(['0', '1', '2']);
		});

		it('serializes to standard JSON array without extra metadata keys', () => {
			const { result } = renderHook(() => usePaginator([10, 20, 30], { pageSize: 2 }));
			expect(JSON.stringify(result.current)).toBe('[10,20]');
		});
	});

	// ─── Options prop syncing ─────────────────────────────────────
	describe('options prop syncing', () => {
		it('syncs pageSize when options.pageSize prop updates dynamically', () => {
			const { result, rerender } = renderHook(({ size }) => usePaginator(items(20), { pageSize: size }), {
				initialProps: { size: 5 },
			});

			expect(result.current.pageSize).toBe(5);

			rerender({ size: 10 });
			expect(result.current.pageSize).toBe(10);
			expect(result.current.totalPages).toBe(2);
		});
	});

	// ─── Popstate missing params fallback ──────────────────────────
	describe('popstate missing params reset', () => {
		it('resets page and pageSize to defaults when popstate occurs without query params', () => {
			window.history.replaceState({}, '', '?page=3&pageSize=5');
			const { result } = renderHook(() => usePaginator(items(30), { pageSize: 10, urlSync: true }));

			expect(result.current.currentPage).toBe(3);
			expect(result.current.pageSize).toBe(5);

			// Navigate back to root URL with no params
			window.history.replaceState({}, '', '/');
			act(() => {
				window.dispatchEvent(new window.Event('popstate'));
			});

			expect(result.current.currentPage).toBe(1);
			expect(result.current.pageSize).toBe(10);

			window.history.replaceState({}, '', '/');
		});
	});

	// ─── Custom base URL in getShareableUrl ────────────────────────
	describe('getShareableUrl base URL parameter', () => {
		it('supports passing a custom base URL', () => {
			const { result } = renderHook(() => usePaginator(items(30), { pageSize: 10, urlSync: true }));
			const customUrl = result.current.getShareableUrl(2, 5, 'https://example.com/catalog?sort=name#section');

			expect(customUrl).toBe('/catalog?sort=name&page=2&pageSize=5#section');
		});
	});

	// ─── Additional Audit Edge Cases ────────────────────────────────
	describe('audit edge cases', () => {
		it('handles invalid pageSize inputs like NaN, Infinity, zero and negative numbers gracefully', () => {
			const { result } = renderHook(() => usePaginator(items(10), { pageSize: NaN }));
			expect(result.current.pageSize).toBe(10); // Fallback to DEFAULT_PAGE_SIZE

			act(() => result.current.setPageSize(NaN));
			expect(result.current.pageSize).toBe(1);

			act(() => result.current.setPageSize(Infinity));
			expect(result.current.pageSize).toBe(1);
		});

		it('immediately returns non-empty slice frame when source items shrink on late page', () => {
			const { result, rerender } = renderHook(({ data }) => usePaginator(data, { pageSize: 10 }), {
				initialProps: { data: items(50) },
			});

			act(() => result.current.goToPage(5));
			expect(result.current.currentPage).toBe(5);
			expect([...result.current]).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);

			// Shrink data to 5 items. The returned slice on this exact render must not be empty []
			rerender({ data: items(5) });
			expect(result.current.currentPage).toBe(1);
			expect([...result.current]).toEqual([1, 2, 3, 4, 5]);
		});
	});
});


