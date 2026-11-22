/** biome-ignore-all lint/correctness/noChildrenProp: <!--> */
import { createContext, createElement, useContext } from "react";

import { usePaginate } from "./use-paginate";
import { useFilter } from "./use-filter";
import { useSort } from "./use-sort";
import { useList } from "./use-list";

import type {
  ContextChildren,
  CreatedFilterContext,
  CreatedListContext,
  CreatedPaginateContext,
  CreatedSortContext,
  FilterKey,
  FilterProviderProps,
  ListProviderProps,
  PaginateProviderProps,
  SortProviderProps,
  UseFilterMethods,
  UseFilterReturn,
  UseFilterState,
  UseListReturn,
  UsePaginateMethods,
  UsePaginateReturn,
  UsePaginateState,
  UseSortMethods,
  UseSortReturn,
  UseSortState,
} from "./types";

function renderChildren<Ctx>(
  children: ContextChildren<Ctx>,
  ctx: Ctx,
): React.ReactNode {
  return typeof children === "function" ? children(ctx) : children;
}

function useRequiredContext<Ctx>(
  context: React.Context<Ctx | null>,
  hookName:
    | "usePaginateContext"
    | "useFilterContext"
    | "useSortContext"
    | "useListContext",
  providerName:
    | "<PaginateProvider> or <ListProvider>"
    | "<FilterProvider> or <ListProvider>"
    | "<SortProvider> or <ListProvider>"
    | "<ListProvider>",
): Ctx {
  const ctx = useContext(context);
  if (ctx === null) {
    throw new Error(
      `[react-list-hooks] ${hookName} must be used within a ${providerName}.`,
    );
  }
  return ctx;
}

// ─── 1. Paginate Context Factory ─────────────────────────────────────────────

export function createPaginateContext<
  T = unknown,
>(): CreatedPaginateContext<T> {
  const PaginateCtx = createContext<UsePaginateReturn<T> | null>(null);

  function PaginateManaged<Item extends T>({
    items,
    options,
    children,
    ...inlineOptions
  }: Extract<PaginateProviderProps<Item>, { items: Item[] }>) {
    const value = usePaginate<Item>(items, options ?? inlineOptions);
    return createElement(
      PaginateCtx.Provider,
      { value: value as unknown as UsePaginateReturn<T> },
      renderChildren(children, value),
    );
  }

  function PaginateProvider<Item extends T = T>(
    props: PaginateProviderProps<Item>,
  ): React.ReactNode {
    if ("value" in props && props.value !== undefined) {
      return createElement(
        PaginateCtx.Provider,
        { value: props.value as unknown as UsePaginateReturn<T> },
        renderChildren(props.children, props.value),
      );
    }
    return createElement(
      PaginateManaged<Item>,
      props as Extract<PaginateProviderProps<Item>, { items: Item[] }>,
    );
  }

  function usePaginateContext<Item extends T = T>(): UsePaginateReturn<Item> {
    return useRequiredContext(
      PaginateCtx,
      "usePaginateContext",
      "<PaginateProvider> or <ListProvider>",
    ) as unknown as UsePaginateReturn<Item>;
  }

  function usePaginateState(): UsePaginateState {
    return usePaginateContext().state;
  }

  function usePaginateMethods(): UsePaginateMethods {
    return usePaginateContext().methods;
  }

  return {
    PaginateProvider,
    usePaginateContext,
    usePaginateState,
    usePaginateMethods,
  };
}

// ─── 2. Sort Context Factory ─────────────────────────────────────────────────

export function createSortContext<T = unknown>(): CreatedSortContext<T> {
  const SortCtx = createContext<UseSortReturn<T> | null>(null);

  function SortManaged<Item extends T>({
    items,
    options,
    children,
    ...inlineOptions
  }: Extract<SortProviderProps<Item>, { items: Item[] }>) {
    const value = useSort<Item>(items, options ?? inlineOptions);
    return createElement(
      SortCtx.Provider,
      { value: value as unknown as UseSortReturn<T> },
      renderChildren(children, value),
    );
  }

  function SortProvider<Item extends T = T>(
    props: SortProviderProps<Item>,
  ): React.ReactNode {
    if ("value" in props && props.value !== undefined) {
      return createElement(
        SortCtx.Provider,
        { value: props.value as unknown as UseSortReturn<T> },
        renderChildren(props.children, props.value),
      );
    }
    return createElement(
      SortManaged<Item>,
      props as Extract<SortProviderProps<Item>, { items: Item[] }>,
    );
  }

  function useSortContext<Item extends T = T>(): UseSortReturn<Item> {
    return useRequiredContext(
      SortCtx,
      "useSortContext",
      "<SortProvider> or <ListProvider>",
    ) as unknown as UseSortReturn<Item>;
  }

  function useSortState<Item extends T = T>(): UseSortState<Item> {
    return useSortContext<Item>().state;
  }

  function useSortMethods<Item extends T = T>(): UseSortMethods<Item> {
    return useSortContext<Item>().methods;
  }

  return { SortProvider, useSortContext, useSortState, useSortMethods };
}

