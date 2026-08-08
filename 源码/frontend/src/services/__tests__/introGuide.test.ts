import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIntroState, markIntroSeen } from '../introGuide'

const STORAGE_KEY = 'zawu-intro-seen'

function fakeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    })
  } as Storage
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('introGuide', () => {
  it('未看过时返回 new', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    expect(getIntroState()).toBe('new')
  })

  it('标记看过后再读取返回 seen', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    markIntroSeen()
    expect(getIntroState()).toBe('seen')
    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  it('localStorage 读取异常时返回 unavailable 且不抛错', () => {
    const storage = fakeStorage()
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.stubGlobal('localStorage', storage)
    expect(getIntroState()).toBe('unavailable')
  })

  it('localStorage 写入异常时 markIntroSeen 不抛错', () => {
    const storage = fakeStorage()
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.stubGlobal('localStorage', storage)
    expect(() => markIntroSeen()).not.toThrow()
  })
})
