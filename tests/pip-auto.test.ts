import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getAutoPipEnabled,
  PIP_AUTO_CHANGED_MESSAGE,
  PIP_AUTO_KEY,
  setAutoPipEnabled
} from "../src/utils/pip-auto"

/**
 * Minimal `chrome.*` mock surface used by pip-auto.ts.
 *
 * The shared tests/setup.ts mocks @plasmohq/storage but doesn't define
 * a `chrome` global — the existing storage module routes through
 * @plasmohq/storage rather than the raw chrome API. pip-auto.ts goes
 * direct to chrome.storage.local on purpose (see the module's header
 * comment), so we set up a small ad-hoc mock per test.
 */
function setupChromeMocks(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial))
  const sentMessages: Array<{
    tabId: number
    message: unknown
    options?: { frameId?: number }
  }> = []
  const queriedTabs: Array<{ id: number }> = [
    { id: 1 },
    { id: 2 },
    { id: 3 }
  ]
  // Per-tab frame map. Default: top frame only — keeps existing
  // assertions about "one message per tab" intact while exercising the
  // getAllFrames path. Tests that need multi-frame behavior override
  // entries on this map directly.
  const framesByTab = new Map<number, Array<{ frameId: number; errorOccurred?: boolean }>>()

  // chrome.tabs.sendMessage has two overloads we use:
  //   sendMessage(tabId, message, callback)
  //   sendMessage(tabId, message, options, callback)
  // Detect which by sniffing the third argument.
  const sendMessage = vi.fn(
    (
      tabId: number,
      message: unknown,
      optionsOrCallback?:
        | { frameId?: number }
        | ((...args: unknown[]) => void),
      _callback?: (...args: unknown[]) => void
    ) => {
      const options =
        typeof optionsOrCallback === "object" && optionsOrCallback !== null
          ? optionsOrCallback
          : undefined
      sentMessages.push({ tabId, message, options })
    }
  )

  const tabsQuery = vi.fn(async () => queriedTabs)
  const storageGet = vi.fn(async (key: string) => {
    if (store.has(key)) return { [key]: store.get(key) }
    return {}
  })
  const storageSet = vi.fn(async (entries: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(entries)) store.set(k, v)
  })

  const getAllFrames = vi.fn(
    (
      details: { tabId: number },
      callback: (
        frames: Array<{ frameId: number; errorOccurred?: boolean }> | undefined
      ) => void
    ) => {
      const frames = framesByTab.get(details.tabId) ?? [{ frameId: 0 }]
      callback(frames)
    }
  )

  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: storageGet,
        set: storageSet
      }
    },
    tabs: {
      query: tabsQuery,
      sendMessage
    },
    webNavigation: {
      getAllFrames
    },
    runtime: {
      lastError: undefined
    }
  }

  return {
    store,
    sentMessages,
    queriedTabs,
    framesByTab,
    sendMessage,
    tabsQuery,
    storageGet,
    storageSet,
    getAllFrames
  }
}

afterEach(() => {
  delete (globalThis as unknown as { chrome?: unknown }).chrome
  vi.restoreAllMocks()
})

describe("getAutoPipEnabled", () => {
  it("returns false when the storage key is unset (first run)", async () => {
    setupChromeMocks()
    await expect(getAutoPipEnabled()).resolves.toBe(false)
  })

  it("returns true only when the stored value is literally true", async () => {
    setupChromeMocks({ [PIP_AUTO_KEY]: true })
    await expect(getAutoPipEnabled()).resolves.toBe(true)
  })

  it("returns false when the stored value is false", async () => {
    setupChromeMocks({ [PIP_AUTO_KEY]: false })
    await expect(getAutoPipEnabled()).resolves.toBe(false)
  })

  it("returns false for non-boolean truthy values (corrupted data)", async () => {
    setupChromeMocks({ [PIP_AUTO_KEY]: "true" })
    await expect(getAutoPipEnabled()).resolves.toBe(false)
  })

  it("returns false when chrome.storage.local is unavailable", async () => {
    // No chrome global set at all
    await expect(getAutoPipEnabled()).resolves.toBe(false)
  })

  it("returns false (does not throw) when chrome.storage.local.get rejects", async () => {
    const mocks = setupChromeMocks()
    mocks.storageGet.mockRejectedValueOnce(new Error("storage unavailable"))
    await expect(getAutoPipEnabled()).resolves.toBe(false)
  })
})

