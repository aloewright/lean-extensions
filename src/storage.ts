import { Storage } from "@plasmohq/storage"
import type {
  CollectedLink,
  ExtensionPolicy,
  Group,
  Profile,
  Settings,
  StorageSchema
} from "./types"
import { DEFAULT_STORAGE } from "./types"

const storage = new Storage({ area: "local" })

export async function getAll(): Promise<StorageSchema> {
  const profiles = await storage.get<Profile[]>("profiles") ?? DEFAULT_STORAGE.profiles
  const groups = await storage.get<Group[]>("groups") ?? DEFAULT_STORAGE.groups
  const collectedLinks = await storage.get<CollectedLink[]>("collectedLinks") ?? DEFAULT_STORAGE.collectedLinks
  const settings = await storage.get<Settings>("settings") ?? DEFAULT_STORAGE.settings
  const extensionPolicies =
    (await storage.get<ExtensionPolicy[]>("extensionPolicies")) ??
    DEFAULT_STORAGE.extensionPolicies
  const extensionLastUsed =
    (await storage.get<Record<string, string>>("extensionLastUsed")) ??
    DEFAULT_STORAGE.extensionLastUsed
  return {
    profiles,
    groups,
    collectedLinks,
    settings,
    extensionLastUsed,
    extensionPolicies
  }
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

export async function getLastUsed(): Promise<Record<string, string>> {
  return await storage.get<Record<string, string>>("extensionLastUsed") ?? {}
}

export async function setLastUsed(data: Record<string, string>): Promise<void> {
  await storage.set("extensionLastUsed", data)
}

export async function touchExtension(extId: string): Promise<void> {
  const data = await getLastUsed()
  data[extId] = new Date().toISOString()
  await setLastUsed(data)
}

// ─── Per-extension policies (PDX-89) ────────────────────────────────

export async function getPolicies(): Promise<ExtensionPolicy[]> {
  return (await storage.get<ExtensionPolicy[]>("extensionPolicies")) ?? []
}

export async function setPolicies(policies: ExtensionPolicy[]): Promise<void> {
  await storage.set("extensionPolicies", policies)
}

export { storage }
