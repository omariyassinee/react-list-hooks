import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	splitting: true,
	minify: true,
	treeshake: true,
	clean: true,
	external: ['react'],
});
