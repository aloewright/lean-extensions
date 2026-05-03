import { defineConfig } from "vitest/config"

// Separate Vitest config for the Puppeteer-driven e2e suite.
//
// The unit suite (`vitest.config.ts`) runs in `happy-dom` and mocks
// `@plasmohq/storage`; e2e tests don't import any source modules and
// instead drive a real Chromium via Puppeteer — so they need a plain
// Node environment, no DOM mocks, and a much longer timeout.
export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.spec.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Each spec spins up its own browser; serial keeps Chromium
    // memory bounded on CI.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
})
