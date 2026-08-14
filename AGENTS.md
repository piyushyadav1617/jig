# jig

## Runtime & package manager

- **Runtime:** Bun (not Node). All scripts use `bun` not `node`/`npm`.
- **Package manager:** Bun (uses `bun.lock`, not `package-lock.json`).

## Commands

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Run app | `bun run index.ts` (or `jig` after `bun link`) |
| Type-check | `bun run tsc --noEmit` |

## Structure

- **Entrypoint:** `index.ts` (single-file app).
- **No tests, linting, or formatting configured** – add before introducing new tooling.

## TypeScript quirks

- `module: "Preserve"` + `moduleResolution: "bundler"` – imports use explicit `.ts` extensions.
- `noEmit: true` – Bun handles transpilation at runtime; `tsc` is type-check only.
- `types: ["bun"]` – Bun types are already configured; does **not** need `@types/node` directly.
