import { beforeEach, vi } from "vitest"

// Shared in-memory backing store for the mocked Storage class.
// Exported so tests can inspect/clear it directly if needed.
export const __mockStore = new Map<string, unknown>()

// ---------------------------------------------------------------------------
// Global chrome API mock
// Required for modules that call chrome.* at the top level (background.ts,
// auto-login.ts) so they can be imported in the happy-dom test environment.
// ---------------------------------------------------------------------------
const noop = vi.fn()
const addListener = () => ({ addListener: noop, removeListener: noop })

globalThis.chrome = {
  management: {
    getAll: vi.fn().mockResolvedValue([]),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    uninstall: vi.fn().mockResolvedValue(undefined),
    onEnabled: addListener(),
    onDisabled: addListener(),
    onInstalled: addListener(),
    onUninstalled: addListener(),
  },
  action: {
    setBadgeText: noop,
    setBadgeBackgroundColor: noop,
    setBadgeTextColor: noop,
  },
  runtime: {
    id: "test-extension-id",
    onInstalled: addListener(),
    onMessage: addListener(),
    sendMessage: noop,
    lastError: null,
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
  contextMenus: {
    create: noop,
    onClicked: addListener(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  alarms: {
    create: noop,
    onAlarm: addListener(),
  },
  commands: {
    onCommand: addListener(),
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    sendMessage: noop,
    onUpdated: addListener(),
    captureVisibleTab: vi.fn(),
  },
  downloads: {
    download: noop,
  },
  debugger: {
    attach: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue({ data: "" }),
    detach: vi.fn().mockResolvedValue(undefined),
  },
} as unknown as typeof chrome

vi.mock("@plasmohq/storage", () => {
  class Storage {
    // The constructor accepts the same options shape as the real lib but

    constructor(_opts?: unknown) {}

    async get<T = unknown>(key: string): Promise<T | undefined> {
      return __mockStore.get(key) as T | undefined
    }

    async set(key: string, value: unknown): Promise<void> {
      __mockStore.set(key, value)
    }

    async remove(key: string): Promise<void> {
      __mockStore.delete(key)
    }
  }

  return { Storage }
})

beforeEach(() => {
  __mockStore.clear()
})
