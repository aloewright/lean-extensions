# Roadmap

Living plan for Lean Extensions. Items move up the list as they land.

## Now

- Per-extension policy rules (e.g. "disable on `*.bank.com`",
  "only enable while a NotebookLM tab is open") — typed schema in
  `src/types.ts`, evaluator hooked into the toggle path in `background.ts`,
  unit tests against a `chrome.management` mock.
- NotebookLM integration polish: better append-vs-new heuristics, friendlier
  errors when the tab is missing, retries on transient navigation failures.
- Dashboard surfacing of saved links with filter-by-source and quick-delete.

## Next

- Playwright end-to-end tests that drive a real Chromium with the built
  extension loaded, exercising the popup, dashboard, and hotkeys.
- Advanced auto-offload heuristics: idle-time scoring, per-site usage
  signals, and suggested profiles based on browsing patterns.
- Hotkey customization UI in `options.tsx` — let users rebind
  `toggle-all-off/on`, `save-link`, and the dashboard shortcut.
- Performance metrics surfaced in the popup (extensions disabled count,
  memory savings estimate).

## Later

- Firefox WebExtensions port (manifest v3 with the Firefox-specific tweaks).
- Cloud sync for profiles, groups, and collected links so settings follow
  you across machines.
- Per-profile keyboard layouts so a "research" profile and a "shopping"
  profile can carry different shortcut sets.
- Public profile gallery so users can share/import named extension groups.

## Done

- Vitest harness with happy-dom and `@plasmohq/storage` mock in
  `tests/setup.ts`.
- Unit coverage for `src/storage.ts` round-trips and `DEFAULT_STORAGE`.
- Hardening of the storage layer so callers always get well-typed defaults.
- GitHub Actions `tests` workflow gates `npm test` on every PR and push to
  `main` (Node 22, deps installed with `--ignore-scripts`).
- `background.ts` unit tests for `toggle-all-off/on`, `save-link`, and alarm
  handlers using a `chrome.management` mock (`tests/background.test.ts`).