// ─── 3. Filter Context Factory ───────────────────────────────────────────────

export function createFilterContext<
  T = unknown,
  K extends string = FilterKey<T>,
>(): CreatedFilterContext<T, K> {
  const FilterCtx = createContext<UseFilterReturn<T, K> | null>(null);

  function FilterManaged<Item extends T, Key extends string = K>({
    items,
    options,
    children,
    ...inlineOptions
  }: Extract<FilterProviderProps<Item, Key>, { items: Item[] }>) {
    const value = useFilter<Item, Key>(items, options ?? inlineOptions);
    return createElement(
      FilterCtx.Provider,
      { value: value as unknown as UseFilterReturn<T, K> },
      renderChildren(children, value),
    );
  }

  function FilterProvider<Item extends T = T, Key extends string = K>(
    props: FilterProviderProps<Item, Key>,
  ): React.ReactNode {
    if ("value" in props && props.value !== undefined) {
      return createElement(
        FilterCtx.Provider,
        { value: props.value as unknown as UseFilterReturn<T, K> },
        renderChildren(props.children, props.value),
      );
    }
    return createElement(
      FilterManaged<Item, Key>,
      props as Extract<FilterProviderProps<Item, Key>, { items: Item[] }>,
    );
  }

  function useFilterContext<
    Item extends T = T,
    Key extends string = K,
  >(): UseFilterReturn<Item, Key> {
    return useRequiredContext(
      FilterCtx,
      "useFilterContext",
      "<FilterProvider> or <ListProvider>",
    ) as unknown as UseFilterReturn<Item, Key>;
  }

  function useFilterState<
    Item extends T = T,
    Key extends string = K,
  >(): UseFilterState<Item, Key> {
    return useFilterContext<Item, Key>().state;
  }

  function useFilterMethods<
    Item extends T = T,
    Key extends string = K,
  >(): UseFilterMethods<Item, Key> {
    return useFilterContext<Item, Key>().methods;
  }

  return { FilterProvider, useFilterContext, useFilterState, useFilterMethods };
}

// ─── 4. List Pipeline Context (with Sub-Context Bridge) ──────────────────────

/**
 * Internal suite shape. The default singleton exports keep generic consumer
 * hooks (callable with explicit type parameters, e.g.
 * `useListContext<Product, 'role'>()`), while `createListContext` narrows them
 * to the locked-in non-generic form via `CreatedListContext`.
 */
interface ListContextSuite<T, K extends string = FilterKey<T>> {
  ListProvider: (props: ListProviderProps<T, K>) => React.ReactNode;
  useListContext: <
    Item extends T = T,
    Key extends string = K,
  >() => UseListReturn<Item, Key>;
  useFilterContext: <
    Item extends T = T,
    Key extends string = K,
  >() => UseFilterReturn<Item, Key>;
  useSortContext: <Item extends T = T>() => UseSortReturn<Item>;
  usePaginateContext: <Item extends T = T>() => UsePaginateReturn<Item>;
}

