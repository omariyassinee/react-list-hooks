import type { ReactNode } from 'react';

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
	/** Internal: params owned by other pipeline stages. When keepOtherParams is false, these are still preserved so sibling stages don't wipe each other. Populated by useList; standalone hooks leave it empty. */
	preserveParams?: string[];
}

export type PaginationRangeItem = number | 'ellipsis';

export interface UsePaginateOptions {
	/** Number of items per page. Defaults to 10. */
	pageSize?: number;
	/** Initial page number (1-indexed). Defaults to 1. Clamped to valid range. */
	initialPage?: number;
	/** Number of sibling page numbers to display on each side of the current page. Defaults to 1. */
	siblingCount?: number;
	/** Number of boundary page numbers to always display at the beginning and end. Defaults to 1. */
	boundaryCount?: number;
	/** URL Search Params sync configuration. Can be a boolean flag or UrlSyncOptions object. */
	urlSync?: boolean | UrlSyncOptions;
}

export interface UsePaginateState {
	/** The current page number (1-indexed). */
	currentPage: number;
	/** Total number of pages. Always >= 1. */
	totalPages: number;
	/** Total number of items in the source array. */
	totalItems: number;
	/** Current page size. */
	pageSize: number;
	/** Whether there is a next page available. */
	hasNext: boolean;
	/** Whether there is a previous page available. */
	hasPrev: boolean;
	/** Whether the current page is the first page. */
	isFirstPage: boolean;
	/** Whether the current page is the last page. */
	isLastPage: boolean;
	/** Array of all page numbers, e.g. [1, 2, 3, 4, 5]. */
	pageNumbers: number[];
	/** Smart windowed pagination range with ellipses, e.g. [1, 'ellipsis', 4, 5, 6, 'ellipsis', 50]. */
	paginationRange: PaginationRangeItem[];
	/** Whether URL search params synchronization is active. */
	isUrlSyncEnabled: boolean;
}

export interface UsePaginateMethods {
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
	/** Update the page size. Preserves the user's approximate position. */
	setPageSize: (size: number) => void;
	/** Restore the initial page size (options.pageSize or the default of 10). Preserves the user's approximate position. */
	resetPageSize: () => void;
	/** Helper function to generate a shareable URL string for a target page and page size, with optional base URL. */
	getShareableUrl: (targetPage?: number, targetPageSize?: number, baseUrl?: string) => string;
}

export interface UsePaginateReturn<T> {
	/** The current page slice. */
	paginatedItems: T[];
	/** Stateful properties (page number, counts, flags, ranges). */
	state: UsePaginateState;
	/** Methods (navigation, page size controls, URL helpers). */
	methods: UsePaginateMethods;
}

export type SortDirection = 'asc' | 'desc';

export interface SortUrlSyncOptions {
	/** Whether to enable URL parameter syncing for sorting. Defaults to false. */
	enabled?: boolean;
	/** Custom search param key for the sort key/field. Defaults to 'sortBy'. */
	sortKeyParam?: string;
	/** Custom search param key for sort direction. Defaults to 'sortDir'. */
	directionParam?: string;
	/** History navigation method: 'replace' (default) or 'push'. */
	historyMode?: 'replace' | 'push';
	/** Whether to keep other existing query parameters in the URL. Defaults to true. */
	keepOtherParams?: boolean;
	/** Internal: params owned by other pipeline stages. When keepOtherParams is false, these are still preserved so sibling stages don't wipe each other. Populated by useList; standalone hooks leave it empty. */
	preserveParams?: string[];
}

export interface UseSortOptions<T> {
	/** The initial field/key of T to sort by. */
	initialKey?: keyof T | null;
	/** The initial sort direction. Defaults to 'asc'. */
	initialDirection?: SortDirection | null;
	/** Custom comparator functions for specific keys. */
	comparators?: Partial<Record<keyof T, (a: T, b: T) => number>>;
	/** Debounce delay in milliseconds before applying sort changes on large lists. Defaults to 0 (synchronous). */
	debounceMs?: number;
	/** Whether to use React 18/19 startTransition to keep UI non-blocking during heavy sorts. Defaults to false. */
	useTransition?: boolean;
	/** URL Search Params sync configuration. Can be a boolean flag or SortUrlSyncOptions object. */
	urlSync?: boolean | SortUrlSyncOptions;
}

