// e2e: policy enforcement smoke (PDX-102)
//
// Loads the unpacked Plasmo build into a real Chromium via Puppeteer
// and verifies that the wiring in `src/background.ts` honors a
// hostname-match `disable` policy on a real `chrome.tabs.onUpdated`
// event.
//
// The Vitest suite (`tests/policy.test.ts`) already covers
// `evaluatePolicies` + `applyPoliciesToToggle` purely. This e2e
// covers the path in between: tab event -> reapplyPolicies ->
// chrome.management.setEnabled.
//
// The only extension actually installed in the test profile is
// Lean Extensions itself, and the background skips it. To exercise
// the toggle path against a synthetic extension id we install a
// shim in the service worker scope:
//
//   - chrome.management.getAll is overridden to return a fake
//     manageable extension ("ext-finance") in addition to whatever
//     Chrome reports.
//   - chrome.management.setEnabled is wrapped to record (id,
//     enabled) calls into chrome.storage.local under the key
//     `__e2e_setEnabled_calls`.
//
// We then seed a `*.bank.com` -> disable policy for `ext-finance`
// into chrome.storage.local, navigate a tab to a bank.com fixture
// (resolved to a local http server via --host-resolver-rules), and
// read the recorded calls back from storage.

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createServer, type Server } from "node:http"
import { readFileSync } from "node:fs"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import type { AddressInfo } from "node:net"
import puppeteer, { type Browser, type Target } from "puppeteer"

const REPO_ROOT = resolve(__dirname, "..")
const EXT_PATH = join(REPO_ROOT, "build", "chrome-mv3-prod")
const FIXTURE_PATH = join(REPO_ROOT, "tests", "fixtures", "bank.html")

// Generous default timeout: launching Chromium + waiting for the
// MV3 service worker to come up is slow (especially in CI).
const E2E_TIMEOUT_MS = 90_000

