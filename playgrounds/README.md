# Playgrounds

Real-world test applications for `@omariyassine/react-list-hooks` — one workspace
per scenario, added as needed (e.g. framework integrations, bundler setups,
stress tests).

Each playground is its own bun workspace (`playgrounds/<name>`) linking the
package via `workspace:*`.

| Playground | Scenario | Package surface exercised |
| :--- | :--- | :--- |
| [`demo`](./demo) | Flagship: interactive Vite + React demo app | `usePaginate`, `useSort`, `useFilter`, `useList` with URL sync, clamping, and 100k-item stress test |

Run all: `bun run test:playgrounds` (builds the package first).
