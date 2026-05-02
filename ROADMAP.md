# Roadmap

Living plan for Lean Extensions. Items move up the list as they land.

## Now

- Vitest harness with happy-dom and `@plasmohq/storage` mock
- Unit coverage for `src/storage.ts` round-trips and `DEFAULT_STORAGE`
- Hardening of the storage layer so callers always get well-typed defaults
- GitHub Actions `tests` workflow gates `npm test` on every PR and push to
  `main` (Node 22, deps installed with `--ignore-scripts`)

## Next

- NotebookLM integration polish: better append-vs-new heuristics, friendlier
  errors when the tab is missing, retries on transient navigation failures
- Playwright end-to-end tests that drive a real Chromium with the built
  extension loaded, exercising the popup, dashboard, and hotkeys (ALO-105)
- `background.ts` unit tests for `toggle-all-off/on`, `save-link`, and alarm
  handlers using a `chrome.management` mock (ALO-105)

## Recently shipped

- Per-extension policy rules (PDX-89): typed schema in `src/types.ts`, pure
  evaluator in `src/policy.ts` hooked into the toggle path in
  `src/background.ts`, Options UI for add/remove, and Vitest coverage for
  hostname match, tab-state condition, and default-allow.

## Later

- Firefox WebExtensions port (manifest v3 with the Firefox-specific tweaks)
- Cloud sync for profiles, groups, and collected links so settings follow you
  across machines
- Advanced auto-offload heuristics: idle-time scoring, per-site usage signals,
  and suggested profiles based on browsing patterns
