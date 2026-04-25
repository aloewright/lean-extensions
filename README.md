# Lean Extensions

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
npm test            # run the suite once
npm run test:watch  # re-run on file changes
```

Test files live in `tests/`:

- `tests/setup.ts` — mocks `@plasmohq/storage` and resets state per test
- `tests/storage.test.ts` — covers `src/storage.ts` round-trips
- `tests/types.test.ts` — verifies `DEFAULT_STORAGE` shape

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

See `ROADMAP.md` for what's next.
