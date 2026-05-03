import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // The e2e suite has its own config (`vitest.e2e.config.ts`) and
    // drives a real Chromium via Puppeteer — keep it out of the unit
    // run so `npm test` stays fast and Node-only.
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "e2e/**"]
  }
})
