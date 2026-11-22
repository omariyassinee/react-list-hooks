import { describe, expect, test } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import {
  useFilter,
  useSort,
  usePaginate,
} from "@omariyassine/react-list-hooks";
import { INITIAL_PRODUCTS } from "../src/mockData";
import type { ProductItem, CustomFilterKeys } from "../src/types";

describe("playground demo smoke tests", () => {
  test("mock dataset is non-empty and well-formed", () => {
    expect(INITIAL_PRODUCTS.length).toBeGreaterThan(0);
    for (const item of INITIAL_PRODUCTS) {
      expect(item.id).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.category).toBeTruthy();
    }
  });

  test("useFilter filters the mock dataset by query", () => {
    const { result } = renderHook(() =>
      useFilter<ProductItem, CustomFilterKeys>(INITIAL_PRODUCTS, {
        searchFields: ["name", "category"],
      }),
    );
    expect(result.current.filteredItems.length).toBe(INITIAL_PRODUCTS.length);
    expect(result.current.state.query).toBe("");
    act(() => result.current.methods.setQuery("CyberDeck"));
    expect(result.current.filteredItems.length).toBeGreaterThan(0);
    expect(
      result.current.filteredItems.every((i) => i.name.includes("CyberDeck")),
    ).toBe(true);
  });

  test("useSort sorts the mock dataset by price descending", () => {
    const { result } = renderHook(() =>
      useSort<ProductItem>(INITIAL_PRODUCTS, {
        initialKey: "price",
        initialDirection: "desc",
      }),
    );
    expect(result.current.sortedItems.length).toBe(INITIAL_PRODUCTS.length);
    expect(result.current.state.sortKey).toBe("price");
    expect(result.current.state.sortDirection).toBe("desc");
    expect(result.current.sortedItems[0].price).toBeGreaterThanOrEqual(
      result.current.sortedItems[result.current.sortedItems.length - 1].price,
    );
    act(() => result.current.methods.clearSort());
    expect(result.current.state.sortKey).toBeNull();
  });

  test("usePaginate slices the mock dataset", () => {
    const { result } = renderHook(() =>
      usePaginate(INITIAL_PRODUCTS, {
        pageSize: 6,
        initialPage: 1,
      }),
    );
    expect(result.current.paginatedItems.length).toBe(6);
    expect(result.current.state.currentPage).toBe(1);
    expect(result.current.state.totalPages).toBe(
      Math.ceil(INITIAL_PRODUCTS.length / 6),
    );
    act(() => result.current.methods.goToPage(2));
    expect(result.current.state.currentPage).toBe(2);
  });
});
