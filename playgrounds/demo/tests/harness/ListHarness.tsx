import { useList } from "@omariyassine/react-list-hooks";

export interface TestItem {
  id: number;
  name: string;
  category: string;
  price: number;
}

export interface ListHarnessProps {
  items: TestItem[];
  pageSize?: number;
  initialQuery?: string;
  initialSortKey?: keyof TestItem;
  initialSortDir?: "asc" | "desc";
}

export function ListHarness({
  items,
  pageSize = 5,
  initialQuery = "",
  initialSortKey,
  initialSortDir,
}: ListHarnessProps) {
  const list = useList<TestItem>(items, {
    filter: {
      searchFields: ["name", "category"],
      initialQuery,
    },
    sort: {
      initialKey: initialSortKey,
      initialDirection: initialSortDir,
    },
    paginate: {
      pageSize,
    },
  });

  const rows = list.data.paginatedItems;

  return (
    <div>
      <input
        aria-label="search"
        placeholder="Search..."
        value={list.query}
        onChange={(e) => list.setQuery(e.target.value)}
      />
      <button
        type="button"
        onClick={() => list.setQuery("")}
        aria-label="clear-filter"
      >
        Clear filter
      </button>

      <button
        type="button"
        onClick={() => list.toggleSort("name")}
        aria-label="sort-name"
      >
        Sort name
      </button>
      <button
        type="button"
        onClick={() => list.toggleSort("price")}
        aria-label="sort-price"
      >
        Sort price
      </button>
      <button
        type="button"
        onClick={() => list.clearSort()}
        aria-label="clear-sort"
      >
        Clear sort
      </button>

      <ul data-testid="rows" aria-label="item-list">
        {rows.map((r) => (
          <li key={r.id} data-testid={`item-${r.id}`}>
            <span data-field="name">{r.name}</span>
            <span data-field="price">{r.price}</span>
            <span data-field="category">{r.category}</span>
          </li>
        ))}
      </ul>

      {rows.length === 0 && <div data-testid="empty-state">No items found</div>}

      <div data-testid="pagination-controls">
        <button
          type="button"
          onClick={list.prev}
          disabled={!list.hasPrev}
          aria-label="prev-page"
        >
          Prev
        </button>
        <span data-testid="page-indicator">
          {list.currentPage}/{list.totalPages}
        </span>
        <span data-testid="total-items">Total: {list.totalItems}</span>
        <span data-testid="filtered-count">Filtered: {list.filteredCount}</span>
        <button
          type="button"
          onClick={list.next}
          disabled={!list.hasNext}
          aria-label="next-page"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => list.setPageSize(10)}
          aria-label="set-page-size-10"
        >
          Page Size 10
        </button>
      </div>
    </div>
  );
}
