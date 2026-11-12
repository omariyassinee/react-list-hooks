import { useState } from 'react';
import { describe, it, expect, afterEach } from 'bun:test';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';

import {
	PaginateProvider,
	usePaginateContext,
	usePaginateState,
	usePaginateMethods,
	SortProvider,
	useSortContext,
	useSortState,
	useSortMethods,
	FilterProvider,
	useFilterContext,
	useFilterState,
	useFilterMethods,
	ListProvider,
	useListContext,
	createPaginateContext,
	createSortContext,
	createFilterContext,
	createListContext,
	usePaginate,
	useSort,
	useFilter,
	useList,
} from '../index';

// render() mounts into the DOM — clean up between tests so elements from one
// test don't leak into the next (bun test doesn't auto-register RTL cleanup).
afterEach(() => {
	cleanup();
	window.history.replaceState({}, '', '/');
});

// Helper to generate a numbered array [1, 2, ..., n]
function items(n: number): number[] {
	return Array.from({ length: n }, (_, i) => i + 1);
}

interface Product {
	id: number;
	name: string;
	category: string;
	price: number;
}

const PRODUCTS: Product[] = [
	{ id: 1, name: 'Alpha', category: 'Gadgets', price: 100 },
	{ id: 2, name: 'Beta', category: 'Audio', price: 50 },
	{ id: 3, name: 'Gamma', category: 'Gadgets', price: 200 },
	{ id: 4, name: 'Delta', category: 'Audio', price: 25 },
	{ id: 5, name: 'Epsilon', category: 'Wearables', price: 75 },
	{ id: 6, name: 'Zeta', category: 'Gadgets', price: 150 },
];

// ─── 1. Standalone Providers ─────────────────────────────────────────────────

describe('PaginateProvider', () => {
	it('managed mode: provides paginated state to children', () => {
		function Consumer() {
			const { state, methods } = usePaginateContext();
			return (
				<div>
					<span data-testid="page">{state.currentPage}</span>
					<span data-testid="total">{state.totalPages}</span>
					<button type="button" onClick={methods.next}>
						next
					</button>
				</div>
			);
		}

		render(
			<PaginateProvider items={items(25)} pageSize={10}>
				<Consumer />
			</PaginateProvider>,
		);

		expect(screen.getByTestId('page').textContent).toBe('1');
		expect(screen.getByTestId('total').textContent).toBe('3');
		act(() => screen.getByText('next').click());
		expect(screen.getByTestId('page').textContent).toBe('2');
	});

	it('managed mode: accepts options prop object', () => {
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="total">{state.totalPages}</span>;
		}

		render(
			<PaginateProvider items={items(30)} options={{ pageSize: 10 }}>
				<Consumer />
			</PaginateProvider>,
		);

		expect(screen.getByTestId('total').textContent).toBe('3');
	});

	it('controlled mode: accepts a usePaginate() return value via value prop', () => {
		function Harness() {
			const paginate = usePaginate(items(10), { pageSize: 5 });
			return (
				<PaginateProvider value={paginate}>
					<Consumer />
				</PaginateProvider>
			);
		}
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="page">{state.currentPage}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('controlled mode: reacts to dynamic value prop updates from parent', () => {
		function Harness() {
			const paginate = usePaginate(items(20), { pageSize: 5 });
			return (
				<div>
					<button type="button" onClick={() => paginate.methods.goToPage(3)}>
						jump
					</button>
					<PaginateProvider value={paginate}>
						<Consumer />
					</PaginateProvider>
				</div>
			);
		}
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="page">{state.currentPage}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('page').textContent).toBe('1');
		act(() => screen.getByText('jump').click());
		expect(screen.getByTestId('page').textContent).toBe('3');
	});

	it('render-prop children receive the context value', () => {
		render(
			<PaginateProvider items={items(10)} pageSize={5}>
				{(ctx) => <span data-testid="rp">{ctx.state.totalPages}</span>}
			</PaginateProvider>,
		);
		expect(screen.getByTestId('rp').textContent).toBe('2');
	});

	it('usePaginateState and usePaginateMethods granular hooks work', () => {
		function Consumer() {
			const state = usePaginateState();
			const methods = usePaginateMethods();
			return (
				<div>
					<span data-testid="page">{state.currentPage}</span>
					<button type="button" onClick={methods.next}>
						next
					</button>
				</div>
			);
		}
		render(
			<PaginateProvider items={items(10)} pageSize={5}>
				<Consumer />
			</PaginateProvider>,
		);
		expect(screen.getByTestId('page').textContent).toBe('1');
		act(() => screen.getByText('next').click());
		expect(screen.getByTestId('page').textContent).toBe('2');
	});

	it('managed mode: reacts to items prop changes', () => {
		function Harness() {
			const [count, setCount] = useState(10);
			return (
				<div>
					<button type="button" onClick={() => setCount(30)}>
						more
					</button>
					<PaginateProvider items={items(count)} pageSize={5}>
						<Consumer />
					</PaginateProvider>
				</div>
			);
		}
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="total">{state.totalPages}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('total').textContent).toBe('2');
		act(() => screen.getByText('more').click());
		expect(screen.getByTestId('total').textContent).toBe('6');
	});
});

