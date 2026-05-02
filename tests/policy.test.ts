import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  applyPoliciesToToggle,
  conditionMatches,
  evaluatePolicies,
  hostnameMatches,
  urlMatches
} from "../src/policy"
import { getPolicies, setPolicies } from "../src/storage"
import type { ExtensionPolicy } from "../src/types"

// Lightweight chrome.management shim (mirrors background.test.ts) so the
// evaluator can be exercised against the same surface area as the
// existing toggle tests. The evaluator itself is pure — we only need
// the mock to confirm the storage-round-trip path the background uses
// when reading policies.
type FakeExt = { id: string; type: string; enabled: boolean; mayDisable: boolean }

const exts: FakeExt[] = []
const setEnabled = vi.fn(async (id: string, enabled: boolean) => {
  const ext = exts.find((e) => e.id === id)
  if (ext) ext.enabled = enabled
})

beforeEach(() => {
  exts.length = 0
  exts.push(
    { id: "self", type: "extension", enabled: true, mayDisable: true },
    { id: "ext-finance", type: "extension", enabled: true, mayDisable: true },
    { id: "ext-research", type: "extension", enabled: false, mayDisable: true }
  )
  setEnabled.mockClear()
  ;(globalThis as any).chrome = {
    runtime: { id: "self" },
    management: {
      getAll: async () => exts.map((e) => ({ ...e })),
      setEnabled
    }
  }
})

describe("hostnameMatches", () => {
  it("matches a literal hostname", () => {
    expect(hostnameMatches("bank.com", "bank.com")).toBe(true)
    expect(hostnameMatches("notbank.com", "bank.com")).toBe(false)
  })

  it("matches a *.bank.com glob against subdomains", () => {
    expect(hostnameMatches("chase.bank.com", "*.bank.com")).toBe(true)
    expect(hostnameMatches("www.bank.com", "*.bank.com")).toBe(true)
  })

  it("does not match unrelated hosts", () => {
    expect(hostnameMatches("example.com", "*.bank.com")).toBe(false)
  })
})

describe("urlMatches", () => {
  it("matches a Chrome-style url pattern", () => {
    expect(
      urlMatches(
        "https://notebooklm.google.com/notebook/abc",
        "*://*.notebooklm.google.com/*"
      )
    ).toBe(true)
  })

  it("rejects urls outside the pattern", () => {
    expect(
      urlMatches(
        "https://google.com/search",
        "*://*.notebooklm.google.com/*"
      )
    ).toBe(false)
  })
})

describe("conditionMatches", () => {
  it("hostname-match against the active tab url", () => {
    expect(
      conditionMatches(
        { kind: "hostname-match", pattern: "*.bank.com" },
        { activeTabUrl: "https://chase.bank.com/login", openTabUrls: [] }
      )
    ).toBe(true)
  })

  it("tab-open against any open tab url", () => {
    expect(
      conditionMatches(
        { kind: "tab-open", urlPattern: "*://*.notebooklm.google.com/*" },
        {
          activeTabUrl: "https://example.com",
          openTabUrls: ["https://example.com", "https://notebooklm.google.com/n/1"]
        }
      )
    ).toBe(true)
  })
})

