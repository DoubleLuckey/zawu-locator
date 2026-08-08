import { db } from '@/db'
import type { LocationNode } from '@/types'

export const locationRepo = {
  async getAll(): Promise<LocationNode[]> {
    return db.locations.orderBy('sortOrder').toArray()
  },

  async getById(id: string): Promise<LocationNode | undefined> {
    return db.locations.get(id)
  },

  async getChildren(parentId: string | null): Promise<LocationNode[]> {
    return db.locations.where('parentId').equals(parentId ?? '').sortBy('sortOrder')
  },

  async add(data: Omit<LocationNode, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now()
    const node: LocationNode = { ...data, createdAt: now, updatedAt: now }
    await db.locations.add(node)
    return node.id
  },

  async update(id: string, patch: Partial<LocationNode>): Promise<void> {
    await db.locations.update(id, { ...patch, updatedAt: Date.now() })
  },

  async remove(id: string): Promise<void> {
    await db.locations.delete(id)
  },

  async countChildren(id: string): Promise<number> {
    return db.locations.where('parentId').equals(id).count()
  }
}
