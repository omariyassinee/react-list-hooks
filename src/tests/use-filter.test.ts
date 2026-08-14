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
	it('returns items unmodified when query and filters are empty', () => {
		const { result } = renderHook(() => useFilter(mockProducts));
		expect(result.current.filteredItems).toEqual(mockProducts);
		expect(result.current.query).toBe('');
		expect(result.current.filters).toEqual({});
	});

	it('filters items by global text search query case-insensitively', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.setQuery('holo'));
		expect(result.current.filteredItems).toEqual([mockProducts[1]!]);

		act(() => result.current.setQuery('pro')); // Matches 'CyberDeck Pro'
		expect(result.current.filteredItems).toEqual([mockProducts[0]!]);

		act(() => result.current.setQuery('  GADGETS  ')); // Matches category string value case-insensitively
		expect(result.current.filteredItems).toEqual([mockProducts[0]!, mockProducts[1]!]);
	});

	it('filters items by structured field filters', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.setFilter('category', 'Audio'));
		expect(result.current.filteredItems).toEqual([mockProducts[2]!]);

		act(() => result.current.setFilter('price', 150));
		// Category is still 'Audio', so matching both category=Audio and price=150 should yield []
		expect(result.current.filteredItems).toEqual([]);

		act(() => result.current.clearFilter('category'));
		// Category cleared, matching price=150 yields HoloLens Mini
		expect(result.current.filteredItems).toEqual([mockProducts[1]!]);
	});

	it('handles clearing all search query and structured filters', () => {
		const { result } = renderHook(() =>
			useFilter(mockProducts, {
				initialQuery: 'pro',
				initialFilters: { category: 'Gadgets' },
			}),
		);
		expect(result.current.filteredItems).toEqual([mockProducts[0]!]);

		act(() => result.current.clearFilters());
		expect(result.current.filters).toEqual({});
		expect(result.current.query).toBe('pro');

		act(() => result.current.clearAll());
		expect(result.current.query).toBe('');
		expect(result.current.filters).toEqual({});
		expect(result.current.filteredItems).toEqual(mockProducts);
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

		act(() => result.current.setFilter('price', 200)); // returns products with price < 200
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

		act(() => result.current.setFilter('status', 'All'));
		expect(result.current.filteredItems).toEqual([{ id: 1, status: 'All' }]);
	});

	it('derives searchFields across items when items[0] has missing or non-string fields', () => {
		const itemsWithMissingFirst = [
			{ id: 1, name: null, description: null },
			{ id: 2, name: 'Widget', description: 'Gadget detail' },
		];
		const { result } = renderHook(() => useFilter(itemsWithMissingFirst as any));

		act(() => result.current.setQuery('detail'));
		expect(result.current.filteredItems).toEqual([{ id: 2, name: 'Widget', description: 'Gadget detail' }]);
	});

	it('removes the filter key entirely when setFilter is called with undefined', () => {
		const { result } = renderHook(() => useFilter(mockProducts));

		act(() => result.current.setFilter('category', 'Audio'));
		expect('category' in result.current.filters).toBe(true);
		expect(result.current.filters.category).toBe('Audio');

		act(() => result.current.setFilter('category', undefined));
		expect('category' in result.current.filters).toBe(false);
		expect(Object.keys(result.current.filters)).toEqual([]);
	});

	it('maintains filteredItems referential equality when inline customFilters reference changes', () => {
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

		const firstFilteredItems = result.current.filteredItems;

		// Rerender with a NEW inline object reference for customFilters
		rerender({
			customFilters: { category: (item: Product, val: unknown) => item.category === val },
		});

		const secondFilteredItems = result.current.filteredItems;
		expect(firstFilteredItems).toBe(secondFilteredItems);
	});

	it('maintains filteredItems referential equality when inline searchFields array reference changes', () => {
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

		const firstFilteredItems = result.current.filteredItems;

		// Rerender with a NEW inline array literal for searchFields
		rerender({
			searchFields: ['name', 'category'] as Array<keyof Product>,
		});

		const secondFilteredItems = result.current.filteredItems;
		expect(firstFilteredItems).toBe(secondFilteredItems);
	});

	it('returns original items array reference when query and filters are empty', () => {
		const { result } = renderHook(() => useFilter(mockProducts));
		expect(result.current.filteredItems).toBe(mockProducts);
	});

	it('correctly filters items by NaN and Date values', () => {
		const complexItems = [
			{ id: 1, val: NaN, date: new Date('2023-01-01') },
			{ id: 2, val: 10, date: new Date('2023-05-01') },
			{ id: 3, val: NaN, date: new Date('2023-05-01') },
		];

		const { result } = renderHook(() => useFilter(complexItems));

		act(() => result.current.setFilter('val', NaN));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([1, 3]);

		act(() => result.current.setFilter('date', new Date('2023-01-01')));
		expect(result.current.filteredItems.map((i) => i.id)).toEqual([1]);
	});
});
