import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { ListHarness, type TestItem } from './harness/ListHarness';

afterEach(() => {
	cleanup();
});

const BASE_ITEMS: TestItem[] = [
	{ id: 1, name: 'Apple', category: 'Fruit', price: 10 },
	{ id: 2, name: 'Banana', category: 'Fruit', price: 20 },
	{ id: 3, name: 'Cherry', category: 'Fruit', price: 30 },
	{ id: 4, name: 'Date', category: 'Fruit', price: 40 },
	{ id: 5, name: 'Eggplant', category: 'Vegetable', price: 15 },
	{ id: 6, name: 'Fig', category: 'Fruit', price: 25 },
	{ id: 7, name: 'Grape', category: 'Fruit', price: 35 },
	{ id: 8, name: 'Honeydew', category: 'Fruit', price: 45 },
];

type ModelAction =
	| { type: 'setQuery'; value: string }
	| { type: 'sort'; key: 'name' | 'price' }
	| { type: 'next' }
	| { type: 'prev' };

// Pure Reference Model implementation
class PureReferenceModel {
	items: TestItem[];
	query = '';
	sortKey: 'name' | 'price' | null = null;
	sortDir: 'asc' | 'desc' | null = null;
	page = 1;
	pageSize = 3;

	constructor(items: TestItem[]) {
		this.items = [...items];
	}

	apply(action: ModelAction) {
		switch (action.type) {
			case 'setQuery':
				if (this.query !== action.value) {
					this.query = action.value;
					this.page = 1;
				}
				break;
			case 'sort':
				if (this.sortKey !== action.key) {
					this.sortKey = action.key;
					this.sortDir = 'asc';
					this.page = 1;
				} else if (this.sortDir === 'asc') {
					this.sortDir = 'desc';
					this.page = 1;
				} else if (this.sortDir === 'desc') {
					this.sortKey = null;
					this.sortDir = null;
					this.page = 1;
				}
				break;
			case 'next':
				if (this.page < this.totalPages) {
					this.page++;
				}
				break;
			case 'prev':
				if (this.page > 1) {
					this.page--;
				}
				break;
		}
	}

	get filtered(): TestItem[] {
		if (!this.query.trim()) return this.items;
		const q = this.query.toLowerCase();
		return this.items.filter(
			(i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
		);
	}

	get sorted(): TestItem[] {
		const items = [...this.filtered];
		if (!this.sortKey || !this.sortDir) return items;
		const key = this.sortKey;
		const mult = this.sortDir === 'asc' ? 1 : -1;
		return items.sort((a, b) => {
			if (typeof a[key] === 'string') {
				return (a[key] as string).localeCompare(b[key] as string) * mult;
			}
			return ((a[key] as number) - (b[key] as number)) * mult;
		});
	}

	get totalPages(): number {
		return Math.max(1, Math.ceil(this.sorted.length / this.pageSize));
	}

	get currentRows(): TestItem[] {
		const start = (this.page - 1) * this.pageSize;
		return this.sorted.slice(start, start + this.pageSize);
	}
}

describe('Section 7: Model-Based Testing with fast-check', () => {
	it('matches the pure reference model across 100 randomized action sequences', () => {
		const actionArb = fc.oneof(
			fc.constantFrom('', 'Fruit', 'Vegetable', 'a', 'e', 'Z').map((value) => ({
				type: 'setQuery' as const,
				value,
			})),
			fc.constantFrom<'name' | 'price'>('name', 'price').map((key) => ({
				type: 'sort' as const,
				key,
			})),
			fc.constant({ type: 'next' as const }),
			fc.constant({ type: 'prev' as const }),
		);

		fc.assert(
			fc.property(fc.array(actionArb, { minLength: 1, maxLength: 15 }), (actions) => {
				cleanup();
				const model = new PureReferenceModel(BASE_ITEMS);
				render(<ListHarness items={BASE_ITEMS} pageSize={3} />);

				const searchInput = screen.getByRole('textbox', { name: 'search' });
				const sortNameBtn = screen.getByRole('button', { name: 'sort-name' });
				const sortPriceBtn = screen.getByRole('button', { name: 'sort-price' });
				const nextBtn = screen.getByRole('button', { name: 'next-page' });
				const prevBtn = screen.getByRole('button', { name: 'prev-page' });

				for (const action of actions) {
					model.apply(action);

					act(() => {
						switch (action.type) {
							case 'setQuery':
								fireEvent.change(searchInput, { target: { value: action.value } });
								break;
							case 'sort':
								if (action.key === 'name') fireEvent.click(sortNameBtn);
								else fireEvent.click(sortPriceBtn);
								break;
							case 'next':
								fireEvent.click(nextBtn);
								break;
							case 'prev':
								fireEvent.click(prevBtn);
								break;
						}
					});
				}

				// Assert visible DOM matches pure reference model output
				const renderedIds = screen
					.queryAllByRole('listitem')
					.map((li) => Number(li.getAttribute('data-testid')?.replace('item-', '')));
				const modelIds = model.currentRows.map((r) => r.id);

				expect(renderedIds).toEqual(modelIds);
				expect(screen.getByTestId('page-indicator').textContent).toBe(
					`${model.page}/${model.totalPages}`,
				);
			}),
			{ numRuns: 100 },
		);
	});
});