describe("setAutoPipEnabled", () => {
  it("writes the flag with the canonical key shape", async () => {
    const mocks = setupChromeMocks()
    await setAutoPipEnabled(true)
    expect(mocks.storageSet).toHaveBeenCalledWith({ [PIP_AUTO_KEY]: true })
  })

  it("writes false when toggled off", async () => {
    const mocks = setupChromeMocks({ [PIP_AUTO_KEY]: true })
    await setAutoPipEnabled(false)
    expect(mocks.storageSet).toHaveBeenCalledWith({ [PIP_AUTO_KEY]: false })
  })

  it("broadcasts a PIP_AUTO_CHANGED message to every tab returned by tabs.query", async () => {
    const mocks = setupChromeMocks()
    await setAutoPipEnabled(true)
    expect(mocks.tabsQuery).toHaveBeenCalledWith({})
    expect(mocks.sentMessages).toHaveLength(3)
    for (const sent of mocks.sentMessages) {
      expect(sent.message).toEqual({
        type: PIP_AUTO_CHANGED_MESSAGE,
        enabled: true
      })
    }
    expect(mocks.sentMessages.map((m) => m.tabId).sort()).toEqual([1, 2, 3])
  })

  it("broadcasts the disabled state when toggled off", async () => {
    const mocks = setupChromeMocks({ [PIP_AUTO_KEY]: true })
    await setAutoPipEnabled(false)
    for (const sent of mocks.sentMessages) {
      expect(sent.message).toEqual({
        type: PIP_AUTO_CHANGED_MESSAGE,
        enabled: false
      })
    }
  })

  it("does not throw when chrome.storage.local is missing", async () => {
    // No chrome global set at all
    await expect(setAutoPipEnabled(true)).resolves.toBeUndefined()
  })

  it("skips broadcast (but still resolves) when storage write fails", async () => {
    const mocks = setupChromeMocks()
    mocks.storageSet.mockRejectedValueOnce(new Error("quota"))
    await expect(setAutoPipEnabled(true)).resolves.toBeUndefined()
    // Storage failed → broadcast must not happen, otherwise tabs would
    // disagree with the persisted state.
    expect(mocks.sentMessages).toHaveLength(0)
  })

  it("survives a per-tab sendMessage that throws synchronously", async () => {
    const mocks = setupChromeMocks()
    mocks.sendMessage.mockImplementationOnce(() => {
      throw new Error("tab closing")
    })
    await expect(setAutoPipEnabled(true)).resolves.toBeUndefined()
    // Two of three tabs still got messaged — one threw and was skipped.
    expect(mocks.sentMessages.length).toBeGreaterThanOrEqual(2)
  })

  it("fans the broadcast out to every iframe and skips errored frames", async () => {
    const mocks = setupChromeMocks()
    // Tab 1 has a top frame plus one healthy iframe and one errored
    // iframe. Tabs 2 and 3 keep the default top-frame-only mock so the
    // assertion below can reason about a known total.
    mocks.framesByTab.set(1, [
      { frameId: 0 },
      { frameId: 17 },
      { frameId: 23, errorOccurred: true }
    ])
    await setAutoPipEnabled(true)

    // One getAllFrames call per queried tab.
    expect(mocks.getAllFrames).toHaveBeenCalledTimes(3)

    // Tab 1: expect frameId 0 and 17, NOT 23.
    const tab1Sends = mocks.sentMessages.filter((m) => m.tabId === 1)
    const tab1FrameIds = tab1Sends.map((m) => m.options?.frameId).sort()
    expect(tab1FrameIds).toEqual([0, 17])
    // Errored frame must never receive a sendMessage call.
    expect(
      tab1Sends.some((m) => m.options?.frameId === 23)
    ).toBe(false)

    // Tabs 2 and 3 keep top-frame-only behavior, so total sends are
    // 2 (tab 1) + 1 (tab 2) + 1 (tab 3) = 4.
    expect(mocks.sentMessages).toHaveLength(4)
    // Every sendMessage call carries an explicit frameId option so the
    // message lands in the right frame, not just the top one.
    for (const sent of mocks.sentMessages) {
      expect(sent.options).toEqual({ frameId: expect.any(Number) })
    }
  })
})
