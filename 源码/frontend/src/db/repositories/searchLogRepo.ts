import { db, type SearchLog } from '@/db'

export const searchLogRepo = {
  async add(keyword: string, hitCount: number): Promise<void> {
    await db.searchLogs.add({ keyword, searchedAt: Date.now(), hitCount })
  },

  async getRecent(limit = 8): Promise<SearchLog[]> {
    return db.searchLogs.orderBy('searchedAt').reverse().limit(limit).toArray()
  },

  async clear(): Promise<void> {
    await db.searchLogs.clear()
  }
}
