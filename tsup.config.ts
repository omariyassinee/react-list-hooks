import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/use-paginator.ts', 'src/use-filter.ts', 'src/use-sort.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	splitting: true,
	minify: true,
	treeshake: true,
	clean: true,
	external: ['react'],
});
