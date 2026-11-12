# Demo App

Interactive playground for `@omariyassine/react-list-hooks`. Built with React + TypeScript + Vite.

## Running

The demo depends on the library via a Bun workspace link (`workspace:*`), so it always runs against the **local source** — no tarball, no stale copies.

```bash
# from the repo root
bun install

# build the library first (the demo imports from packages/react-list-hooks/dist)
bun run build

# start the dev server
bun run dev
```

The dev server starts at http://localhost:5173/.

## How the workspace link works

- `playgrounds/demo/package.json` declares `"@omariyassine/react-list-hooks": "workspace:*"`.
- Bun symlinks `playgrounds/demo/node_modules/@omariyassine/react-list-hooks` -> `packages/react-list-hooks`.
- The library's `exports` map points at `./dist/*`, so after `bun run build` in `packages/react-list-hooks`, the demo picks up the fresh build immediately. Rebuild the lib to see source changes in the demo.

## Labs

The demo contains one lab per hook, each exercising a different part of the API:

- `PaginateLab` — `usePaginate` with page-size controls and shareable URLs
- `SortLab` — `useSort` with multi-key sorting and indicators
- `FilterLab` — `useFilter` with query search and faceted filters
- `UrlSyncLab` — URL synchronization across all stages
- `ClampingLab` — page clamping when the item count shrinks
- `StressTestLab` — 100k item performance test
- `PipelineVisualizer` — `useList` pipeline with live stage inspection
