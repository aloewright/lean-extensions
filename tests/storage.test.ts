import { describe, expect, it } from "vitest"

import {
  getAll,
  getGroups,
  getLastUsed,
  getLinks,
  getProfiles,
  getSettings,
  setGroups,
  setLinks,
  setProfiles,
  setSettings,
  touchExtension
} from "../src/storage"
import { DEFAULT_STORAGE } from "../src/types"
import type { CollectedLink, Group, Profile } from "../src/types"

describe("storage", () => {
  it("getAll() returns DEFAULT_STORAGE shape when nothing is stored", async () => {
    const all = await getAll()
    expect(all.profiles).toEqual(DEFAULT_STORAGE.profiles)
    expect(all.groups).toEqual(DEFAULT_STORAGE.groups)
    expect(all.collectedLinks).toEqual(DEFAULT_STORAGE.collectedLinks)
    expect(all.settings).toEqual(DEFAULT_STORAGE.settings)
  })

  it("getSettings() returns the default settings when none are persisted", async () => {
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_STORAGE.settings)
  })

  it("setSettings round-trips via getSettings", async () => {
    await setSettings({ notebookMode: "new", alwaysEnabled: ["a"] })
    const settings = await getSettings()
    expect(settings.notebookMode).toBe("new")
    expect(settings.alwaysEnabled).toEqual(["a"])
  })

  it("setProfiles round-trips via getProfiles", async () => {
    const profiles: Profile[] = [
      { id: "p1", name: "Work", extensionIds: ["ext-a", "ext-b"] }
    ]
    await setProfiles(profiles)
    const back = await getProfiles()
    expect(back).toEqual(profiles)
  })

  it("setGroups round-trips via getGroups", async () => {
    const groups: Group[] = [
      { id: "g1", name: "Dev tools", extensionIds: ["ext-a"], enabled: true }
    ]
    await setGroups(groups)
    const back = await getGroups()
    expect(back).toEqual(groups)
  })

  it("setLinks round-trips via getLinks", async () => {
    const links: CollectedLink[] = [
      {
        id: "l1",
        url: "https://example.com",
        title: "Example",
        tags: ["sample"],
        date: "2026-04-25T00:00:00.000Z"
      }
    ]
    await setLinks(links)
    const back = await getLinks()
    expect(back).toEqual(links)
  })

  it("touchExtension('ext-1') writes an ISO timestamp under 'ext-1'", async () => {
    await touchExtension("ext-1")
    const lastUsed = await getLastUsed()
    expect(Object.keys(lastUsed)).toEqual(["ext-1"])
    const ts = lastUsed["ext-1"]
    expect(typeof ts).toBe("string")
    // Parses as a real date and round-trips back to ISO.
    const parsed = new Date(ts)
    expect(Number.isNaN(parsed.getTime())).toBe(false)
    expect(parsed.toISOString()).toBe(ts)
  })

  it("touchExtension twice updates the same key without duplicating entries", async () => {
    await touchExtension("ext-1")
    const first = (await getLastUsed())["ext-1"]
    // Ensure a measurable time delta so the second timestamp differs.
    await new Promise((resolve) => setTimeout(resolve, 5))
    await touchExtension("ext-1")
    const lastUsed = await getLastUsed()
    expect(Object.keys(lastUsed)).toEqual(["ext-1"])
    const second = lastUsed["ext-1"]
    expect(second >= first).toBe(true)
  })
})