function createListContextWithSubContexts<T, K extends string = FilterKey<T>>(
  paginateSuite: CreatedPaginateContext<T>,
  sortSuite: CreatedSortContext<T>,
  filterSuite: CreatedFilterContext<T, K>,
): ListContextSuite<T, K> {
  const ListCtx = createContext<UseListReturn<T, K> | null>(null);

  function provideAll<Item extends T, Key extends string = K>(
    value: UseListReturn<Item, Key>,
    children: ContextChildren<UseListReturn<Item, Key>>,
  ): React.ReactNode {
    const rendered = renderChildren(children, value);
    return createElement(
      ListCtx.Provider,
      { value: value as unknown as UseListReturn<T, K> },
      createElement(filterSuite.FilterProvider, {
        value: value.filter as unknown as UseFilterReturn<T, K>,
        children: createElement(sortSuite.SortProvider, {
          value: value.sort as unknown as UseSortReturn<T>,
          children: createElement(paginateSuite.PaginateProvider, {
            value: value.data as unknown as UsePaginateReturn<T>,
            children: rendered,
          }),
        }),
      }),
    );
  }

  function ListManaged<Item extends T, Key extends string = K>({
    items,
    options,
    children,
    ...inlineOptions
  }: Extract<ListProviderProps<Item, Key>, { items: Item[] }>) {
    const value = useList<Item, Key>(items, options ?? inlineOptions);
    return provideAll(value, children);
  }

  function ListProvider<Item extends T = T, Key extends string = K>(
    props: ListProviderProps<Item, Key>,
  ): React.ReactNode {
    if ("value" in props && props.value !== undefined) {
      return provideAll(props.value, props.children);
    }
    return createElement(
      ListManaged<Item, Key>,
      props as Extract<ListProviderProps<Item, Key>, { items: Item[] }>,
    );
  }

  function useListContext<
    Item extends T = T,
    Key extends string = K,
  >(): UseListReturn<Item, Key> {
    return useRequiredContext(
      ListCtx,
      "useListContext",
      "<ListProvider>",
    ) as unknown as UseListReturn<Item, Key>;
  }

  return {
    ListProvider,
    useListContext,
    useFilterContext: filterSuite.useFilterContext as ListContextSuite<
      T,
      K
    >["useFilterContext"],
    useSortContext: sortSuite.useSortContext as ListContextSuite<
      T,
      K
    >["useSortContext"],
    usePaginateContext: paginateSuite.usePaginateContext as ListContextSuite<
      T,
      K
    >["usePaginateContext"],
  };
}

export function createListContext<
  T = unknown,
  K extends string = FilterKey<T>,
>(): CreatedListContext<T, K> {
  const paginateSuite = createPaginateContext<T>();
  const sortSuite = createSortContext<T>();
  const filterSuite = createFilterContext<T, K>();
  const suite = createListContextWithSubContexts(
    paginateSuite,
    sortSuite,
    filterSuite,
  );
  return {
    ListProvider: suite.ListProvider,
    useListContext: suite.useListContext,
    useFilterContext: suite.useFilterContext,
    useSortContext: suite.useSortContext,
    usePaginateContext: suite.usePaginateContext,
  };
}

// ─── 5. Default Singleton Exports (Shared Bridge) ────────────────────────────
// The default PaginateProvider, SortProvider, FilterProvider, and ListProvider
// share the same underlying React Context instances, so a child calling the
// default `usePaginateContext()` works inside both `<PaginateProvider>` and
// `<ListProvider>` — the "pipeline bridge". The provider components and
// consumer hooks are generic so callers can pass any item type.

const PaginateCtx = createContext<UsePaginateReturn<unknown> | null>(null);
const SortCtx = createContext<UseSortReturn<unknown> | null>(null);
const FilterCtx = createContext<UseFilterReturn<unknown, string> | null>(null);
const ListCtx = createContext<UseListReturn<unknown, string> | null>(null);

// ─── Paginate ────────────────────────────────────────────────────────────────

function DefaultPaginateManaged<T>({
  items,
  options,
  children,
  ...inlineOptions
}: Extract<PaginateProviderProps<T>, { items: T[] }>) {
  const value = usePaginate<T>(items, options ?? inlineOptions);
  return createElement(
    PaginateCtx.Provider,
    { value: value as unknown as UsePaginateReturn<unknown> },
    renderChildren(children, value),
  );
}

export function PaginateProvider<T>(
  props: PaginateProviderProps<T>,
): React.ReactNode {
  if ("value" in props && props.value !== undefined) {
    return createElement(
      PaginateCtx.Provider,
      { value: props.value as unknown as UsePaginateReturn<unknown> },
      renderChildren(props.children, props.value),
    );
  }
  return createElement(
    DefaultPaginateManaged<T>,
    props as Extract<PaginateProviderProps<T>, { items: T[] }>,
  );
}

export function usePaginateContext<T = unknown>(): UsePaginateReturn<T> {
  return useRequiredContext(
    PaginateCtx,
    "usePaginateContext",
    "<PaginateProvider> or <ListProvider>",
  ) as unknown as UsePaginateReturn<T>;
}

export function usePaginateState(): UsePaginateState {
  return usePaginateContext().state;
}

export function usePaginateMethods(): UsePaginateMethods {
  return usePaginateContext().methods;
}

// ─── Sort ────────────────────────────────────────────────────────────────────

function DefaultSortManaged<T>({
  items,
  options,
  children,
  ...inlineOptions
}: Extract<SortProviderProps<T>, { items: T[] }>) {
  const value = useSort<T>(items, options ?? inlineOptions);
  return createElement(
    SortCtx.Provider,
    { value: value as unknown as UseSortReturn<unknown> },
    renderChildren(children, value),
  );
}

