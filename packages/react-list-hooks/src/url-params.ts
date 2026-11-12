/**
 * Shared URL search-param helpers.
 *
 * All hooks read numeric params through these strict parsers: a value only
 * counts as a number when the *entire* string is a positive integer
 * (`?page=2abc` is rejected rather than parsed as `2`).
 */

export function getUrlParamString(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try {
		const searchParams = new URLSearchParams(window.location.search);
		return searchParams.get(key);
	} catch {
		return null;
	}
}

/** Strict positive-integer parse of a URL param. Returns null for garbage, empty, fractional, or <= 0 values. */
export function getUrlParamNumber(key: string): number | null {
	const val = getUrlParamString(key);
	if (val === null) return null;
	const num = Number(val);
	if (val.trim() === '' || !Number.isInteger(num) || num < 1) return null;
	return num;
}
