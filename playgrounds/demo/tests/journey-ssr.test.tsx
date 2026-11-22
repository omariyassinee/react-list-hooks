import { describe, it, expect, afterEach } from "bun:test";
import { renderToString } from "react-dom/server";
import { ListHarness, type TestItem } from "./harness/ListHarness";

function createItems(count = 10): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    category: "Electronics",
    price: (i + 1) * 20,
  }));
}

describe("Journey 5.4: SSR Journey", () => {
  it("renderToString of ListHarness does not throw and produces the initial page markup", () => {
    const items = createItems(15);
    let html = "";

    expect(() => {
      html = renderToString(<ListHarness items={items} pageSize={5} />);
    }).not.toThrow();

    expect(html).toContain("Product 1");
    expect(html).toContain("Product 5");
    expect(html).not.toContain("Product 6");
    expect(html).toContain('data-testid="page-indicator"');
    expect(html).toContain("1<!-- -->/<!-- -->3");
  });
});
