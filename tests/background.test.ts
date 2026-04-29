import { beforeEach, describe, expect, it, vi } from "vitest"

import { setSettings } from "../src/storage"

// Minimal chrome.management shim so the toggle-all handlers can run.
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
    { id: "a", type: "extension", enabled: true, mayDisable: true },
    { id: "b", type: "extension", enabled: true, mayDisable: true },
    { id: "pinned", type: "extension", enabled: true, mayDisable: true }
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

describe("background toggle commands", () => {
  it("toggle-all-off disables every non-pinned extension", async () => {
    await setSettings({ alwaysEnabled: ["pinned"] })
    const settings = { alwaysEnabled: ["pinned"] }
    const all = await chrome.management.getAll()
    const targets = all.filter(
      (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.mayDisable
    )
    await Promise.all(
      targets
        .filter((e) => !settings.alwaysEnabled.includes(e.id) && e.enabled)
        .map((e) => chrome.management.setEnabled(e.id, false))
    )
    expect(setEnabled).toHaveBeenCalledWith("a", false)
    expect(setEnabled).toHaveBeenCalledWith("b", false)
    expect(setEnabled).not.toHaveBeenCalledWith("pinned", false)
    expect(setEnabled).not.toHaveBeenCalledWith("self", false)
  })

  it("toggle-all-on re-enables every manageable extension", async () => {
    exts.forEach((e) => { if (e.id !== "self") e.enabled = false })
    const all = await chrome.management.getAll()
    const targets = all.filter(
      (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.mayDisable
    )
    await Promise.all(targets.map((e) => chrome.management.setEnabled(e.id, true)))
    expect(setEnabled).toHaveBeenCalledWith("a", true)
    expect(setEnabled).toHaveBeenCalledWith("b", true)
    expect(setEnabled).toHaveBeenCalledWith("pinned", true)
  })
})
