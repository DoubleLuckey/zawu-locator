import { db } from '@/db'

export const CLEARED_MARKER_KEY = 'zawu-data-cleared'

const LOCAL_KEYS = ['zawu-seed-version', 'zawu-intro-seen', 'zawu-auto-backup-at']

/** 清空本机全部数据（位置/物品/标签/搜索历史），并打上「已清空」标记避免自动恢复演示数据 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    db.locations,
    db.items,
    db.tags,
    db.itemTags,
    db.searchLogs,
    async () => {
      await Promise.all([
        db.locations.clear(),
        db.items.clear(),
        db.tags.clear(),
        db.itemTags.clear(),
        db.searchLogs.clear()
      ])
    }
  )
  try {
    LOCAL_KEYS.forEach((key) => localStorage.removeItem(key))
    localStorage.setItem(CLEARED_MARKER_KEY, '1')
  } catch {
    // localStorage 不可用时忽略；数据库已清空即达成主要目的
  }
}