describe("evaluatePolicies", () => {
  it("returns null when no rules exist (default allow)", () => {
    const decision = evaluatePolicies("ext-finance", [], {
      activeTabUrl: "https://example.com",
      openTabUrls: ["https://example.com"]
    })
    expect(decision).toBeNull()
  })

  it("returns null when rules exist but none target the extension", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-other",
        condition: { kind: "hostname-match", pattern: "*.bank.com" },
        action: "disable"
      }
    ]
    const decision = evaluatePolicies("ext-finance", policies, {
      activeTabUrl: "https://chase.bank.com/login",
      openTabUrls: []
    })
    expect(decision).toBeNull()
  })

  it("hostname glob match returns 'disable' for a `disable` policy", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-finance",
        condition: { kind: "hostname-match", pattern: "*.bank.com" },
        action: "disable"
      }
    ]
    const decision = evaluatePolicies("ext-finance", policies, {
      activeTabUrl: "https://chase.bank.com/login",
      openTabUrls: []
    })
    expect(decision).toBe("disable")
  })

  it("tab-state condition: enable-only returns 'enable' when matching tab open", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-research",
        condition: { kind: "tab-open", urlPattern: "*://*.notebooklm.google.com/*" },
        action: "enable-only"
      }
    ]
    const decision = evaluatePolicies("ext-research", policies, {
      activeTabUrl: "https://example.com",
      openTabUrls: ["https://example.com", "https://notebooklm.google.com/n/abc"]
    })
    expect(decision).toBe("enable")
  })

  it("tab-state condition: enable-only returns 'disable' when no matching tab is open", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-research",
        condition: { kind: "tab-open", urlPattern: "*://*.notebooklm.google.com/*" },
        action: "enable-only"
      }
    ]
    const decision = evaluatePolicies("ext-research", policies, {
      activeTabUrl: "https://example.com",
      openTabUrls: ["https://example.com"]
    })
    expect(decision).toBe("disable")
  })

  it("explicit 'disable' wins over 'enable-only' when both apply", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p-allow",
        extensionId: "ext-research",
        condition: { kind: "tab-open", urlPattern: "*://*.notebooklm.google.com/*" },
        action: "enable-only"
      },
      {
        id: "p-deny",
        extensionId: "ext-research",
        condition: { kind: "hostname-match", pattern: "*.bank.com" },
        action: "disable"
      }
    ]
    const decision = evaluatePolicies("ext-research", policies, {
      activeTabUrl: "https://chase.bank.com/login",
      openTabUrls: ["https://chase.bank.com/login", "https://notebooklm.google.com/n/abc"]
    })
    expect(decision).toBe("disable")
  })
})

describe("applyPoliciesToToggle", () => {
  it("default-allow honors the desired enabled value when no rule applies", () => {
    expect(applyPoliciesToToggle("ext-finance", true, [], {
      activeTabUrl: "https://example.com",
      openTabUrls: []
    })).toBe(true)
    expect(applyPoliciesToToggle("ext-finance", false, [], {
      activeTabUrl: "https://example.com",
      openTabUrls: []
    })).toBe(false)
  })

  it("forces disabled when a hostname-match disable rule fires", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-finance",
        condition: { kind: "hostname-match", pattern: "*.bank.com" },
        action: "disable"
      }
    ]
    expect(
      applyPoliciesToToggle("ext-finance", true, policies, {
        activeTabUrl: "https://chase.bank.com/login",
        openTabUrls: []
      })
    ).toBe(false)
  })

  it("forces enabled while a NotebookLM tab is open via enable-only", () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-research",
        condition: { kind: "tab-open", urlPattern: "*://*.notebooklm.google.com/*" },
        action: "enable-only"
      }
    ]
    expect(
      applyPoliciesToToggle("ext-research", false, policies, {
        activeTabUrl: "https://example.com",
        openTabUrls: ["https://notebooklm.google.com/n/abc"]
      })
    ).toBe(true)
  })
})

describe("policy storage round-trip + chrome.management toggle path", () => {
  it("persists policies and applies them when toggling against the chrome.management mock", async () => {
    const policies: ExtensionPolicy[] = [
      {
        id: "p1",
        extensionId: "ext-finance",
        condition: { kind: "hostname-match", pattern: "*.bank.com" },
        action: "disable"
      }
    ]
    await setPolicies(policies)
    const back = await getPolicies()
    expect(back).toEqual(policies)

    // Simulate the background toggle path: caller wants ext-finance
    // enabled, but a `*.bank.com` page is active. The policy must
    // override and the call to chrome.management.setEnabled must
    // receive `false`.
    const ctx = {
      activeTabUrl: "https://chase.bank.com/login",
      openTabUrls: ["https://chase.bank.com/login"]
    }
    const final = applyPoliciesToToggle("ext-finance", true, back, ctx)
    await chrome.management.setEnabled("ext-finance", final)
    expect(setEnabled).toHaveBeenCalledWith("ext-finance", false)
  })
})
