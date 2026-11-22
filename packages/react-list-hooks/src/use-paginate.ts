import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getUrlParamNumber } from "./url-params";

import type {
  PaginationRangeItem,
  UrlSyncOptions,
  UsePaginateMethods,
  UsePaginateOptions,
  UsePaginateReturn,
  UsePaginateState,
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizePageSize(
  size: unknown,
  fallback: number = DEFAULT_PAGE_SIZE,
): number {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 1) {
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

/**
 * Windowed pagination range with ellipses, ported from MUI's usePagination
 * clamping math. The current page always keeps both siblings near boundaries,
 * and an ellipsis only appears when it genuinely hides pages.
 */
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

  const startPages = range(1, Math.min(safeBoundaries, totalPages));
  const endPages = range(
    Math.max(totalPages - safeBoundaries + 1, safeBoundaries + 1),
    totalPages,
  );

  const siblingsStart = Math.max(
    Math.min(
      // Natural start
      currentPage - safeSiblings,
      // Lower boundary when page is high
      totalPages - safeBoundaries - safeSiblings * 2 - 1,
    ),
    // Greater than startPages
    safeBoundaries + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(
      // Natural end
      currentPage + safeSiblings,
      // Upper boundary when page is low
      safeBoundaries + safeSiblings * 2 + 2,
    ),
    // Less than endPages
    totalPages - safeBoundaries - 1,
  );

  // When an ellipsis would hide nothing, emit the adjacent filler page instead.
  const startFiller: PaginationRangeItem[] =
    siblingsStart > safeBoundaries + 2
      ? ["ellipsis"]
      : safeBoundaries + 1 < totalPages - safeBoundaries
        ? [safeBoundaries + 1]
        : [];
  const endFiller: PaginationRangeItem[] =
    siblingsEnd < totalPages - safeBoundaries - 1
      ? ["ellipsis"]
      : totalPages - safeBoundaries > safeBoundaries
        ? [totalPages - safeBoundaries]
        : [];

  return [
    ...startPages,
    ...startFiller,
    ...range(siblingsStart, siblingsEnd),
    ...endFiller,
    ...endPages,
  ];
}

function getInitialPageSize(
  options?: UsePaginateOptions,
  isUrlSyncEnabled?: boolean,
  pageSizeParam: string = "pageSize",
  syncPageSize: boolean = true,
): number {
  const defaultSize = sanitizePageSize(options?.pageSize, DEFAULT_PAGE_SIZE);
  if (!isUrlSyncEnabled || !syncPageSize) return defaultSize;
  const fromUrl = getUrlParamNumber(pageSizeParam);
  return fromUrl !== null
    ? sanitizePageSize(fromUrl, defaultSize)
    : defaultSize;
}

export function usePaginate<T>(
  items: T[],
  options?: UsePaginateOptions,
): UsePaginateReturn<T> {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const siblingCount = options?.siblingCount ?? 1;
  const boundaryCount = options?.boundaryCount ?? 1;

  const urlSyncConfig: UrlSyncOptions =
    typeof options?.urlSync === "object"
      ? options.urlSync
      : { enabled: Boolean(options?.urlSync) };

  const isUrlSyncEnabled = Boolean(urlSyncConfig.enabled);
  const pageParam = urlSyncConfig.pageParam ?? "page";
  const pageSizeParam = urlSyncConfig.pageSizeParam ?? "pageSize";
  const syncPageSize = urlSyncConfig.syncPageSize ?? true;
  const historyMode = urlSyncConfig.historyMode ?? "replace";
  const keepOtherParams = urlSyncConfig.keepOtherParams ?? true;
  const preserveParams = urlSyncConfig.preserveParams;

  // Initialize pageSize (read from URL if enabled)
  const [pageSize, setPageSizeState] = useState(() =>
    getInitialPageSize(options, isUrlSyncEnabled, pageSizeParam, syncPageSize),
  );

  // Initial pageSize for resetPageSize — the sanitized default (options.pageSize
  // or 10), NOT the URL-restored value, so resetPageSize restores the intended
  // baseline rather than freezing whatever the URL happened to contain.
  const initialPageSizeRef = useRef(
    sanitizePageSize(options?.pageSize, DEFAULT_PAGE_SIZE),
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
      const fromUrl = getUrlParamNumber(pageParam);
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
  const isFirstUrlSyncRef = useRef(true);
  useEffect(() => {
    if (!isUrlSyncEnabled || typeof window === "undefined") return;

    try {
      const currentSearchParams = new URLSearchParams(window.location.search);
      // When keepOtherParams is false, still re-copy params owned by other
      // pipeline stages (populated via preserveParams by useList) so sibling
      // stages don't wipe each other's state.
      const searchParams = new URLSearchParams();
      if (keepOtherParams) {
        for (const [key, value] of currentSearchParams)
          searchParams.set(key, value);
      } else if (preserveParams) {
        for (const name of preserveParams) {
          const value = currentSearchParams.get(name);
          if (value !== null) searchParams.set(name, value);
        }
      }

      searchParams.set(pageParam, String(effectivePage));
      if (syncPageSize) {
        searchParams.set(pageSizeParam, String(pageSize));
      } else {
        searchParams.delete(pageSizeParam);
      }

      const queryString = searchParams.toString();
      const newSearch = queryString ? `?${queryString}` : "";
      const currentPathWithSearch =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      const targetPathWithSearch =
        window.location.pathname + newSearch + window.location.hash;

      if (currentPathWithSearch !== targetPathWithSearch) {
        // Never push a history entry for the initial normalization write —
        // otherwise mounting with historyMode 'push' pollutes history.
        const mode = isFirstUrlSyncRef.current ? "replace" : historyMode;
        isFirstUrlSyncRef.current = false;
        if (mode === "push") {
          window.history.pushState(
            window.history.state,
            "",
            targetPathWithSearch,
          );
        } else {
          window.history.replaceState(
            window.history.state,
            "",
            targetPathWithSearch,
          );
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
    preserveParams,
  ]);
  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    if (!isUrlSyncEnabled || typeof window === "undefined") return;

    const handlePopState = () => {
      const maxPages = totalPagesRef.current;
      const pageFromUrl = getUrlParamNumber(pageParam);
      const defaultPage = clamp(
        optionsRef.current?.initialPage ?? 1,
        1,
        maxPages,
      );
      setCurrentPage(
        pageFromUrl !== null ? clamp(pageFromUrl, 1, maxPages) : defaultPage,
      );

      if (syncPageSize) {
        const sizeFromUrl = getUrlParamNumber(pageSizeParam);
        const defaultSize = sanitizePageSize(
          optionsRef.current?.pageSize,
          DEFAULT_PAGE_SIZE,
        );
        setPageSizeState(
          sizeFromUrl !== null
            ? sanitizePageSize(sizeFromUrl, defaultSize)
            : defaultSize,
        );
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isUrlSyncEnabled, pageParam, pageSizeParam, syncPageSize]);

  // Shareable URL generator — reads volatile values from refs for stability
  const getShareableUrl = useCallback(
    (targetPage?: number, targetPageSize?: number, baseUrl?: string) => {
      if (typeof window === "undefined" && !baseUrl) return "";
      try {
        let searchParams: URLSearchParams;
        let pathname =
          typeof window !== "undefined" ? window.location.pathname : "";
        let hash = typeof window !== "undefined" ? window.location.hash : "";
        if (baseUrl) {
          const dummyOrigin = "http://localhost";
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

        const currentTotalPages = totalPagesRef.current;
        const currentPageSize = pageSizeRef.current;
        const currentEffectivePage = effectivePageRef.current;

        const p =
          targetPage !== undefined
            ? clamp(targetPage, 1, currentTotalPages)
            : currentEffectivePage;
        const ps =
          targetPageSize !== undefined
            ? sanitizePageSize(targetPageSize, currentPageSize)
            : currentPageSize;

        searchParams.set(pageParam, String(p));
        if (syncPageSize) {
          searchParams.set(pageSizeParam, String(ps));
        }
        const qs = searchParams.toString();
        return `${pathname}${qs ? `?${qs}` : ""}${hash}`;
      } catch {
        return "";
      }
    },
    [pageParam, pageSizeParam, keepOtherParams, syncPageSize],
  );

  // --- Derived data (memoized) ---

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const paginationRange = useMemo(
    () =>
      computePaginationRange(
        totalPages,
        effectivePage,
        siblingCount,
        boundaryCount,
      ),
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
    const firstVisibleIndex =
      (effectivePageRef.current - 1) * pageSizeRef.current;
    const newTotalPages = computeTotalPages(totalItemsRef.current, safeSize);
    const newPage = clamp(
      Math.floor(firstVisibleIndex / safeSize) + 1,
      1,
      newTotalPages,
    );

    setPageSizeState(safeSize);
    setCurrentPage(newPage);
  }, []);

  // Restore the initial pageSize (options.pageSize or the default of 10),
  // preserving the first visible item like setPageSize does.
  const resetPageSize = useCallback(() => {
    const safeSize = initialPageSizeRef.current;
    const firstVisibleIndex =
      (effectivePageRef.current - 1) * pageSizeRef.current;
    const newTotalPages = computeTotalPages(totalItemsRef.current, safeSize);
    const newPage = clamp(
      Math.floor(firstVisibleIndex / safeSize) + 1,
      1,
      newTotalPages,
    );

    setPageSizeState(safeSize);
    setCurrentPage(newPage);
  }, []);

  // --- State & methods: memoized separately for referential stability ---
  // `methods` never changes identity across the component's lifecycle (all
  // callbacks are useCallback([], …)), so consumers that only trigger actions
  // (e.g. a <ResetButton /> using methods) never re-render when the page
  // slice or page size changes. `state` only changes when its values do.

  const state = useMemo<UsePaginateState>(
    () => ({
      currentPage: effectivePage,
      totalPages,
      totalItems,
      pageSize,
      hasNext: effectivePage < totalPages,
      hasPrev: effectivePage > 1,
      isFirstPage: effectivePage === 1,
      isLastPage: effectivePage === totalPages,
      pageNumbers,
      paginationRange,
      isUrlSyncEnabled,
    }),
    [
      effectivePage,
      totalPages,
      totalItems,
      pageSize,
      pageNumbers,
      paginationRange,
      isUrlSyncEnabled,
    ],
  );

  const methods = useMemo<UsePaginateMethods>(
    () => ({
      next,
      prev,
      goToPage,
      goToStart,
      goToEnd,
      setPageSize,
      resetPageSize,
      getShareableUrl,
    }),
    [
      next,
      prev,
      goToPage,
      goToStart,
      goToEnd,
      setPageSize,
      resetPageSize,
      getShareableUrl,
    ],
  );

  // --- Return: single useMemo with inline slice ---

  return useMemo(() => {
    // Slice once — the page window is the only data copy.
    const paginatedItems = items.slice(
      (effectivePage - 1) * pageSize,
      effectivePage * pageSize,
    );

    // Namespaced return: the page data plus `state` (stateful properties)
    // and `methods` (controls) — the shared return contract for all sub hooks.
    return {
      paginatedItems,
      state,
      methods,
    } satisfies UsePaginateReturn<T>;
  }, [items, effectivePage, pageSize, state, methods]);
}
