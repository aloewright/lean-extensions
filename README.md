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
npm test            # run the unit suite once
npm run test:watch  # re-run on file changes
npm run test:e2e    # build + run the Puppeteer end-to-end suite
```

Test files live in `tests/` (unit) and `e2e/` (browser-driven):

- `tests/setup.ts` — mocks `@plasmohq/storage` and resets state per test
- `tests/storage.test.ts` — covers `src/storage.ts` round-trips
- `tests/types.test.ts` — verifies `DEFAULT_STORAGE` shape
- `tests/background.test.ts` — toggle-all-off/on against a `chrome.management` shim
- `tests/policy.test.ts` — per-extension policy evaluator (hostname glob,
  tab-state condition, default-allow)
- `e2e/policy-enforcement.spec.ts` — drives a real Chromium with the
  unpacked Plasmo build via [Puppeteer](https://pptr.dev/), seeds a
  hostname-match `disable` policy into `chrome.storage.local`,
  navigates a tab to a `*.bank.com` fixture (resolved to a local http
  server via `--host-resolver-rules`), and asserts that the
  background's `chrome.tabs.onUpdated` -> `reapplyPolicies` ->
  `chrome.management.setEnabled(id, false)` chain fires.

The e2e suite builds the extension first and then installs its own
dependency tree under `e2e/node_modules` (both via the `pretest:e2e`
hook). Keeping puppeteer out of the root `package.json` means the
unit-test CI install stays small and the root `pnpm-lock.yaml` does
not need to track Chromium-version-pinned binaries. Puppeteer's
postinstall downloads a Chromium-for-testing build into
`~/.cache/puppeteer` on first run.

CI workflows under `.github/workflows/`:

- `test.yml` runs `pnpm test` (unit) on every PR and every push to
  `main`. Deps are installed with `--ignore-scripts` so Plasmo's
  post-install hooks don't fire.
- `e2e.yml` runs `pnpm test:e2e` on every PR and every push to `main`.
  It installs root deps with `--ignore-scripts`, then the
  `pretest:e2e` hook builds the extension and installs the isolated
  `e2e/` dependency tree (puppeteer + Chromium). Both `~/.cache/
  puppeteer` and `e2e/node_modules` are cached across runs, and
  Chromium runs under `xvfb-run` so the MV3 service worker has a
  display server to attach to.

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
