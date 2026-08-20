import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PaginationRangeItem, UrlSyncOptions, UsePaginateOptions, UsePaginateReturn } from './types';

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

function range(start: number, end: number): number[] {
	const length = end - start + 1;
	return Array.from({ length }, (_, i) => start + i);
}

function computePaginationRange(
	totalPages: number,
	currentPage: number,
	siblingCount: number = 1,
	boundaryCount: number = 1,
): PaginationRangeItem[] {
	const safeSiblings = Math.max(0, siblingCount);
	const safeBoundaries = Math.max(1, boundaryCount);

	const totalSlots = safeBoundaries * 2 + safeSiblings * 2 + 3;

	if (totalPages <= totalSlots) {
		return range(1, totalPages);
	}

	const leftSiblingIndex = Math.max(currentPage - safeSiblings, 1);
	const rightSiblingIndex = Math.min(currentPage + safeSiblings, totalPages);

	const showLeftEllipsis = leftSiblingIndex > safeBoundaries + 2;
	const showRightEllipsis = rightSiblingIndex < totalPages - (safeBoundaries + 1);

	const startPages = range(1, safeBoundaries);
	const endPages = range(totalPages - safeBoundaries + 1, totalPages);

	if (!showLeftEllipsis && showRightEllipsis) {
		const leftItemCount = safeBoundaries + 2 * safeSiblings + 1;
		const leftRange = range(1, leftItemCount);
		return [...leftRange, 'ellipsis', ...endPages];
	}

	if (showLeftEllipsis && !showRightEllipsis) {
		const rightItemCount = safeBoundaries + 2 * safeSiblings + 1;
		const rightRange = range(totalPages - rightItemCount + 1, totalPages);
		return [...startPages, 'ellipsis', ...rightRange];
	}

	const middleRange = range(leftSiblingIndex, rightSiblingIndex);
	return [...startPages, 'ellipsis', ...middleRange, 'ellipsis', ...endPages];
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

function getInitialPageSize(
	options?: UsePaginateOptions,
	isUrlSyncEnabled?: boolean,
	pageSizeParam: string = 'pageSize',
): number {
	const defaultSize = sanitizePageSize(options?.pageSize, DEFAULT_PAGE_SIZE);
	if (!isUrlSyncEnabled) return defaultSize;
	const fromUrl = getUrlParam(pageSizeParam);
	return fromUrl !== null ? sanitizePageSize(fromUrl, defaultSize) : defaultSize;
}

export function usePaginate<T>(items: T[], options?: UsePaginateOptions): UsePaginateReturn<T> {
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const siblingCount = options?.siblingCount ?? 1;
	const boundaryCount = options?.boundaryCount ?? 1;

	const urlSyncConfig: UrlSyncOptions =
		typeof options?.urlSync === 'object' ? options.urlSync : { enabled: Boolean(options?.urlSync) };

	const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
	const pageParam = urlSyncConfig.pageParam ?? 'page';
	const pageSizeParam = urlSyncConfig.pageSizeParam ?? 'pageSize';
	const syncPageSize = urlSyncConfig.syncPageSize ?? true;
	const historyMode = urlSyncConfig.historyMode ?? 'replace';
	const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;

	// Initialize pageSize (read from URL if enabled)
	const [pageSize, setPageSizeState] = useState(() =>
		getInitialPageSize(options, isUrlSyncEnabled, pageSizeParam),
	);

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

	// Refs for stable callbacks — avoids recreating callbacks when derived values change
	const totalPagesRef = useRef(totalPages);
	totalPagesRef.current = totalPages;

	const pageSizeRef = useRef(pageSize);
	pageSizeRef.current = pageSize;

	const totalItemsRef = useRef(totalItems);
	totalItemsRef.current = totalItems;

	// Initialize currentPage (read from URL if enabled, clamped to valid range)
	const [currentPage, setCurrentPage] = useState(() => {
		const maxPage = computeTotalPages(items.length, pageSize);
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

	const effectivePageRef = useRef(effectivePage);
	effectivePageRef.current = effectivePage;

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

	// Shareable URL generator — reads volatile values from refs for stability
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
					searchParams = keepOtherParams ? new URLSearchParams(urlObj.search) : new URLSearchParams();
				} else {
					searchParams = keepOtherParams
						? new URLSearchParams(window.location.search)
						: new URLSearchParams();
				}

				const currentTotalPages = totalPagesRef.current;
				const currentPageSize = pageSizeRef.current;
				const currentEffectivePage = effectivePageRef.current;

				const p = targetPage !== undefined ? clamp(targetPage, 1, currentTotalPages) : currentEffectivePage;
				const ps = targetPageSize !== undefined ? sanitizePageSize(targetPageSize, currentPageSize) : currentPageSize;

				searchParams.set(pageParam, String(p));
				searchParams.set(pageSizeParam, String(ps));
				const qs = searchParams.toString();
				return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
			} catch {
				return '';
			}
		},
		[pageParam, pageSizeParam, keepOtherParams],
	);

	// --- Derived data (memoized) ---

	const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

	const paginationRange = useMemo(
		() => computePaginationRange(totalPages, effectivePage, siblingCount, boundaryCount),
		[totalPages, effectivePage, siblingCount, boundaryCount],
	);

	// --- Stable navigation callbacks (all use refs, [] deps) ---

	const next = useCallback(() => {
		setCurrentPage((prev) => Math.min(prev + 1, totalPagesRef.current));
	}, []);

	const prev = useCallback(() => {
		setCurrentPage((prev) => Math.max(prev - 1, 1));
	}, []);

	const goToPage = useCallback((page: number) => {
		setCurrentPage(clamp(page, 1, totalPagesRef.current));
	}, []);

	const goToStart = useCallback(() => {
		setCurrentPage(1);
	}, []);

	const goToEnd = useCallback(() => {
		setCurrentPage(totalPagesRef.current);
	}, []);

	// --- Page size (stable callback via refs) ---

	const setPageSize = useCallback((newSize: number) => {
		const safeSize = sanitizePageSize(newSize, 1);
		const firstVisibleIndex = (effectivePageRef.current - 1) * pageSizeRef.current;
		const newTotalPages = computeTotalPages(totalItemsRef.current, safeSize);
		const newPage = clamp(Math.floor(firstVisibleIndex / safeSize) + 1, 1, newTotalPages);

		setPageSizeState(safeSize);
		setCurrentPage(newPage);
	}, []);

	// --- Return: single useMemo with inline slice and status flags ---

	return useMemo(() => {
		const currentItems = items.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

		const hasNext = effectivePage < totalPages;
		const hasPrev = effectivePage > 1;
		const isFirstPage = effectivePage === 1;
		const isLastPage = effectivePage === totalPages;

		const returnArr = [...currentItems];
		for (const [key, value] of Object.entries({
			currentPage: effectivePage,
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
			paginationRange,
			isUrlSyncEnabled,
			getShareableUrl,
		})) {
			Object.defineProperty(returnArr, key, { value, writable: true, configurable: true });
		}
		return returnArr as unknown as UsePaginateReturn<T>;
	}, [
		items,
		effectivePage,
		totalPages,
		totalItems,
		pageSize,
		next,
		prev,
		goToPage,
		goToStart,
		goToEnd,
		setPageSize,
		pageNumbers,
		paginationRange,
		isUrlSyncEnabled,
		getShareableUrl,
	]);
}