describe('SortProvider', () => {
	it('managed mode: provides sorted items and sort controls', () => {
		function Consumer() {
			const { sortedItems, state, methods } = useSortContext<Product>();
			return (
				<div>
					<span data-testid="first">{sortedItems[0]?.name}</span>
					<span data-testid="key">{String(state.sortKey)}</span>
					<button type="button" onClick={() => methods.toggleSort('price')}>
						toggle
					</button>
				</div>
			);
		}

		render(
			<SortProvider items={PRODUCTS} initialKey="price" initialDirection="desc">
				<Consumer />
			</SortProvider>,
		);

		expect(screen.getByTestId('first').textContent).toBe('Gamma');
		expect(screen.getByTestId('key').textContent).toBe('price');
		act(() => screen.getByText('toggle').click());
		// toggleSort cycles asc -> desc -> clear. From desc, toggling clears the
		// sort, so items return to original order (Alpha first).
		expect(screen.getByTestId('first').textContent).toBe('Alpha');
		expect(screen.getByTestId('key').textContent).toBe('null');
	});

	it('managed mode: accepts options prop object', () => {
		function Consumer() {
			const { sortedItems } = useSortContext<Product>();
			return <span data-testid="first">{sortedItems[0]?.name}</span>;
		}

		render(
			<SortProvider items={PRODUCTS} options={{ initialKey: 'price', initialDirection: 'asc' }}>
				<Consumer />
			</SortProvider>,
		);

		expect(screen.getByTestId('first').textContent).toBe('Delta');
	});

	it('controlled mode: accepts a useSort() return value', () => {
		function Harness() {
			const sort = useSort<Product>(PRODUCTS, { initialKey: 'name', initialDirection: 'asc' });
			return (
				<SortProvider value={sort}>
					<Consumer />
				</SortProvider>
			);
		}
		function Consumer() {
			const { sortedItems } = useSortContext<Product>();
			return <span data-testid="first">{sortedItems[0]?.name}</span>;
		}
		render(<Harness />);
		expect(screen.getByTestId('first').textContent).toBe('Alpha');
	});

	it('controlled mode: reacts to dynamic value prop updates from parent', () => {
		function Harness() {
			const sort = useSort<Product>(PRODUCTS);
			return (
				<div>
					<button type="button" onClick={() => sort.methods.setSort('price', 'asc')}>
						sort-by-price
					</button>
					<SortProvider value={sort}>
						<Consumer />
					</SortProvider>
				</div>
			);
		}
		function Consumer() {
			const { sortedItems } = useSortContext<Product>();
			return <span data-testid="first">{sortedItems[0]?.name}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('first').textContent).toBe('Alpha');
		act(() => screen.getByText('sort-by-price').click());
		expect(screen.getByTestId('first').textContent).toBe('Delta');
	});

	it('render-prop children receive the context value', () => {
		render(
			<SortProvider items={PRODUCTS} initialKey="price" initialDirection="desc">
				{(ctx) => <span data-testid="rp">{ctx.state.sortKey}</span>}
			</SortProvider>,
		);
		expect(screen.getByTestId('rp').textContent).toBe('price');
	});

	it('useSortState and useSortMethods granular hooks work', () => {
		function Consumer() {
			const state = useSortState<Product>();
			const methods = useSortMethods<Product>();
			return (
				<div>
					<span data-testid="key">{String(state.sortKey)}</span>
					<button type="button" onClick={() => methods.toggleSort('price')}>
						toggle
					</button>
				</div>
			);
		}
		render(
			<SortProvider items={PRODUCTS} initialKey="price">
				<Consumer />
			</SortProvider>,
		);
		expect(screen.getByTestId('key').textContent).toBe('price');
		act(() => screen.getByText('toggle').click());
		expect(screen.getByTestId('key').textContent).toBe('price');
	});
});

