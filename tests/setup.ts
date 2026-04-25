import { beforeEach, vi } from "vitest"

// Shared in-memory backing store for the mocked Storage class.
// Exported so tests can inspect/clear it directly if needed.
export const __mockStore = new Map<string, unknown>()

vi.mock("@plasmohq/storage", () => {
  class Storage {
    // The constructor accepts the same options shape as the real lib but
    // ignores them — every instance shares the same in-memory map.
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
