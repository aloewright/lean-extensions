# Lean Extensions

[![Tests](https://github.com/aloewright/lean-extensions/actions/workflows/test.yml/badge.svg)](https://github.com/aloewright/lean-extensions/actions/workflows/test.yml)

Lean Extensions is a Chrome extension built with [Plasmo](https://www.plasmo.com/)
that helps keep your browser fast by giving you fine-grained control over which
extensions are active. It also collects links, captures pages, and integrates
with NotebookLM so you can move research out of your tabs and into a workspace.

## Build

```bash
pnpm install        # install dependencies
pnpm dev            # run Plasmo in dev mode (loads into Chrome)
pnpm build          # production build
pnpm package        # zip a distributable artifact
```

The repo also works with `npm` if you don't have pnpm available.

## Testing

Unit tests run under [Vitest](https://vitest.dev/) with a `happy-dom`
environment. The `@plasmohq/storage` package is mocked with an in-memory
`Map`, so tests do not require Chrome APIs.

```bash
pnpm test               # run the suite once
pnpm run test:watch     # re-run on file changes
pnpm test --coverage    # v8 coverage report (text + lcov)
```

Test files live in `tests/`:

- `tests/setup.ts` — mocks `@plasmohq/storage` and resets state per test
- `tests/storage.test.ts` — covers `src/storage.ts` round-trips
- `tests/types.test.ts` — verifies `DEFAULT_STORAGE` shape
- `tests/background.test.ts` — toggle-all-off/on against a `chrome.management` shim

## Continuous Integration

`.github/workflows/test.yml` runs three jobs in parallel on every PR and
on every push to `main`:

- `test` — `pnpm test` (Vitest). Required.
- `typecheck` — `pnpm exec tsc --noEmit`. Currently `continue-on-error: true`
  while pre-existing type debt is resolved (ALO-110).
- `build` — `pnpm build` (full Plasmo production build, smoke-only).
  `continue-on-error: true` so packaging drift is reported without gating
  PRs (ALO-112).

Dependabot opens grouped weekly PRs; see `docs/ROADMAP.md`.

## Project layout

```
src/
  background.ts      # service worker (extension management, hotkeys)
  popup.tsx          # toolbar popup UI
  storage.ts         # typed wrappers around @plasmohq/storage
  types.ts           # shared types + DEFAULT_STORAGE
  components/        # shared React components
  contents/          # content scripts
  hooks/             # React hooks
  tabs/              # full-page UIs (dashboard etc.)
  utils/             # misc helpers
```

See `docs/ROADMAP.md` for what's next.