export interface UseSortState<T> {
	/** The current key of T being sorted by. */
	sortKey: keyof T | null;
	/** The current direction of sorting. */
	sortDirection: SortDirection | null;
	/** The key the sorted output is currently ordered by (post-debounce). May lag sortKey while a debounce is pending. */
	activeSortKey: keyof T | null;
	/** The direction the sorted output is currently ordered by (post-debounce). May lag sortDirection while a debounce is pending. */
	activeSortDirection: SortDirection | null;
	/** Indicates whether a debounce or sort transition is currently pending/processing. */
	isSorting: boolean;
}

export interface UseSortMethods<T> {
	/** Sort by a key, with an optional explicit direction. */
	setSort: (key: keyof T, direction?: SortDirection) => void;
	/** Toggle sorting on a key (cycles: asc -> desc -> clear/default). */
	toggleSort: (key: keyof T) => void;
	/** Reset/clear sorting. */
	clearSort: () => void;
	/** Helper to get current sort indicator for a key. */
	getSortIndicator: (key: keyof T) => SortDirection | null;
}

export interface UseSortReturn<T> {
	/** The sorted items. */
	sortedItems: T[];
	/** Stateful properties (sort key/direction, applied state, flags). */
	state: UseSortState<T>;
	/** Methods (sort controls). */
	methods: UseSortMethods<T>;
}

export type FilterKey<T> = (keyof T & string) | (string & {});

export interface FilterUrlSyncOptions<K extends string = string> {
	/** Whether to enable URL parameter syncing for filters. Defaults to false. */
	enabled?: boolean;
	/** Custom search param key for global text query. Defaults to 'q'. */
	queryParam?: string;
	/** Custom URL search param name mapping for structured filter keys. */
	paramMap?: Partial<Record<K, string>>;
	/** Filter keys (unmapped ones included) that should be restored from the URL. A filter round-trips through the URL only if its key is declared in paramMap, initialFilters, or restoreKeys. */
	restoreKeys?: Array<K>;
	/** History navigation method: 'replace' (default) or 'push'. */
	historyMode?: 'replace' | 'push';
	/** Whether to keep other existing query parameters in the URL. Defaults to true. */
	keepOtherParams?: boolean;
	/** Internal: params owned by other pipeline stages. When keepOtherParams is false, these are still preserved so sibling stages don't wipe each other. Populated by useList; standalone hooks leave it empty. */
	preserveParams?: string[];
}

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
	/** Debounce delay in milliseconds for global text search. Defaults to 0 (synchronous filtering). */
	debounceMs?: number;
	/** Whether to use React 18/19 startTransition to keep UI non-blocking during heavy filtering. Defaults to false. */
	useTransition?: boolean;
	/** URL Search Params sync configuration. Can be a boolean flag or FilterUrlSyncOptions object. */
	urlSync?: boolean | FilterUrlSyncOptions<K | FilterKey<T>>;
}

export interface UseFilterState<T, K extends string = string> {
	/** The current global text search query. */
	query: string;
	/** The query the filtered output reflects (post-debounce). May lag query while a debounce is pending. */
	appliedQuery: string;
	/** The active structured field filter values. */
	filters: Partial<Record<K | FilterKey<T>, unknown>>;
	/** Whether a debounce filtering computation is currently pending. */
	isFiltering: boolean;
}

export interface UseFilterMethods<T, K extends string = string> {
	/** Set the global text search query. */
	setQuery: (query: string) => void;
	/** Set a filter value for a specific field of T or custom filter key. */
	setFilter: (key: K | FilterKey<T>, value: unknown) => void;
	/** Clear a filter value for a specific field of T or custom filter key. */
	clearFilter: (key: K | FilterKey<T>) => void;
	/** Clear all field-specific filters (keeps search query). */
	clearFilters: () => void;
	/** Reset both search query and all filters. */
	clearAll: () => void;
}

export interface UseFilterReturn<T, K extends string = string> {
	/** The filtered items. */
	filteredItems: T[];
	/** Stateful properties (query, filters, flags). */
	state: UseFilterState<T, K>;
	/** Methods (query and filter controls). */
	methods: UseFilterMethods<T, K>;
}

// ─── useList (Master Pipeline Hook) ──────────────────────────────────────────

export interface ListUrlSyncOptions<K extends string = string> {
	/** Whether to enable URL parameter syncing across the pipeline. Defaults to false. */
	enabled?: boolean;
	/** History navigation method: 'replace' (default) or 'push'. */
	historyMode?: 'replace' | 'push';
	/** Whether to keep other existing query parameters in the URL. Defaults to true. */
	keepOtherParams?: boolean;

	// Filter params
	/** Custom search param key for global text query. Defaults to 'q'. */
	queryParam?: string;
	/** Custom URL search param name mapping for structured filter keys. */
	filterParamMap?: Partial<Record<K, string>>;

