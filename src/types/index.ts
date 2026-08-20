export interface UrlSyncOptions {
	/** Whether to enable URL parameter syncing. Defaults to false. */
	enabled?: boolean;
	/** Custom search param key for page number. Defaults to 'page'. */
	pageParam?: string;
	/** Custom search param key for page size. Defaults to 'pageSize'. */
	pageSizeParam?: string;
	/** Whether to sync pageSize in URL as well. Defaults to true when urlSync is enabled. */
	syncPageSize?: boolean;
	/** History navigation method: 'replace' (default) or 'push'. */
	historyMode?: 'replace' | 'push';
	/** Whether to keep other existing query parameters in the URL. Defaults to true. */
	keepOtherParams?: boolean;
}

export interface UsePaginateOptions {
	/** Number of items per page. Defaults to 10. */
	pageSize?: number;
	/** Initial page number (1-indexed). Defaults to 1. Clamped to valid range. */
	initialPage?: number;
	/** URL Search Params sync configuration. Can be a boolean flag or UrlSyncOptions object. */
	urlSync?: boolean | UrlSyncOptions;
}

export interface UsePaginateReturn<T> extends Array<T> {
	// data
	/** The current page number (1-indexed). */
	currentPage: number;
	/** Total number of pages. Always >= 1. */
	totalPages: number;
	/** Total number of items in the source array. */
	totalItems: number;
	/** Current page size. */
	pageSize: number;

	// status flags
	/** Whether there is a next page available. */
	hasNext: boolean;
	/** Whether there is a previous page available. */
	hasPrev: boolean;
	/** Whether the current page is the first page. */
	isFirstPage: boolean;
	/** Whether the current page is the last page. */
	isLastPage: boolean;

	// navigation
	/** Go to the next page. No-op if already on the last page. */
	next: () => void;
	/** Go to the previous page. No-op if already on the first page. */
	prev: () => void;
	/** Go to a specific page. The page number is clamped to [1, totalPages]. */
	goToPage: (page: number) => void;
	/** Go to the first page. */
	goToStart: () => void;
	/** Go to the last page. */
	goToEnd: () => void;

	// extras
	/** Update the page size. Preserves the user's approximate position. */
	setPageSize: (size: number) => void;
	/** Array of all page numbers, e.g. [1, 2, 3, 4, 5]. */
	pageNumbers: number[];

	// url sync extras
	/** Whether URL search params synchronization is active. */
	isUrlSyncEnabled: boolean;
	/** Helper function to generate a shareable URL string for a target page and page size, with optional base URL. */
	getShareableUrl: (targetPage?: number, targetPageSize?: number, baseUrl?: string) => string;
}

export type SortDirection = 'asc' | 'desc';

export interface UseSortOptions<T> {
	/** The initial field/key of T to sort by. */
	initialKey?: keyof T | null;
	/** The initial sort direction. Defaults to 'asc'. */
	initialDirection?: SortDirection | null;
	/** Custom comparator functions for specific keys. */
	comparators?: Partial<Record<keyof T, (a: T, b: T) => number>>;
}

export interface UseSortReturn<T> {
	/** The sorted array of items. */
	sortedItems: T[];
	/** The current key of T being sorted by. */
	sortKey: keyof T | null;
	/** The current direction of sorting. */
	sortDirection: SortDirection | null;
	/** Sort by a key, with an optional explicit direction. */
	setSort: (key: keyof T, direction?: SortDirection) => void;
	/** Toggle sorting on a key (cycles: asc -> desc -> clear/default). */
	toggleSort: (key: keyof T) => void;
	/** Reset/clear sorting. */
	clearSort: () => void;
	/** Helper to get current sort indicator for a key. */
	getSortIndicator: (key: keyof T) => SortDirection | null;
}

export type FilterKey<T> = (keyof T & string) | (string & {});

export interface UseFilterOptions<T, K extends string = string> {
	/** Default search query. */
	initialQuery?: string;
	/** Default structured filter field values (used on initial mount). */
	initialFilters?: Partial<Record<K | FilterKey<T>, unknown>>;
	/** Custom filter/matching predicate functions for specific keys of T or custom filter keys. */
	// biome-ignore lint/suspicious/noExplicitAny: custom filter predicate can accept arbitrary filter value
	customFilters?: Partial<Record<K | FilterKey<T>, (item: T, filterValue: any) => boolean>>;
	/** Optional custom text search fields. Defaults to all string/number properties of T. */
	searchFields?: Array<keyof T>;
}

export interface UseFilterReturn<T, K extends string = string> {
	/** The filtered array of items matching query and filters. */
	filteredItems: T[];
	/** The current global text search query. */
	query: string;
	/** Set the global text search query. */
	setQuery: (query: string) => void;
	/** The active structured field filter values. */
	filters: Partial<Record<K | FilterKey<T>, unknown>>;
	/** Set a filter value for a specific field of T or custom filter key. */
	setFilter: (key: K | FilterKey<T>, value: unknown) => void;
	/** Clear a filter value for a specific field of T or custom filter key. */
	clearFilter: (key: K | FilterKey<T>) => void;
	/** Clear all field-specific filters (keeps search query). */
	clearFilters: () => void;
	/** Reset both search query and all filters. */
	clearAll: () => void;
}
