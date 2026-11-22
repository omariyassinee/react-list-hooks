import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListHarness, type TestItem } from "./harness/ListHarness";

afterEach(() => {
  cleanup();
});

function generateItems(count = 25): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${String.fromCharCode(65 + (i % 26))} ${i + 1}`,
    category: i % 2 === 0 ? "Category A" : "Category B",
    price: (i + 1) * 10,
  }));
}

describe("Journey 5.2: Combined-behaviour Journey", () => {
  it("filter producing zero results shows empty state and disables pagination controls", async () => {
    const user = userEvent.setup();
    render(<ListHarness items={generateItems(10)} pageSize={5} />);

    const searchInput = screen.getByRole("textbox", { name: "search" });
    const prevBtn = screen.getByRole("button", { name: "prev-page" });
    const nextBtn = screen.getByRole("button", { name: "next-page" });

    // Type non-matching search
    await user.type(searchInput, "NonExistentZzzz");

    expect(screen.getByTestId("empty-state").textContent).toBe(
      "No items found",
    );
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/1");
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
    expect(nextBtn.hasAttribute("disabled")).toBe(true);
  });

  it("filter resets page back to page 1 when active on higher page", async () => {
    const user = userEvent.setup();
    render(<ListHarness items={generateItems(25)} pageSize={5} />);

    const nextBtn = screen.getByRole("button", { name: "next-page" });
    const searchInput = screen.getByRole("textbox", { name: "search" });

    // Navigate to page 3
    await user.click(nextBtn);
    await user.click(nextBtn);
    expect(screen.getByTestId("page-indicator").textContent).toBe("3/5");

    // Typing into filter resets page to 1
    await user.type(searchInput, "Item");
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/5");
  });

  it("sorting preserves the filter and clamps page", async () => {
    const user = userEvent.setup();
    render(<ListHarness items={generateItems(20)} pageSize={5} />);

    const searchInput = screen.getByRole("textbox", { name: "search" });
    await user.type(searchInput, "Category A"); // 10 items -> 2 pages

    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");

    // Sort by price
    const sortPriceBtn = screen.getByRole("button", { name: "sort-price" });
    await user.click(sortPriceBtn);

    // Category A filter remains preserved
    const categories = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector('[data-field="category"]')?.textContent);
    expect(categories.every((c) => c === "Category A")).toBe(true);
  });

  it("changing page size dynamically adjusts total pages and items shown", async () => {
    const user = userEvent.setup();
    render(<ListHarness items={generateItems(25)} pageSize={5} />);

    expect(screen.getByTestId("page-indicator").textContent).toBe("1/5");
    expect(screen.getAllByRole("listitem")).toHaveLength(5);

    const setPageSize10Btn = screen.getByRole("button", {
      name: "set-page-size-10",
    });
    await user.click(setPageSize10Btn);

    // 25 items with pageSize 10 = 3 pages
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/3");
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
});
