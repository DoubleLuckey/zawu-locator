import { db } from '@/db'
import type { Item } from '@/types'

export const itemRepo = {
  async getAll(): Promise<Item[]> {
    return db.items.toArray()
  },

  async getById(id: string): Promise<Item | undefined> {
    return db.items.get(id)
  },

  async getByLocation(locationId: string): Promise<Item[]> {
    return db.items.where('locationId').equals(locationId).reverse().sortBy('updatedAt')
  },

  async getRecent(limit = 20): Promise<Item[]> {
    return db.items.orderBy('updatedAt').reverse().limit(limit).toArray()
  },

  async countByLocation(locationId: string): Promise<number> {
    return db.items.where('locationId').equals(locationId).count()
  },

  async add(data: Omit<Item, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now()
    const item: Item = { ...data, createdAt: now, updatedAt: now }
    await db.items.add(item)
    return item.id
  },

  async update(id: string, patch: Partial<Item>): Promise<void> {
    await db.items.update(id, { ...patch, updatedAt: Date.now() })
  },

  async move(id: string, locationId: string): Promise<void> {
    await db.items.update(id, { locationId, updatedAt: Date.now() })
  },

  async remove(id: string): Promise<void> {
    await db.items.delete(id)
  }
}
