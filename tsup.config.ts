import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/use-paginate.ts', 'src/use-filter.ts', 'src/use-sort.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	splitting: true,
	minify: false,
	treeshake: true,
	clean: true,
	external: ['react'],
});
