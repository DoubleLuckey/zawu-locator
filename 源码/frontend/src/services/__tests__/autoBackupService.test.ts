import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  backupAutoToOneDrive: vi.fn()
}))

vi.mock('@/services/oneDriveService', () => ({
  backupAutoToOneDrive: mocks.backupAutoToOneDrive
}))

function createStorageStub(): { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> } {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value))
  }
}

let storage: ReturnType<typeof createStorageStub>

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  storage = createStorageStub()
  vi.stubGlobal('localStorage', storage)
  mocks.backupAutoToOneDrive.mockReset()
  mocks.backupAutoToOneDrive.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('autoBackupService 自动备份调度', () => {
  it('防抖：短时间内多次变更只触发一次上传', async () => {
    const { markChanged, setAutoBackupEnabled, hasPendingChanges } = await import('../autoBackupService')
    setAutoBackupEnabled(true)

    markChanged()
    vi.advanceTimersByTime(2000)
    markChanged()
    vi.advanceTimersByTime(2000)
    markChanged()
    await vi.advanceTimersByTimeAsync(5000)

    expect(mocks.backupAutoToOneDrive).toHaveBeenCalledTimes(1)
    expect(hasPendingChanges()).toBe(false)
  })

  it('未启用（未登录）时不自动上传', async () => {
    const { markChanged, shouldWarnBeforeUnload } = await import('../autoBackupService')

    markChanged()
    await vi.advanceTimersByTimeAsync(5000)

    expect(mocks.backupAutoToOneDrive).not.toHaveBeenCalled()
    expect(shouldWarnBeforeUnload()).toBe(false)
  })

  it('上传成功后记录上次备份时间', async () => {
    const { markChanged, setAutoBackupEnabled, getLastAutoBackupTime } = await import(
      '../autoBackupService'
    )
    setAutoBackupEnabled(true)

    markChanged()
    await vi.advanceTimersByTimeAsync(5000)

    expect(getLastAutoBackupTime()).not.toBeNull()
    expect(storage.setItem).toHaveBeenCalledWith('zawu-auto-backup-at', expect.any(String))
  })

  it('上传失败后保持脏状态，下次变更会重试', async () => {
    const { markChanged, setAutoBackupEnabled, hasPendingChanges } = await import(
      '../autoBackupService'
    )
    setAutoBackupEnabled(true)
    mocks.backupAutoToOneDrive.mockRejectedValueOnce(new Error('network'))

    markChanged()
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.backupAutoToOneDrive).toHaveBeenCalledTimes(1)
    expect(hasPendingChanges()).toBe(true)

    mocks.backupAutoToOneDrive.mockResolvedValueOnce(undefined)
    markChanged()
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.backupAutoToOneDrive).toHaveBeenCalledTimes(2)
    expect(hasPendingChanges()).toBe(false)
  })

  it('关闭提醒仅在已启用且有未同步改动时生效', async () => {
    const { markChanged, setAutoBackupEnabled, shouldWarnBeforeUnload } = await import(
      '../autoBackupService'
    )

    expect(shouldWarnBeforeUnload()).toBe(false)
    setAutoBackupEnabled(true)
    markChanged()
    expect(shouldWarnBeforeUnload()).toBe(true)

    await vi.advanceTimersByTimeAsync(5000)
    expect(shouldWarnBeforeUnload()).toBe(false)
  })

  it('禁用后清空待执行的备份定时器', async () => {
    const { markChanged, setAutoBackupEnabled } = await import('../autoBackupService')
    setAutoBackupEnabled(true)
    markChanged()
    setAutoBackupEnabled(false)

    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.backupAutoToOneDrive).not.toHaveBeenCalled()
  })
})