describe('FilterProvider', () => {
	it('managed mode: provides filtered items and filter controls', () => {
		function Consumer() {
			const { filteredItems, state, methods } = useFilterContext<Product>();
			return (
				<div>
					<span data-testid="count">{filteredItems.length}</span>
					<input data-testid="input" value={state.query} onChange={(e) => methods.setQuery(e.target.value)} />
				</div>
			);
		}

		render(
			<FilterProvider items={PRODUCTS} searchFields={['name']}>
				<Consumer />
			</FilterProvider>,
		);

		expect(screen.getByTestId('count').textContent).toBe('6');
		act(() => {
			fireEvent.change(screen.getByTestId('input'), { target: { value: 'Alpha' } });
		});
		expect(screen.getByTestId('count').textContent).toBe('1');
	});

	it('managed mode: accepts options prop object', () => {
		function Consumer() {
			const { filteredItems } = useFilterContext<Product>();
			return <span data-testid="count">{filteredItems.length}</span>;
		}

		render(
			<FilterProvider items={PRODUCTS} options={{ searchFields: ['name'], initialQuery: 'Alpha' }}>
				<Consumer />
			</FilterProvider>,
		);

		expect(screen.getByTestId('count').textContent).toBe('1');
	});

	it('controlled mode: accepts a useFilter() return value', () => {
		function Harness() {
			const filter = useFilter<Product>(PRODUCTS, { searchFields: ['name'] });
			return (
				<FilterProvider value={filter}>
					<Consumer />
				</FilterProvider>
			);
		}
		function Consumer() {
			const { filteredItems } = useFilterContext<Product>();
			return <span data-testid="count">{filteredItems.length}</span>;
		}
		render(<Harness />);
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('controlled mode: reacts to dynamic value prop updates from parent', () => {
		function Harness() {
			const filter = useFilter<Product>(PRODUCTS, { searchFields: ['name'], initialQuery: 'Alpha' });
			return (
				<div>
					<button type="button" onClick={() => filter.methods.setQuery('')}>
						clear
					</button>
					<FilterProvider value={filter}>
						<Consumer />
					</FilterProvider>
				</div>
			);
		}
		function Consumer() {
			const { filteredItems } = useFilterContext<Product>();
			return <span data-testid="count">{filteredItems.length}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('count').textContent).toBe('1');
		act(() => screen.getByText('clear').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('render-prop children receive the context value', () => {
		render(
			<FilterProvider items={PRODUCTS} initialQuery="Alpha">
				{(ctx) => <span data-testid="rp">{ctx.state.query}</span>}
			</FilterProvider>,
		);
		expect(screen.getByTestId('rp').textContent).toBe('Alpha');
	});

	it('useFilterState and useFilterMethods granular hooks work', () => {
		function Consumer() {
			const state = useFilterState<Product>();
			const methods = useFilterMethods<Product>();
			return (
				<div>
					<span data-testid="query">{state.query}</span>
					<button type="button" onClick={methods.clearAll}>
						clear
					</button>
				</div>
			);
		}
		render(
			<FilterProvider items={PRODUCTS} initialQuery="Alpha">
				<Consumer />
			</FilterProvider>,
		);
		expect(screen.getByTestId('query').textContent).toBe('Alpha');
		act(() => screen.getByText('clear').click());
		expect(screen.getByTestId('query').textContent).toBe('');
	});
});

// ─── 2. ListProvider & The Pipeline Bridge ───────────────────────────────────

describe('ListProvider & Pipeline Bridge', () => {
	it('children calling useListContext receive full pipeline state', () => {
		function Consumer() {
			const list = useListContext<Product>();
			return (
				<div>
					<span data-testid="count">{list.filteredCount}</span>
					<span data-testid="page">{list.currentPage}</span>
					<button type="button" onClick={list.resetAll}>
						reset
					</button>
				</div>
			);
		}

		render(
			<ListProvider
				items={PRODUCTS}
				filter={{ searchFields: ['name'] }}
				sort={{ initialKey: 'price', initialDirection: 'asc' }}
				paginate={{ pageSize: 2 }}
			>
				<Consumer />
			</ListProvider>,
		);

		expect(screen.getByTestId('count').textContent).toBe('6');
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('managed mode: accepts options prop object', () => {
		function Consumer() {
			const list = useListContext<Product>();
			return <span data-testid="total">{list.totalPages}</span>;
		}

		render(
			<ListProvider
				items={PRODUCTS}
				options={{
					paginate: { pageSize: 2 },
				}}
			>
				<Consumer />
			</ListProvider>,
		);

		expect(screen.getByTestId('total').textContent).toBe('3');
	});

	it('bridges filter/sort/paginate contexts so children can use granular hooks', () => {
		function FilterConsumer() {
			const { state, methods } = useFilterContext<Product>();
			return (
				<div>
					<span data-testid="query">{state.query}</span>
					<input data-testid="input" value={state.query} onChange={(e) => methods.setQuery(e.target.value)} />
				</div>
			);
		}
		function SortConsumer() {
			const { state, methods } = useSortContext<Product>();
			return (
				<div>
					<span data-testid="sortkey">{String(state.sortKey)}</span>
					<button type="button" onClick={() => methods.toggleSort('price')}>
						toggle
					</button>
				</div>
			);
		}
		function PaginateConsumer() {
			const { state, methods } = usePaginateContext();
			return (
				<div>
					<span data-testid="page">{state.currentPage}</span>
					<button type="button" onClick={methods.next}>
						next
					</button>
				</div>
			);
		}

		render(
			<ListProvider
				items={PRODUCTS}
				filter={{ searchFields: ['name'] }}
				sort={{ initialKey: 'price', initialDirection: 'asc' }}
				paginate={{ pageSize: 2 }}
			>
				<div>
					<FilterConsumer />
					<SortConsumer />
					<PaginateConsumer />
				</div>
			</ListProvider>,
		);

		expect(screen.getByTestId('query').textContent).toBe('');
		expect(screen.getByTestId('sortkey').textContent).toBe('price');
		expect(screen.getByTestId('page').textContent).toBe('1');

		// Pagination via bridged context
		act(() => screen.getByText('next').click());
		expect(screen.getByTestId('page').textContent).toBe('2');

		// Changing filter via bridged context still works (and resets to page 1)
		act(() => {
			fireEvent.change(screen.getByTestId('input'), { target: { value: 'Alpha' } });
		});
		expect(screen.getByTestId('query').textContent).toBe('Alpha');
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('controlled mode: accepts a useList() return value', () => {
		function Harness() {
			const list = useList<Product>(PRODUCTS, {
				filter: { searchFields: ['name'] },
				paginate: { pageSize: 2 },
			});
			return (
				<ListProvider value={list}>
					<Consumer />
				</ListProvider>
			);
		}
		function Consumer() {
			const list = useListContext<Product>();
			return <span data-testid="count">{list.filteredCount}</span>;
		}
		render(<Harness />);
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('controlled mode: reacts to dynamic value prop updates from parent', () => {
		function Harness() {
			const list = useList<Product>(PRODUCTS, {
				filter: { searchFields: ['name'], initialQuery: 'Alpha' },
			});
			return (
				<div>
					<button type="button" onClick={() => list.setQuery('')}>
						clear
					</button>
					<ListProvider value={list}>
						<Consumer />
					</ListProvider>
				</div>
			);
		}
		function Consumer() {
			const list = useListContext<Product>();
			return <span data-testid="count">{list.filteredCount}</span>;
		}

		render(<Harness />);
		expect(screen.getByTestId('count').textContent).toBe('1');
		act(() => screen.getByText('clear').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('render-prop children receive the list context', () => {
		render(
			<ListProvider items={PRODUCTS} paginate={{ pageSize: 2 }}>
				{(ctx) => <span data-testid="rp">{ctx.totalPages}</span>}
			</ListProvider>,
		);
		expect(screen.getByTestId('rp').textContent).toBe('3');
	});
});

// ─── 3. Error Boundaries ─────────────────────────────────────────────────────

describe('context error boundaries', () => {
	it('usePaginateContext throws outside a provider', () => {
		function Consumer() {
			usePaginateContext();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
	});

	it('usePaginateState throws outside a provider', () => {
		function Consumer() {
			usePaginateState();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
	});

	it('usePaginateMethods throws outside a provider', () => {
		function Consumer() {
			usePaginateMethods();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
	});

	it('useSortContext throws outside a provider', () => {
		function Consumer() {
			useSortContext();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
	});

	it('useSortState throws outside a provider', () => {
		function Consumer() {
			useSortState();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
	});

	it('useSortMethods throws outside a provider', () => {
		function Consumer() {
			useSortMethods();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
	});

	it('useFilterContext throws outside a provider', () => {
		function Consumer() {
			useFilterContext();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
	});

	it('useFilterState throws outside a provider', () => {
		function Consumer() {
			useFilterState();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
	});

	it('useFilterMethods throws outside a provider', () => {
		function Consumer() {
			useFilterMethods();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
	});

	it('useListContext throws outside a provider', () => {
		function Consumer() {
			useListContext();
			return null;
		}
		expect(() => render(<Consumer />)).toThrow(
			'[react-list-hooks] useListContext must be used within a <ListProvider>.',
		);
	});

	it('factory hooks throw outside their respective factory providers', () => {
		const P = createPaginateContext<Product>();
		const S = createSortContext<Product>();
		const F = createFilterContext<Product>();
		const L = createListContext<Product>();

		expect(() => render(<Consumer hook={() => P.usePaginateContext()} />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => P.usePaginateState()} />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => P.usePaginateMethods()} />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);

		expect(() => render(<Consumer hook={() => S.useSortContext()} />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => S.useSortState()} />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => S.useSortMethods()} />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);

		expect(() => render(<Consumer hook={() => F.useFilterContext()} />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => F.useFilterState()} />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => F.useFilterMethods()} />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);

		expect(() => render(<Consumer hook={() => L.useListContext()} />)).toThrow(
			'[react-list-hooks] useListContext must be used within a <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => L.useFilterContext()} />)).toThrow(
			'[react-list-hooks] useFilterContext must be used within a <FilterProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => L.useSortContext()} />)).toThrow(
			'[react-list-hooks] useSortContext must be used within a <SortProvider> or <ListProvider>.',
		);
		expect(() => render(<Consumer hook={() => L.usePaginateContext()} />)).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);

		function Consumer({ hook }: { hook: () => unknown }) {
			hook();
			return null;
		}
	});
});

// ─── 4. Context Factories ────────────────────────────────────────────────────

describe('create*Context factories', () => {
	it('createPaginateContext provides isolated, typed context with state and methods', () => {
		const {
			PaginateProvider: P,
			usePaginateContext: useP,
			usePaginateState: usePS,
			usePaginateMethods: usePM,
		} = createPaginateContext<Product>();

		function Consumer() {
			const { state } = useP();
			const granularState = usePS();
			const methods = usePM();
			return (
				<div>
					<span data-testid="page">{state.currentPage}</span>
					<span data-testid="page-granular">{granularState.currentPage}</span>
					<button type="button" onClick={methods.next}>
						next
					</button>
				</div>
			);
		}

		render(
			<P items={PRODUCTS} pageSize={2}>
				<Consumer />
			</P>,
		);

		expect(screen.getByTestId('page').textContent).toBe('1');
		expect(screen.getByTestId('page-granular').textContent).toBe('1');
		act(() => screen.getByText('next').click());
		expect(screen.getByTestId('page').textContent).toBe('2');
		expect(screen.getByTestId('page-granular').textContent).toBe('2');
	});

	it('createSortContext provides isolated, typed context with state and methods', () => {
		const {
			SortProvider: P,
			useSortContext: useS,
			useSortState: useSS,
			useSortMethods: useSM,
		} = createSortContext<Product>();

		function Consumer() {
			const { sortedItems } = useS();
			const state = useSS();
			const methods = useSM();
			return (
				<div>
					<span data-testid="first">{sortedItems[0]?.name}</span>
					<span data-testid="key">{String(state.sortKey)}</span>
					<button type="button" onClick={() => methods.toggleSort('price')}>
						toggle
					</button>
				</div>
			);
		}

		render(
			<P items={PRODUCTS} initialKey="price" initialDirection="desc">
				<Consumer />
			</P>,
		);

		expect(screen.getByTestId('first').textContent).toBe('Gamma');
		expect(screen.getByTestId('key').textContent).toBe('price');
		act(() => screen.getByText('toggle').click());
		expect(screen.getByTestId('key').textContent).toBe('null');
	});

	it('createFilterContext provides isolated, typed context with state and methods', () => {
		const {
			FilterProvider: P,
			useFilterContext: useF,
			useFilterState: useFS,
			useFilterMethods: useFM,
		} = createFilterContext<Product>();

		function Consumer() {
			const { filteredItems } = useF();
			const state = useFS();
			const methods = useFM();
			return (
				<div>
					<span data-testid="count">{filteredItems.length}</span>
					<span data-testid="query">{state.query}</span>
					<button type="button" onClick={() => methods.setQuery('Alpha')}>
						set
					</button>
				</div>
			);
		}

		render(
			<P items={PRODUCTS} searchFields={['name']}>
				<Consumer />
			</P>,
		);

		expect(screen.getByTestId('count').textContent).toBe('6');
		expect(screen.getByTestId('query').textContent).toBe('');
		act(() => screen.getByText('set').click());
		expect(screen.getByTestId('count').textContent).toBe('1');
		expect(screen.getByTestId('query').textContent).toBe('Alpha');
	});

	it('createListContext provides full pipeline with typed hooks', () => {
		const {
			ListProvider: P,
			useListContext: useL,
			useFilterContext: useF,
			useSortContext: useS,
			usePaginateContext: usePg,
		} = createListContext<Product>();

		function Consumer() {
			const list = useL();
			const filter = useF();
			const sort = useS();
			const paginate = usePg();
			return (
				<div>
					<span data-testid="count">{list.filteredCount}</span>
					<span data-testid="fq">{filter.state.query}</span>
					<span data-testid="sk">{String(sort.state.sortKey)}</span>
					<span data-testid="page">{paginate.state.currentPage}</span>
				</div>
			);
		}

		render(
			<P
				items={PRODUCTS}
				filter={{ searchFields: ['name'] }}
				sort={{ initialKey: 'price' }}
				paginate={{ pageSize: 2 }}
			>
				<Consumer />
			</P>,
		);

		expect(screen.getByTestId('count').textContent).toBe('6');
		expect(screen.getByTestId('fq').textContent).toBe('');
		expect(screen.getByTestId('sk').textContent).toBe('price');
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('two createListContext instances are isolated from each other', () => {
		const A = createListContext<Product>();
		const B = createListContext<Product>();

		function ConsumerA() {
			const { state } = A.usePaginateContext();
			return <span data-testid="a-page">{state.currentPage}</span>;
		}
		function ConsumerB() {
			const { state } = B.usePaginateContext();
			return <span data-testid="b-page">{state.currentPage}</span>;
		}

		render(
			<A.ListProvider items={PRODUCTS} paginate={{ pageSize: 2 }}>
				<B.ListProvider items={PRODUCTS} paginate={{ pageSize: 3 }}>
					<div>
						<ConsumerA />
						<ConsumerB />
					</div>
				</B.ListProvider>
			</A.ListProvider>,
		);

		// A has 6 items / 2 per page = 3 pages; B has 6 / 3 = 2 pages
		expect(screen.getByTestId('a-page').textContent).toBe('1');
		expect(screen.getByTestId('b-page').textContent).toBe('1');
	});

	it('factory context does not satisfy default singleton context and vice versa', () => {
		const Factory = createPaginateContext<Product>();

		function DefaultConsumer() {
			usePaginateContext();
			return null;
		}

		// Rendering default consumer inside factory provider throws
		expect(() =>
			render(
				<Factory.PaginateProvider items={PRODUCTS} pageSize={2}>
					<DefaultConsumer />
				</Factory.PaginateProvider>,
			),
		).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);

		function FactoryConsumer() {
			Factory.usePaginateContext();
			return null;
		}

		// Rendering factory consumer inside default provider throws
		expect(() =>
			render(
				<PaginateProvider items={PRODUCTS} pageSize={2}>
					<FactoryConsumer />
				</PaginateProvider>,
			),
		).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
	});

	it('factory context does not satisfy default singleton context and vice versa', () => {
		const Factory = createPaginateContext<Product>();

		function DefaultConsumer() {
			usePaginateContext();
			return null;
		}

		// Rendering default consumer inside factory provider throws
		expect(() =>
			render(
				<Factory.PaginateProvider items={PRODUCTS} pageSize={2}>
					<DefaultConsumer />
				</Factory.PaginateProvider>,
			),
		).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);

		function FactoryConsumer() {
			Factory.usePaginateContext();
			return null;
		}

		// Rendering factory consumer inside default provider throws
		expect(() =>
			render(
				<PaginateProvider items={PRODUCTS} pageSize={2}>
					<FactoryConsumer />
				</PaginateProvider>,
			),
		).toThrow(
			'[react-list-hooks] usePaginateContext must be used within a <PaginateProvider> or <ListProvider>.',
		);
	});
});

// ─── 5. Referential Stability ────────────────────────────────────────────────

describe('referential stability', () => {
	it('usePaginateMethods returns the same object reference across page navigations', () => {
		let captured: unknown;
		function CaptureConsumer() {
			const methods = usePaginateMethods();
			captured = methods;
			return (
				<button type="button" onClick={methods.next}>
					next
				</button>
			);
		}
		render(
			<PaginateProvider items={items(25)} pageSize={10}>
				<CaptureConsumer />
			</PaginateProvider>,
		);
		const first = captured;
		act(() => screen.getByText('next').click());
		expect(captured).toBe(first);
	});

	it('useSortMethods action callbacks (setSort, toggleSort, clearSort) remain stable across sort updates', () => {
		let capturedSetSort: unknown;
		let capturedToggleSort: unknown;
		let capturedClearSort: unknown;

		function CaptureConsumer() {
			const methods = useSortMethods<Product>();
			capturedSetSort = methods.setSort;
			capturedToggleSort = methods.toggleSort;
			capturedClearSort = methods.clearSort;
			return (
				<button type="button" onClick={() => methods.toggleSort('price')}>
					toggle
				</button>
			);
		}
		render(
			<SortProvider items={PRODUCTS} initialKey="price">
				<CaptureConsumer />
			</SortProvider>,
		);
		const firstSetSort = capturedSetSort;
		const firstToggleSort = capturedToggleSort;
		const firstClearSort = capturedClearSort;

		act(() => screen.getByText('toggle').click());

		expect(capturedSetSort).toBe(firstSetSort);
		expect(capturedToggleSort).toBe(firstToggleSort);
		expect(capturedClearSort).toBe(firstClearSort);
	});

	it('useFilterMethods returns the same object reference across query updates', () => {
		let captured: unknown;
		function CaptureConsumer() {
			const methods = useFilterMethods<Product>();
			captured = methods;
			return (
				<button type="button" onClick={() => methods.setQuery('x')}>
					set
				</button>
			);
		}
		render(
			<FilterProvider items={PRODUCTS} searchFields={['name']}>
				<CaptureConsumer />
			</FilterProvider>,
		);
		const first = captured;
		act(() => screen.getByText('set').click());
		expect(captured).toBe(first);
	});

	it('useListContext exposes stable method references across state updates', () => {
		let capturedResetAll: unknown;
		let capturedNext: unknown;

		function CaptureConsumer() {
			const list = useListContext<Product>();
			capturedResetAll = list.resetAll;
			capturedNext = list.next;
			return (
				<button type="button" onClick={() => list.setQuery('Alpha')}>
					filter
				</button>
			);
		}

		render(
			<ListProvider items={PRODUCTS} filter={{ searchFields: ['name'] }}>
				<CaptureConsumer />
			</ListProvider>,
		);

		const firstReset = capturedResetAll;
		const firstNext = capturedNext;

		act(() => screen.getByText('filter').click());

		expect(capturedResetAll).toBe(firstReset);
		expect(capturedNext).toBe(firstNext);
	});
});

// ─── 6. Rules of Hooks Compliance (Dynamic Mode Switching) ───────────────────

describe('Rules of Hooks compliance (mode switching)', () => {
	it('PaginateProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="page">{state.currentPage}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = usePaginate<Product>(PRODUCTS, { pageSize: 3, initialPage: 2 });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<PaginateProvider value={controlled}>
							<Consumer />
						</PaginateProvider>
					) : (
						<PaginateProvider items={PRODUCTS} pageSize={2}>
							<Consumer />
						</PaginateProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('page').textContent).toBe('1');

		// Switch from managed to controlled — must not throw "Rendered fewer hooks than expected"
		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('page').textContent).toBe('2');

		// Switch back from controlled to managed
		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('SortProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { sortedItems } = useSortContext<Product>();
			return <span data-testid="first">{sortedItems[0]?.name}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useSort<Product>(PRODUCTS, { initialKey: 'price', initialDirection: 'asc' });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<SortProvider value={controlled}>
							<Consumer />
						</SortProvider>
					) : (
						<SortProvider items={PRODUCTS} initialKey="name" initialDirection="desc">
							<Consumer />
						</SortProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('first').textContent).toBe('Zeta');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('first').textContent).toBe('Delta');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('first').textContent).toBe('Zeta');
	});

	it('FilterProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { filteredItems } = useFilterContext<Product>();
			return <span data-testid="count">{filteredItems.length}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useFilter<Product>(PRODUCTS, { searchFields: ['name'], initialQuery: 'Alpha' });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<FilterProvider value={controlled}>
							<Consumer />
						</FilterProvider>
					) : (
						<FilterProvider items={PRODUCTS} searchFields={['name']}>
							<Consumer />
						</FilterProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('count').textContent).toBe('6');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('1');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('ListProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const list = useListContext<Product>();
			return <span data-testid="count">{list.filteredCount}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useList<Product>(PRODUCTS, {
				filter: { searchFields: ['name'], initialQuery: 'Alpha' },
			});

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<ListProvider value={controlled}>
							<Consumer />
						</ListProvider>
					) : (
						<ListProvider items={PRODUCTS}>
							<Consumer />
						</ListProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('count').textContent).toBe('6');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('1');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});
});

// ─── 6. Rules of Hooks Compliance (Dynamic Mode Switching) ───────────────────

describe('Rules of Hooks compliance (mode switching)', () => {
	it('PaginateProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { state } = usePaginateContext();
			return <span data-testid="page">{state.currentPage}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = usePaginate<Product>(PRODUCTS, { pageSize: 3, initialPage: 2 });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<PaginateProvider value={controlled}>
							<Consumer />
						</PaginateProvider>
					) : (
						<PaginateProvider items={PRODUCTS} pageSize={2}>
							<Consumer />
						</PaginateProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('page').textContent).toBe('1');

		// Switch from managed to controlled — must not throw "Rendered fewer hooks than expected"
		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('page').textContent).toBe('2');

		// Switch back from controlled to managed
		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('page').textContent).toBe('1');
	});

	it('SortProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { sortedItems } = useSortContext<Product>();
			return <span data-testid="first">{sortedItems[0]?.name}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useSort<Product>(PRODUCTS, { initialKey: 'price', initialDirection: 'asc' });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<SortProvider value={controlled}>
							<Consumer />
						</SortProvider>
					) : (
						<SortProvider items={PRODUCTS} initialKey="name" initialDirection="desc">
							<Consumer />
						</SortProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('first').textContent).toBe('Zeta');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('first').textContent).toBe('Delta');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('first').textContent).toBe('Zeta');
	});

	it('FilterProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const { filteredItems } = useFilterContext<Product>();
			return <span data-testid="count">{filteredItems.length}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useFilter<Product>(PRODUCTS, { searchFields: ['name'], initialQuery: 'Alpha' });

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<FilterProvider value={controlled}>
							<Consumer />
						</FilterProvider>
					) : (
						<FilterProvider items={PRODUCTS} searchFields={['name']}>
							<Consumer />
						</FilterProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('count').textContent).toBe('6');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('1');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});

	it('ListProvider: safely switches dynamically between managed and controlled mode without hook count mismatch', () => {
		function Consumer() {
			const list = useListContext<Product>();
			return <span data-testid="count">{list.filteredCount}</span>;
		}

		function DynamicHarness() {
			const [isControlled, setIsControlled] = useState(false);
			const controlled = useList<Product>(PRODUCTS, {
				filter: { searchFields: ['name'], initialQuery: 'Alpha' },
			});

			return (
				<div>
					<button type="button" onClick={() => setIsControlled((v) => !v)}>
						toggle-mode
					</button>
					{isControlled ? (
						<ListProvider value={controlled}>
							<Consumer />
						</ListProvider>
					) : (
						<ListProvider items={PRODUCTS}>
							<Consumer />
						</ListProvider>
					)}
				</div>
			);
		}

		render(<DynamicHarness />);
		expect(screen.getByTestId('count').textContent).toBe('6');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('1');

		act(() => screen.getByText('toggle-mode').click());
		expect(screen.getByTestId('count').textContent).toBe('6');
	});
});
