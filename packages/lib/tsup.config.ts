import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/use-paginate.ts', 'src/use-filter.ts', 'src/use-sort.ts', 'src/use-list.ts'],
	// 'cjs' is required: package.json declares `main` + `require` export conditions
	// pointing at dist/*.cjs / *.d.cts. (splitting only applies to the ESM output.)
	format: ['esm', 'cjs'],
	dts: true,
	splitting: true,
	minify: false,
	treeshake: true,
	clean: true,
	external: ['react'],
});
