import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UrlSyncOptions, UsePaginatorOptions, UsePaginatorReturn } from './types';

const DEFAULT_PAGE_SIZE = 10;

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function sanitizePageSize(size: unknown, fallback: number = DEFAULT_PAGE_SIZE): number {
	if (typeof size !== 'number' || !Number.isFinite(size) || size < 1) {
		return fallback;
	}
	return Math.floor(size);
}

function computeTotalPages(totalItems: number, pageSize: number): number {
	const safeSize = sanitizePageSize(pageSize, 1);
	return Math.max(1, Math.ceil(totalItems / safeSize));
}

function getUrlParam(key: string): number | null {
	if (typeof window === 'undefined') return null;
	try {
		const searchParams = new URLSearchParams(window.location.search);
		const val = searchParams.get(key);
		if (val === null) return null;
		const num = parseInt(val, 10);
		return Number.isNaN(num) ? null : num;
	} catch {
		return null;
	}
}

export function usePaginator<T>(items: T[], options?: UsePaginatorOptions): UsePaginatorReturn<T> {
	const itemsRef = useRef(items);
	itemsRef.current = items;

	const optionsRef = useRef(options);
	optionsRef.current = options;

	const urlSyncConfig: UrlSyncOptions =
		typeof options?.urlSync === 'object' ? options.urlSync : { enabled: Boolean(options?.urlSync) };

	const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
	const pageParam = urlSyncConfig.pageParam ?? 'page';
	const pageSizeParam = urlSyncConfig.pageSizeParam ?? 'pageSize';
	const syncPageSize = urlSyncConfig.syncPageSize ?? true;
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

	// Initialize pageSize (read from URL if enabled)
	const [pageSize, setPageSizeState] = useState(() => {
		const defaultSize = sanitizePageSize(options?.pageSize, DEFAULT_PAGE_SIZE);
		if (!isUrlSyncEnabled) return defaultSize;
		const fromUrl = getUrlParam(pageSizeParam);
		return fromUrl !== null ? sanitizePageSize(fromUrl, defaultSize) : defaultSize;
	});

	// Sync pageSize when options.pageSize prop updates dynamically
	const prevPageSizePropRef = useRef(options?.pageSize);
	useEffect(() => {
		if (prevPageSizePropRef.current !== options?.pageSize) {
			prevPageSizePropRef.current = options?.pageSize;
			if (options?.pageSize !== undefined) {
				setPageSizeState(sanitizePageSize(options.pageSize, pageSize));
			}
		}
	}, [options?.pageSize, pageSize]);

	const totalItems = items.length;
	const totalPages = computeTotalPages(totalItems, pageSize);

	const totalPagesRef = useRef(totalPages);
	totalPagesRef.current = totalPages;

	// Initialize currentPage (read from URL if enabled, clamped to valid range)
	const [currentPage, setCurrentPage] = useState(() => {
		const initialSize = sanitizePageSize(options?.pageSize, DEFAULT_PAGE_SIZE);
		const maxPage = computeTotalPages(items.length, initialSize);
		let initial = options?.initialPage ?? 1;
		if (isUrlSyncEnabled) {
			const fromUrl = getUrlParam(pageParam);
			if (fromUrl !== null) {
				initial = fromUrl;
			}
		}
		return clamp(initial, 1, maxPage);
	});

	// Synchronously calculate effectivePage clamped to valid range
	const effectivePage = clamp(currentPage, 1, totalPages);

	// Sync state when effectivePage differs from state (prevents 1-render flash)
	useEffect(() => {
		if (currentPage !== effectivePage) {
			setCurrentPage(effectivePage);
		}
	}, [effectivePage, currentPage]);

	// Sync state to URL search parameters
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		try {
			const currentSearchParams = new URLSearchParams(window.location.search);
			const searchParams = keepOtherParams ? new URLSearchParams(currentSearchParams) : new URLSearchParams();

			searchParams.set(pageParam, String(effectivePage));
			if (syncPageSize) {
				searchParams.set(pageSizeParam, String(pageSize));
			}

			const queryString = searchParams.toString();
			const newSearch = queryString ? `?${queryString}` : '';
			const currentPathWithSearch = window.location.pathname + window.location.search + window.location.hash;
			const targetPathWithSearch = window.location.pathname + newSearch + window.location.hash;

			if (currentPathWithSearch !== targetPathWithSearch) {
				if (historyMode === 'push') {
					window.history.pushState(window.history.state, '', targetPathWithSearch);
				} else {
					window.history.replaceState(window.history.state, '', targetPathWithSearch);
				}
			}
		} catch {
			// Ignore URL manipulation failures in restricted environments
		}
	}, [
		effectivePage,
		pageSize,
		isUrlSyncEnabled,
		pageParam,
		pageSizeParam,
		syncPageSize,
		historyMode,
		keepOtherParams,
	]);

	// Handle browser back/forward buttons (popstate)
	useEffect(() => {
		if (!isUrlSyncEnabled || typeof window === 'undefined') return;

		const handlePopState = () => {
			const maxPages = totalPagesRef.current;
			const pageFromUrl = getUrlParam(pageParam);
			const defaultPage = clamp(optionsRef.current?.initialPage ?? 1, 1, maxPages);
			setCurrentPage(pageFromUrl !== null ? clamp(pageFromUrl, 1, maxPages) : defaultPage);

			if (syncPageSize) {
				const sizeFromUrl = getUrlParam(pageSizeParam);
				const defaultSize = sanitizePageSize(optionsRef.current?.pageSize, DEFAULT_PAGE_SIZE);
				setPageSizeState(sizeFromUrl !== null ? sanitizePageSize(sizeFromUrl, defaultSize) : defaultSize);
			}
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [isUrlSyncEnabled, pageParam, pageSizeParam, syncPageSize]);

	// Shareable URL generator helper
	const getShareableUrl = useCallback(
		(targetPage?: number, targetPageSize?: number, baseUrl?: string) => {
			if (typeof window === 'undefined' && !baseUrl) return '';
			try {
				let searchParams: URLSearchParams;
				let pathname = typeof window !== 'undefined' ? window.location.pathname : '';
				let hash = typeof window !== 'undefined' ? window.location.hash : '';

				if (baseUrl) {
					const dummyOrigin = 'http://localhost';
					const urlObj = new URL(baseUrl, dummyOrigin);
					pathname = urlObj.pathname;
					hash = urlObj.hash;
					searchParams = keepOtherParams
						? new URLSearchParams(urlObj.search)
						: new URLSearchParams();
				} else {
					searchParams = keepOtherParams
						? new URLSearchParams(window.location.search)
						: new URLSearchParams();
				}

				const p = targetPage ?? effectivePage;
				const ps = targetPageSize ?? pageSize;

				searchParams.set(pageParam, String(p));
				if (syncPageSize) {
					searchParams.set(pageSizeParam, String(ps));
				}
				const qs = searchParams.toString();
				return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
			} catch {
				return '';
			}
		},
		[effectivePage, pageSize, pageParam, pageSizeParam, syncPageSize, keepOtherParams],
	);

	// --- Derived data (memoized) ---

	const currentItems = useMemo(
		() => items.slice((effectivePage - 1) * pageSize, effectivePage * pageSize),
		[items, effectivePage, pageSize],
	);

	const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

	// --- Status flags ---

	const hasNext = effectivePage < totalPages;
	const hasPrev = effectivePage > 1;
	const isFirstPage = effectivePage === 1;
	const isLastPage = effectivePage === totalPages;

	// --- Navigation ---

	const next = useCallback(() => {
		setCurrentPage((prev) => Math.min(prev + 1, totalPages));
	}, [totalPages]);

	const prev = useCallback(() => {
		setCurrentPage((prev) => Math.max(prev - 1, 1));
	}, []);

	const goToPage = useCallback(
		(page: number) => {
			setCurrentPage(clamp(page, 1, totalPages));
		},
		[totalPages],
	);

	const goToStart = useCallback(() => {
		setCurrentPage(1);
	}, []);

	const goToEnd = useCallback(() => {
		setCurrentPage(totalPages);
	}, [totalPages]);

	// --- Page size ---

	const setPageSize = useCallback(
		(newSize: number) => {
			const safeSize = sanitizePageSize(newSize, 1);
			const totalCount = itemsRef.current.length;
			const firstVisibleIndex = (effectivePage - 1) * pageSize;
			const newTotalPages = computeTotalPages(totalCount, safeSize);
			const newPage = clamp(Math.floor(firstVisibleIndex / safeSize) + 1, 1, newTotalPages);

			setPageSizeState(safeSize);
			setCurrentPage(newPage);
		},
		[effectivePage, pageSize],
	);

	return useMemo(() => {
		const returnArr = [...currentItems] as unknown as UsePaginatorReturn<T>;

		Object.defineProperties(returnArr, {
			currentPage: { value: effectivePage, enumerable: false, writable: true, configurable: true },
			totalPages: { value: totalPages, enumerable: false, writable: true, configurable: true },
			totalItems: { value: totalItems, enumerable: false, writable: true, configurable: true },
			pageSize: { value: pageSize, enumerable: false, writable: true, configurable: true },

			hasNext: { value: hasNext, enumerable: false, writable: true, configurable: true },
			hasPrev: { value: hasPrev, enumerable: false, writable: true, configurable: true },
			isFirstPage: { value: isFirstPage, enumerable: false, writable: true, configurable: true },
			isLastPage: { value: isLastPage, enumerable: false, writable: true, configurable: true },

			next: { value: next, enumerable: false, writable: true, configurable: true },
			prev: { value: prev, enumerable: false, writable: true, configurable: true },
			goToPage: { value: goToPage, enumerable: false, writable: true, configurable: true },
			goToStart: { value: goToStart, enumerable: false, writable: true, configurable: true },
			goToEnd: { value: goToEnd, enumerable: false, writable: true, configurable: true },

			setPageSize: { value: setPageSize, enumerable: false, writable: true, configurable: true },
			pageNumbers: { value: pageNumbers, enumerable: false, writable: true, configurable: true },

			isUrlSyncEnabled: { value: isUrlSyncEnabled, enumerable: false, writable: true, configurable: true },
			getShareableUrl: { value: getShareableUrl, enumerable: false, writable: true, configurable: true },
		});

		return returnArr;
	}, [
		currentItems,
		effectivePage,
		totalPages,
		totalItems,
		pageSize,
		hasNext,
		hasPrev,
		isFirstPage,
		isLastPage,
		next,
		prev,
		goToPage,
		goToStart,
		goToEnd,
		setPageSize,
		pageNumbers,
		isUrlSyncEnabled,
		getShareableUrl,
	]);
}
