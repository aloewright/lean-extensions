import { Storage } from "@plasmohq/storage"
import type { CollectedLink, Group, Profile, Settings, StorageSchema } from "./types"
import { DEFAULT_STORAGE } from "./types"

const storage = new Storage({ area: "local" })

export async function getAll(): Promise<StorageSchema> {
  const profiles = await storage.get<Profile[]>("profiles") ?? DEFAULT_STORAGE.profiles
  const groups = await storage.get<Group[]>("groups") ?? DEFAULT_STORAGE.groups
  const collectedLinks = await storage.get<CollectedLink[]>("collectedLinks") ?? DEFAULT_STORAGE.collectedLinks
  const settings = await storage.get<Settings>("settings") ?? DEFAULT_STORAGE.settings
  return { profiles, groups, collectedLinks, settings }
}

export async function getSettings(): Promise<Settings> {
  return await storage.get<Settings>("settings") ?? DEFAULT_STORAGE.settings
}

export async function setSettings(settings: Settings): Promise<void> {
  await storage.set("settings", settings)
}

export async function getProfiles(): Promise<Profile[]> {
  return await storage.get<Profile[]>("profiles") ?? []
}

export async function setProfiles(profiles: Profile[]): Promise<void> {
  await storage.set("profiles", profiles)
}

export async function getGroups(): Promise<Group[]> {
  return await storage.get<Group[]>("groups") ?? []
}

export async function setGroups(groups: Group[]): Promise<void> {
  await storage.set("groups", groups)
}

export async function getLinks(): Promise<CollectedLink[]> {
  return await storage.get<CollectedLink[]>("collectedLinks") ?? []
}

export async function setLinks(links: CollectedLink[]): Promise<void> {
  await storage.set("collectedLinks", links)
}

export { storage }