export function SortProvider<T>(props: SortProviderProps<T>): React.ReactNode {
  if ("value" in props && props.value !== undefined) {
    return createElement(
      SortCtx.Provider,
      { value: props.value as unknown as UseSortReturn<unknown> },
      renderChildren(props.children, props.value),
    );
  }
  return createElement(
    DefaultSortManaged<T>,
    props as Extract<SortProviderProps<T>, { items: T[] }>,
  );
}

export function useSortContext<T = unknown>(): UseSortReturn<T> {
  return useRequiredContext(
    SortCtx,
    "useSortContext",
    "<SortProvider> or <ListProvider>",
  ) as unknown as UseSortReturn<T>;
}

export function useSortState<T = unknown>(): UseSortState<T> {
  return useSortContext<T>().state;
}

export function useSortMethods<T = unknown>(): UseSortMethods<T> {
  return useSortContext<T>().methods;
}

// ─── Filter ──────────────────────────────────────────────────────────────────

function DefaultFilterManaged<T, K extends string = FilterKey<T>>({
  items,
  options,
  children,
  ...inlineOptions
}: Extract<FilterProviderProps<T, K>, { items: T[] }>) {
  const value = useFilter<T, K>(items, options ?? inlineOptions);
  return createElement(
    FilterCtx.Provider,
    { value: value as unknown as UseFilterReturn<unknown, string> },
    renderChildren(children, value),
  );
}

export function FilterProvider<T, K extends string = FilterKey<T>>(
  props: FilterProviderProps<T, K>,
): React.ReactNode {
  if ("value" in props && props.value !== undefined) {
    return createElement(
      FilterCtx.Provider,
      { value: props.value as unknown as UseFilterReturn<unknown, string> },
      renderChildren(props.children, props.value),
    );
  }
  return createElement(
    DefaultFilterManaged<T, K>,
    props as Extract<FilterProviderProps<T, K>, { items: T[] }>,
  );
}

export function useFilterContext<
  T = unknown,
  K extends string = FilterKey<T>,
>(): UseFilterReturn<T, K> {
  return useRequiredContext(
    FilterCtx,
    "useFilterContext",
    "<FilterProvider> or <ListProvider>",
  ) as unknown as UseFilterReturn<T, K>;
}

export function useFilterState<
  T = unknown,
  K extends string = FilterKey<T>,
>(): UseFilterState<T, K> {
  return useFilterContext<T, K>().state;
}

export function useFilterMethods<
  T = unknown,
  K extends string = FilterKey<T>,
>(): UseFilterMethods<T, K> {
  return useFilterContext<T, K>().methods;
}

// ─── List (Pipeline Bridge) ──────────────────────────────────────────────────

function provideAllDefault<T, K extends string = FilterKey<T>>(
  value: UseListReturn<T, K>,
  children: ContextChildren<UseListReturn<T, K>>,
): React.ReactNode {
  const rendered = renderChildren(children, value);
  return createElement(
    ListCtx.Provider,
    { value: value as unknown as UseListReturn<unknown, string> },
    createElement(FilterProvider, {
      value: value.filter as unknown as UseFilterReturn<unknown, string>,
      children: createElement(SortProvider, {
        value: value.sort as unknown as UseSortReturn<unknown>,
        children: createElement(PaginateProvider, {
          value: value.data as unknown as UsePaginateReturn<unknown>,
          children: rendered,
        }),
      }),
    }),
  );
}

function DefaultListManaged<T, K extends string = FilterKey<T>>({
  items,
  options,
  children,
  ...inlineOptions
}: Extract<ListProviderProps<T, K>, { items: T[] }>) {
  const value = useList<T, K>(items, options ?? inlineOptions);
  return provideAllDefault(value, children);
}

export function ListProvider<T, K extends string = FilterKey<T>>(
  props: ListProviderProps<T, K>,
): React.ReactNode {
  if ("value" in props && props.value !== undefined) {
    return provideAllDefault(props.value, props.children);
  }
  return createElement(
    DefaultListManaged<T, K>,
    props as Extract<ListProviderProps<T, K>, { items: T[] }>,
  );
}

export function useListContext<
  T = unknown,
  K extends string = FilterKey<T>,
>(): UseListReturn<T, K> {
  return useRequiredContext(
    ListCtx,
    "useListContext",
    "<ListProvider>",
  ) as unknown as UseListReturn<T, K>;
}