	// Sort params
	/** Custom search param key for the sort key/field. Defaults to 'sortBy'. */
	sortKeyParam?: string;
	/** Custom search param key for sort direction. Defaults to 'sortDir'. */
	directionParam?: string;

	// Paginate params
	/** Custom search param key for page number. Defaults to 'page'. */
	pageParam?: string;
	/** Custom search param key for page size. Defaults to 'pageSize'. */
	pageSizeParam?: string;
	/** Whether to sync pageSize in URL as well. Defaults to true. */
	syncPageSize?: boolean;
}

export interface UseListOptions<T, K extends string = string> {
	/** Configuration for the filter stage. Omit to disable filtering. */
	filter?: Omit<UseFilterOptions<T, K>, 'urlSync'>;
	/** Configuration for the sort stage. Omit to disable sorting. */
	sort?: Omit<UseSortOptions<T>, 'urlSync'>;
	/** Configuration for the paginate stage. Omit to use default pagination (pageSize: 10). */
	paginate?: Omit<UsePaginateOptions, 'urlSync'>;
	/** Unified URL Search Params sync configuration across all pipeline stages. */
	urlSync?: boolean | ListUrlSyncOptions<K | FilterKey<T>>;
}

export interface UseListReturn<T, K extends string = string> {
	// Pipeline stage outputs
	/** The paginate stage result: paginatedItems + state + methods (from usePaginate). */
	data: UsePaginateReturn<T>;
	/** The filter stage result: filteredItems + state + methods (from useFilter). */
	filter: UseFilterReturn<T, K>;
	/** The sort stage result: sortedItems + state + methods (from useSort). */
	sort: UseSortReturn<T>;

	// Filter access
	/** The current global text search query. */
	query: string;
	/** Set the global text search query. Resets pagination to page 1. */
	setQuery: (query: string) => void;
	/** The active structured field filter values. */
	filters: Partial<Record<K | FilterKey<T>, unknown>>;
	/** Set a filter value for a specific field. Resets pagination to page 1. */
	setFilter: (key: K | FilterKey<T>, value: unknown) => void;
	/** Clear a filter value for a specific field. Resets pagination to page 1. */
	clearFilter: (key: K | FilterKey<T>) => void;
	/** Clear all field-specific filters (keeps search query). Resets pagination to page 1. */
	clearFilters: () => void;

	// Sort access
	/** The current key of T being sorted by. */
	sortKey: keyof T | null;
	/** The current direction of sorting. */
	sortDirection: SortDirection | null;
	/** Sort by a key, with an optional explicit direction. Resets pagination to page 1. */
	setSort: (key: keyof T, direction?: SortDirection) => void;
	/** Toggle sorting on a key (cycles: asc → desc → clear). Resets pagination to page 1. */
	toggleSort: (key: keyof T) => void;
	/** Reset/clear sorting. Resets pagination to page 1. */
	clearSort: () => void;
	/** Helper to get current sort indicator for a key. */
	getSortIndicator: (key: keyof T) => SortDirection | null;

	// Paginate access (proxied from data for convenience)
	/** The current page number (1-indexed). */
	currentPage: number;
	/** Total number of pages. Always >= 1. */
	totalPages: number;
	/** Total number of items in the source array (after filter+sort, before paginate). */
	totalItems: number;
	/** Current page size. */
	pageSize: number;
	/** Whether there is a next page available. */
	hasNext: boolean;
	/** Whether there is a previous page available. */
	hasPrev: boolean;
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
	/** Update the page size. Preserves the user's approximate position. */
	setPageSize: (size: number) => void;
	/** Restore the initial page size (options.pageSize or the default of 10). Preserves the user's approximate position. */
	resetPageSize: () => void;
	/** Array of all page numbers, e.g. [1, 2, 3, 4, 5]. */
	pageNumbers: number[];
	/** Smart windowed pagination range with ellipses, e.g. [1, 'ellipsis', 4, 5, 6, 'ellipsis', 50]. */
	paginationRange: PaginationRangeItem[];

	// Pipeline metadata
	/** Number of items after filtering (before sort+paginate). */
	filteredCount: number;
	/** Whether a debounce/transition is currently pending (isFiltering || isSorting). */
	isProcessing: boolean;

	// Unified actions
	/** Reset all filters, sorting, and pagination to initial state. */
	resetAll: () => void;
}

// ─── Context Providers ───────────────────────────────────────────────────────

/** Render-prop or standard ReactNode children for providers. */
export type ContextChildren<Ctx> = ReactNode | ((context: Ctx) => ReactNode);

// ─── Paginate Provider Props ─────────────────────────────────────────────────

