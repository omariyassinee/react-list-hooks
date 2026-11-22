import { useState } from "react";
import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListHarness, type TestItem } from "./harness/ListHarness";

afterEach(() => {
  cleanup();
});

function createItems(count: number): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    category: i % 2 === 0 ? "Cat A" : "Cat B",
    price: (i + 1) * 5,
  }));
}

describe("Journey 5.3: Data-change Journey", () => {
  it("handles items replacing while mounted when current page becomes out of range", async () => {
    const user = userEvent.setup();

    function DataHarness() {
      const [data, setData] = useState<TestItem[]>(createItems(25)); // 5 pages with pageSize 5
      return (
        <div>
          <button
            type="button"
            onClick={() => setData(createItems(8))} // shrinks to 2 pages
            aria-label="shrink-data"
          >
            Shrink
          </button>
          <ListHarness items={data} pageSize={5} />
        </div>
      );
    }

    render(<DataHarness />);
    const nextBtn = screen.getByRole("button", { name: "next-page" });

    // Navigate to page 5
    for (let i = 0; i < 4; i++) {
      await user.click(nextBtn);
    }
    expect(screen.getByTestId("page-indicator").textContent).toBe("5/5");

    // Shrink data from 25 to 8 items (only 2 pages now)
    const shrinkBtn = screen.getByRole("button", { name: "shrink-data" });
    await user.click(shrinkBtn);

    // Page must automatically clamp to 2/2
    expect(screen.getByTestId("page-indicator").textContent).toBe("2/2");
    expect(screen.getAllByRole("listitem")).toHaveLength(3); // remaining items on page 2
  });

  it("new array identity with identical content does not reset user page or query state", async () => {
    const user = userEvent.setup();

    function IdentityHarness() {
      const [data, setData] = useState<TestItem[]>(createItems(20));
      return (
        <div>
          <button
            type="button"
            onClick={() => setData([...createItems(20)])} // new array reference, same items
            aria-label="clone-data"
          >
            Clone
          </button>
          <ListHarness items={data} pageSize={5} />
        </div>
      );
    }

    render(<IdentityHarness />);
    const nextBtn = screen.getByRole("button", { name: "next-page" });
    const searchInput = screen.getByRole("textbox", { name: "search" });

    await user.click(nextBtn); // page 2
    await user.type(searchInput, "Cat A");

    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");

    // Update array reference
    await user.click(screen.getByRole("button", { name: "clone-data" }));

    // Filter query remains intact
    expect((searchInput as HTMLInputElement).value).toBe("Cat A");
  });

  it("supports large lists of 10,000 items with responsive rendering", () => {
    const start = performance.now();
    const largeItems = createItems(10000);

    render(<ListHarness items={largeItems} pageSize={10} />);

    const duration = performance.now() - start;
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/1000");
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    // Must render within reasonable time budget (< 300ms)
    expect(duration).toBeLessThan(300);
  });
});
