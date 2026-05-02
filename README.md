# Lean Extensions

[![Tests](https://github.com/aloewright/lean-extensions/actions/workflows/test.yml/badge.svg)](https://github.com/aloewright/lean-extensions/actions/workflows/test.yml)

Lean Extensions is a Chrome extension built with [Plasmo](https://www.plasmo.com/)
that helps keep your browser fast by giving you fine-grained control over which
extensions are active. It also collects links, captures pages, and integrates
with NotebookLM so you can move research out of your tabs and into a workspace.

## Features

- Profile and group switching to flip large sets of extensions on or off
- Auto-offload: disable (and optionally uninstall) extensions you haven't used
- Per-extension policy rules: force an extension off on `*.bank.com`, or only
  let it run while a NotebookLM tab is open
- Link collector with right-click "save" and a NotebookLM exporter
- Selection toolbar with read-aloud (via Cloudflare AI Gateway) and search

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
- `tests/background.test.ts` — toggle-all-off/on against a `chrome.management` shim
- `tests/policy.test.ts` — per-extension policy evaluator (hostname glob,
  tab-state condition, default-allow)

The `tests` GitHub Actions workflow (`.github/workflows/test.yml`) runs the
same `npm test` on every pull request and on every push to `main`. CI installs
deps with `--ignore-scripts` so Plasmo's post-install hooks don't fire — the
storage/types tests run in plain Node and don't need the built extension.

Dependabot opens grouped weekly PRs; see `docs/ROADMAP.md`.

## Project layout

```
src/
  background.ts      # service worker (extension management, hotkeys)
  policy.ts          # pure evaluator for per-extension policy rules
  popup.tsx          # toolbar popup UI
  options.tsx        # options page (AI Gateway + policy rules editor)
  storage.ts         # typed wrappers around @plasmohq/storage
  types.ts           # shared types + DEFAULT_STORAGE
  components/        # shared React components
  contents/          # content scripts
  hooks/             # React hooks
  tabs/              # full-page UIs (dashboard etc.)
  utils/             # misc helpers
```

See `ROADMAP.md` for what's next.
