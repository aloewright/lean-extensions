# Roadmap (docs)

See also the top-level `ROADMAP.md` for the long-running living plan. This
file tracks per-cycle Now/Next/Later snapshots so we can look back at what
shipped in each iteration.

## Cycle 2026-04-29

### Now (shipped this cycle)

- Dependabot weekly rotation across codemode / ai-dev-sidebar /
  lean-extensions, with `dev-deps-minor-patch` grouping and
  `dependencies` + `automated` labels (ALO-113).
- Partial ALO-105: Vitest unit coverage for `src/background.ts`
  toggle-all-off / toggle-all-on flows using a `chrome.management` shim,
  reusing the existing `@plasmohq/storage` in-memory mock from
  `tests/setup.ts`.

### Next

- Full ALO-105: Playwright end-to-end tests that drive a real Chromium
  with the built extension loaded, exercising the popup, dashboard, and
  hotkeys.

### Later

- Firefox WebExtensions port.
- Cloud sync for profiles, groups, and collected links.
- Advanced auto-offload heuristics (idle-time scoring, per-site signals,
  suggested profiles).