export interface PaginateProviderValueProps<T> {
	/** Pass an existing usePaginate() return value. */
	value: UsePaginateReturn<T>;
	items?: never;
	options?: never;
	children: ContextChildren<UsePaginateReturn<T>>;
}

export interface PaginateProviderManagedProps<T> extends UsePaginateOptions {
	/** Source array to paginate (managed mode). */
	items: T[];
	/** Optional UsePaginateOptions object (can also be passed as top-level props). */
	options?: UsePaginateOptions;
	value?: never;
	children: ContextChildren<UsePaginateReturn<T>>;
}

export type PaginateProviderProps<T> = PaginateProviderValueProps<T> | PaginateProviderManagedProps<T>;

// ─── Sort Provider Props ─────────────────────────────────────────────────────

export interface SortProviderValueProps<T> {
	/** Pass an existing useSort() return value. */
	value: UseSortReturn<T>;
	items?: never;
	options?: never;
	children: ContextChildren<UseSortReturn<T>>;
}

export interface SortProviderManagedProps<T> extends UseSortOptions<T> {
	/** Source array to sort (managed mode). */
	items: T[];
	/** Optional UseSortOptions object (can also be passed as top-level props). */
	options?: UseSortOptions<T>;
	value?: never;
	children: ContextChildren<UseSortReturn<T>>;
}

export type SortProviderProps<T> = SortProviderValueProps<T> | SortProviderManagedProps<T>;

// ─── Filter Provider Props ───────────────────────────────────────────────────

export interface FilterProviderValueProps<T, K extends string = FilterKey<T>> {
	/** Pass an existing useFilter() return value. */
	value: UseFilterReturn<T, K>;
	items?: never;
	options?: never;
	children: ContextChildren<UseFilterReturn<T, K>>;
}

export interface FilterProviderManagedProps<T, K extends string = FilterKey<T>>
	extends UseFilterOptions<T, K> {
	/** Source array to filter (managed mode). */
	items: T[];
	/** Optional UseFilterOptions object (can also be passed as top-level props). */
	options?: UseFilterOptions<T, K>;
	value?: never;
	children: ContextChildren<UseFilterReturn<T, K>>;
}

export type FilterProviderProps<T, K extends string = FilterKey<T>> =
	| FilterProviderValueProps<T, K>
	| FilterProviderManagedProps<T, K>;

// ─── List Provider Props ─────────────────────────────────────────────────────

export interface ListProviderValueProps<T, K extends string = FilterKey<T>> {
	/** Pass an existing useList() return value. */
	value: UseListReturn<T, K>;
	items?: never;
	options?: never;
	children: ContextChildren<UseListReturn<T, K>>;
}

export interface ListProviderManagedProps<T, K extends string = FilterKey<T>> extends UseListOptions<T, K> {
	/** Source array for the full pipeline (managed mode). */
	items: T[];
	/** Optional UseListOptions object (can also be passed as top-level props). */
	options?: UseListOptions<T, K>;
	value?: never;
	children: ContextChildren<UseListReturn<T, K>>;
}

export type ListProviderProps<T, K extends string = FilterKey<T>> =
	| ListProviderValueProps<T, K>
	| ListProviderManagedProps<T, K>;

// ─── Context Factory Return Types ────────────────────────────────────────────

export interface CreatedPaginateContext<T> {
	PaginateProvider: (props: PaginateProviderProps<T>) => ReactNode;
	usePaginateContext: () => UsePaginateReturn<T>;
	usePaginateState: () => UsePaginateState;
	usePaginateMethods: () => UsePaginateMethods;
}

export interface CreatedSortContext<T> {
	SortProvider: (props: SortProviderProps<T>) => ReactNode;
	useSortContext: () => UseSortReturn<T>;
	useSortState: () => UseSortState<T>;
	useSortMethods: () => UseSortMethods<T>;
}

export interface CreatedFilterContext<T, K extends string = FilterKey<T>> {
	FilterProvider: (props: FilterProviderProps<T, K>) => ReactNode;
	useFilterContext: () => UseFilterReturn<T, K>;
	useFilterState: () => UseFilterState<T, K>;
	useFilterMethods: () => UseFilterMethods<T, K>;
}

export interface CreatedListContext<T, K extends string = FilterKey<T>> {
	ListProvider: (props: ListProviderProps<T, K>) => ReactNode;
	useListContext: () => UseListReturn<T, K>;
	useFilterContext: () => UseFilterReturn<T, K>;
	useSortContext: () => UseSortReturn<T>;
	usePaginateContext: () => UsePaginateReturn<T>;
}
