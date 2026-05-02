export interface ExtensionInfo {
  id: string
  name: string
  description: string
  version: string
  enabled: boolean
  icons?: chrome.management.IconInfo[]
  installType: string
  homepageUrl?: string
  mayDisable: boolean
  type: string
}

export interface Profile {
  id: string
  name: string
  extensionIds: string[]
}

export interface Group {
  id: string
  name: string
  extensionIds: string[]
  enabled: boolean
}

export interface CollectedLink {
  id: string
  url: string
  title: string
  tags: string[]
  date: string
  favicon?: string
}

export interface Settings {
  notebookMode: "append" | "new"
  lastNotebookUrl?: string
  alwaysEnabled: string[]
  activeProfileId?: string
  leanMode?: boolean
  autoOffloadDays?: number
  autoDeleteDays?: number
}

// ─── Per-extension policy rules (PDX-89) ────────────────────────────
//
// A policy attaches to a specific extension and tells the background
// service worker whether the extension should be allowed to be enabled
// in the current browser context. Conditions are intentionally small
// and declarative so the evaluator stays a pure function over a
// snapshot of the world (active tab url + currently open tab urls).

export type PolicyCondition =
  | {
      // Match against the hostname of the active tab. The pattern is a
      // simple glob supporting `*` for any-label / any-chars. Examples:
      //   "*.bank.com"  matches  "chase.bank.com" and "www.bank.com"
      //   "bank.com"    matches  exactly "bank.com"
      kind: "hostname-match"
      pattern: string
    }
  | {
      // Match against the urls of any open tab in any window. The
      // pattern is a Chrome-style url match: `<scheme>://<host>/<path>`
      // with `*` allowed in scheme, host, and path. Example:
      //   "*://*.notebooklm.google.com/*"
      kind: "tab-open"
      urlPattern: string
    }

// `disable` turns the extension off when the condition matches.
// `enable-only` flips the meaning: the extension is allowed ONLY while
// the condition matches; otherwise it is disabled. Useful for
// "only run while a NotebookLM tab is open".
export type PolicyAction = "disable" | "enable-only"

export interface ExtensionPolicy {
  id: string
  extensionId: string
  condition: PolicyCondition
  action: PolicyAction
}

export interface StorageSchema {
  profiles: Profile[]
  groups: Group[]
  collectedLinks: CollectedLink[]
  settings: Settings
  extensionLastUsed: Record<string, string>
  extensionPolicies: ExtensionPolicy[]
}

export const DEFAULT_STORAGE: StorageSchema = {
  profiles: [],
  groups: [],
  collectedLinks: [],
  settings: {
    notebookMode: "append",
    alwaysEnabled: []
  },
  extensionLastUsed: {},
  extensionPolicies: []
}
