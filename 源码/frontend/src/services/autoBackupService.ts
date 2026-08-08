import { AUTO_BACKUP_DEBOUNCE_MS } from '@/config/oneDrive'
import { backupAutoToOneDrive } from './oneDriveService'

const STORAGE_KEY = 'zawu-auto-backup-at'

let enabled = false
let dirty = false
let uploading = false
let pendingAgain = false
let timer: ReturnType<typeof setTimeout> | null = null
let lastBackupAt: number | null = readLastBackupAt()

function readLastBackupAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const t = Number(raw)
    return Number.isFinite(t) && t > 0 ? t : null
  } catch {
    return null
  }
}

function writeLastBackupAt(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp))
  } catch {
    // localStorage 不可用时忽略，不影响备份本身
  }
}

/** 登录状态变化时调用：登录成功开启自动备份，登出/未登录关闭 */
export function setAutoBackupEnabled(value: boolean): void {
  enabled = value
  if (!enabled) {
    if (timer) clearTimeout(timer)
    timer = null
  } else if (dirty && !timer) {
    timer = setTimeout(() => {
      void run()
    }, AUTO_BACKUP_DEBOUNCE_MS)
  }
}

/** 数据变更后调用（防抖，5 秒内多次变更只上传一次） */
export function markChanged(): void {
  dirty = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void run()
  }, AUTO_BACKUP_DEBOUNCE_MS)
}

/** 是否存在尚未同步到 OneDrive 的改动（供关闭页面提醒使用） */
export function hasPendingChanges(): boolean {
  return dirty || uploading
}

/** 是否应在关闭页面前提醒（仅已登录启用自动备份时） */
export function shouldWarnBeforeUnload(): boolean {
  return enabled && hasPendingChanges()
}

/** 上次自动备份成功时间（毫秒时间戳），从未备份过为 null */
export function getLastAutoBackupTime(): number | null {
  return lastBackupAt
}

async function run(): Promise<void> {
  if (!dirty || !enabled) return
  if (uploading) {
    pendingAgain = true
    return
  }
  uploading = true
  dirty = false
  try {
    await backupAutoToOneDrive()
    lastBackupAt = Date.now()
    writeLastBackupAt(lastBackupAt)
  } catch {
    // 失败保留脏标记，下次数据变更时重试
    dirty = true
  } finally {
    uploading = false
    if (pendingAgain) {
      pendingAgain = false
      markChanged()
    }
  }
}