describe("policy enforcement e2e", () => {
  let browser: Browser | undefined
  let server: Server | undefined
  let port = 0
  let extensionId = ""

  beforeAll(async () => {
    if (!existsSync(EXT_PATH)) {
      throw new Error(
        `Built extension not found at ${EXT_PATH}. Run \`npm run build\` first.`
      )
    }

    // Tiny static server so the test never touches the real bank.com.
    const html = readFileSync(FIXTURE_PATH, "utf-8")
    server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(html)
    })
    await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r))
    port = (server!.address() as AddressInfo).port

    const launchArgs = [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      // Map every *.bank.com:<port> request to the local server.
      `--host-resolver-rules=MAP bank.com:${port} 127.0.0.1:${port}, MAP *.bank.com:${port} 127.0.0.1:${port}`,
      "--no-first-run",
      "--no-default-browser-check",
      // CI runs as root and without a sandbox-capable kernel.
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]

    browser = await puppeteer.launch({
      // MV3 service workers need a real Chromium event loop. The new
      // headless mode supports them; pin to the string form for
      // forward compat with puppeteer 22+.
      headless: true,
      args: launchArgs,
      // Use the extension target type so we can grab the SW.
      defaultViewport: null
    })

    // Wait for the service worker target to appear so we know the
    // extension has booted.
    const swTarget = await browser.waitForTarget(
      (t: Target) =>
        t.type() === "service_worker" &&
        t.url().startsWith("chrome-extension://"),
      { timeout: E2E_TIMEOUT_MS }
    )
    extensionId = new URL(swTarget.url()).host
    expect(extensionId).toMatch(/^[a-p]{32}$/)
  }, E2E_TIMEOUT_MS)

  afterAll(async () => {
    try {
      await browser?.close()
    } catch {
      /* ignore */
    }
    await new Promise<void>((r) => server?.close(() => r()))
  })

  it(
    "fires chrome.management.setEnabled(false) on a hostname-match disable policy when a tab navigates to *.bank.com",
    async () => {
      if (!browser) throw new Error("browser failed to launch")

      // Re-locate the SW target each run; it may have suspended.
      const swTarget = await browser.waitForTarget(
        (t: Target) =>
          t.type() === "service_worker" &&
          t.url().startsWith(`chrome-extension://${extensionId}/`),
        { timeout: E2E_TIMEOUT_MS }
      )
      const sw = await swTarget.worker()
      if (!sw) throw new Error("service worker target had no worker handle")

      // Install instrumentation + seed a fake managed extension.
      // We patch chrome.management.getAll so reapplyPolicies sees a
      // synthetic "ext-finance" target, and wrap setEnabled so we
      // can read the call log back from chrome.storage.local.
      await sw.evaluate(async () => {
        const w = self as unknown as {
          __e2e_installed?: boolean
          __e2e_realSetEnabled?: typeof chrome.management.setEnabled
          __e2e_realGetAll?: typeof chrome.management.getAll
        }
        if (w.__e2e_installed) return
        w.__e2e_installed = true

        const fakeExts = [
          {
            id: "ext-finance-eeeeeeeeeeeeeeeeeeee",
            name: "Finance Helper (e2e fake)",
            description: "",
            version: "0.0.0",
            enabled: true,
            mayDisable: true,
            installType: "normal",
            type: "extension",
            shortName: "fin",
            offlineEnabled: false,
            optionsUrl: "",
            hostPermissions: [],
            permissions: []
          }
        ]

        w.__e2e_realGetAll = chrome.management.getAll.bind(chrome.management)
        ;(chrome.management as any).getAll = async (cb?: (r: any) => void) => {
          const real = await w.__e2e_realGetAll!()
          const merged = [...real, ...fakeExts]
          if (typeof cb === "function") cb(merged)
          return merged as any
        }

        w.__e2e_realSetEnabled = chrome.management.setEnabled.bind(
          chrome.management
        )
        ;(chrome.management as any).setEnabled = async (
          id: string,
          enabled: boolean,
          cb?: () => void
        ) => {
          const log =
            ((await chrome.storage.local.get("__e2e_setEnabled_calls"))[
              "__e2e_setEnabled_calls"
            ] as Array<{ id: string; enabled: boolean; ts: number }>) ?? []
          log.push({ id, enabled, ts: Date.now() })
          await chrome.storage.local.set({ __e2e_setEnabled_calls: log })

          // Forward to the real API for the real extension targets so
          // we don't break unrelated background behavior. For our
          // synthetic id, the real API would throw — swallow the
          // error and just keep the recorded call.
          if (id !== "ext-finance-eeeeeeeeeeeeeeeeeeee") {
            try {
              await w.__e2e_realSetEnabled!(id, enabled)
            } catch {
              /* ignore */
            }
          }
          if (typeof cb === "function") cb()
        }
      })

      // Seed the policy that the background reads on every tab event.
      // Plasmo's @plasmohq/storage(area: "local") namespaces keys, so
      // we write what `getPolicies()` will read back: the same key
      // and the same JSON encoding @plasmohq/storage uses
      // (`JSON.stringify(value)`).
      const policyValue = [
        {
          id: "p-e2e-1",
          extensionId: "ext-finance-eeeeeeeeeeeeeeeeeeee",
          condition: { kind: "hostname-match", pattern: "*.bank.com" },
          action: "disable"
        }
      ]
      await sw.evaluate(async (encoded: string) => {
        await chrome.storage.local.set({
          extensionPolicies: encoded,
          __e2e_setEnabled_calls: []
        })
      }, JSON.stringify(policyValue))

      // Drive a real tab event: navigate to the fixture under
      // *.bank.com — the host resolver rules redirect to localhost.
      const PORT = (server!.address() as AddressInfo).port
      const page = await browser.newPage()
      await page.goto(`http://chase.bank.com:${PORT}/`, {
        waitUntil: "load",
        timeout: E2E_TIMEOUT_MS
      })

      // Background's onUpdated fires reapplyPolicies asynchronously.
      // Poll storage for up to ~10s.
      const deadline = Date.now() + 15_000
      let calls: Array<{ id: string; enabled: boolean }> = []
      while (Date.now() < deadline) {
        calls = (await sw.evaluate(async () => {
          const v = await chrome.storage.local.get("__e2e_setEnabled_calls")
          return (v["__e2e_setEnabled_calls"] as any[]) ?? []
        })) as any
        if (
          calls.some(
            (c) =>
              c.id === "ext-finance-eeeeeeeeeeeeeeeeeeee" && c.enabled === false
          )
        ) {
          break
        }
        await new Promise((r) => setTimeout(r, 250))
      }

      await page.close()

      const fired = calls.filter(
        (c) => c.id === "ext-finance-eeeeeeeeeeeeeeeeeeee"
      )
      // Helpful diagnostic if the wiring breaks — without it, "received []"
      // doesn't tell you whether the SW even saw the tab event.
      if (fired.length === 0) {
        // eslint-disable-next-line no-console
        console.error("setEnabled call log:", JSON.stringify(calls, null, 2))
      }
      expect(fired.length).toBeGreaterThan(0)
      expect(fired[fired.length - 1].enabled).toBe(false)
    },
    E2E_TIMEOUT_MS
  )
})
