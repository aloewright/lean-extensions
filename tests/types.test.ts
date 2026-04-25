import { describe, expect, it } from "vitest"

import { DEFAULT_STORAGE } from "../src/types"

describe("DEFAULT_STORAGE", () => {
  it("profiles, groups, and collectedLinks are all empty arrays", () => {
    expect(Array.isArray(DEFAULT_STORAGE.profiles)).toBe(true)
    expect(DEFAULT_STORAGE.profiles).toHaveLength(0)
    expect(Array.isArray(DEFAULT_STORAGE.groups)).toBe(true)
    expect(DEFAULT_STORAGE.groups).toHaveLength(0)
    expect(Array.isArray(DEFAULT_STORAGE.collectedLinks)).toBe(true)
    expect(DEFAULT_STORAGE.collectedLinks).toHaveLength(0)
  })

  it("settings.notebookMode === 'append'", () => {
    expect(DEFAULT_STORAGE.settings.notebookMode).toBe("append")
  })

  it("settings.alwaysEnabled is an empty array (not undefined)", () => {
    expect(DEFAULT_STORAGE.settings.alwaysEnabled).toBeDefined()
    expect(Array.isArray(DEFAULT_STORAGE.settings.alwaysEnabled)).toBe(true)
    expect(DEFAULT_STORAGE.settings.alwaysEnabled).toHaveLength(0)
  })
})
