import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListHarness, type TestItem } from './harness/ListHarness';

afterEach(() => {
	cleanup();
});

// Generate 23 items as specified in the testing skill Section 5.1
function generateItems(count = 23): TestItem[] {
	return Array.from({ length: count }, (_, i) => {
		const id = i + 1;
		// Staggered names and categories to test sorting and filtering clearly
		const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
		const categories = ['Audio', 'Gadgets', 'Wearables', 'Computing'];
		return {
			id,
			name: `${names[i % names.length]} Product ${id}`,
			category: categories[i % categories.length] ?? 'General',
			price: ((i * 17) % 100) + 10,
		};
	});
}

describe('Journey 5.1: Core A-to-Z Journey', () => {
	it('executes full journey: render → filter → sort asc/desc → navigate to last page → clear filter', async () => {
		const user = userEvent.setup();
		const items = generateItems(23);

		// 1 & 2. Render with 23 items and page size 5
		render(<ListHarness items={items} pageSize={5} />);

		const pageIndicator = screen.getByTestId('page-indicator');
		const prevBtn = screen.getByRole('button', { name: 'prev-page' });
		const nextBtn = screen.getByRole('button', { name: 'next-page' });
		const searchInput = screen.getByRole('textbox', { name: 'search' });

		// Initial state assertion
		expect(pageIndicator.textContent).toBe('1/5');
		expect(prevBtn.hasAttribute('disabled')).toBe(true);
		expect(nextBtn.hasAttribute('disabled')).toBe(false);
		expect(screen.getAllByRole('listitem')).toHaveLength(5);

		// 3. Type in the search box; assert filtered rows and page count
		await user.type(searchInput, 'Alpha');
		// "Alpha" occurs in items: id 1, 9, 17 (3 items total) -> 3 items with pageSize 5 = 1 page
		expect(screen.getByTestId('page-indicator').textContent).toBe('1/1');
		expect(screen.getAllByRole('listitem')).toHaveLength(3);
		expect(screen.getByTestId('filtered-count').textContent).toBe('Filtered: 3');

		// 4. Click sort price; assert ascending, then click again for descending
		const sortPriceBtn = screen.getByRole('button', { name: 'sort-price' });
		await user.click(sortPriceBtn); // 1st click: asc

		let prices = screen
			.getAllByRole('listitem')
			.map((li) => Number(li.querySelector('[data-field="price"]')?.textContent));
		expect(prices).toEqual([...prices].sort((a, b) => a - b));

		await user.click(sortPriceBtn); // 2nd click: desc
		prices = screen
			.getAllByRole('listitem')
			.map((li) => Number(li.querySelector('[data-field="price"]')?.textContent));
		expect(prices).toEqual([...prices].sort((a, b) => b - a));

		// 5. Clear filter and navigate to the last page; assert partial last page & disabled Next
		const clearFilterBtn = screen.getByRole('button', { name: 'clear-filter' });
		await user.click(clearFilterBtn);

		expect(screen.getByTestId('page-indicator').textContent).toBe('1/5');
		expect(screen.getAllByRole('listitem')).toHaveLength(5);

		// Click next to page 2, 3, 4, 5
		await user.click(nextBtn); // page 2
		expect(pageIndicator.textContent).toBe('2/5');
		await user.click(nextBtn); // page 3
		expect(pageIndicator.textContent).toBe('3/5');
		await user.click(nextBtn); // page 4
		expect(pageIndicator.textContent).toBe('4/5');
		await user.click(nextBtn); // page 5 (last page)
		expect(pageIndicator.textContent).toBe('5/5');

		// Page 5 has remaining 3 items (23 total - 20 on pages 1-4)
		expect(screen.getAllByRole('listitem')).toHaveLength(3);
		expect(nextBtn.hasAttribute('disabled')).toBe(true);
		expect(prevBtn.hasAttribute('disabled')).toBe(false);
	});
});
