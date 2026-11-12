import { rm } from 'node:fs/promises';

const outdir = 'dist';

// Bun.build has no `clean` option — remove the output dir first so stale
// artifacts (e.g. old CJS files) don't linger in the published package.
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
	entrypoints: [
		'src/index.ts',
		'src/context.ts',
		'src/use-paginate.ts',
		'src/use-filter.ts',
		'src/use-sort.ts',
		'src/use-list.ts',
	],
	outdir,
	root: 'src',
	format: 'esm',
	target: 'browser',
	splitting: true,
	minify: false,
	external: ['react'],
});

if (!result.success) {
	console.error('Build failed:');
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

console.log('Build succeeded:');
for (const output of result.outputs) {
	console.log(`  ${output.path}`);
}
