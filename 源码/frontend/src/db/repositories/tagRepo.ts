import { db } from '@/db'
import type { ItemTag, Tag } from '@/types'

export const tagRepo = {
  async getAll(): Promise<Tag[]> {
    return db.tags.toArray()
  },

  async getAllItemTags(): Promise<ItemTag[]> {
    return db.itemTags.toArray()
  },

  async add(data: Omit<Tag, 'createdAt'>): Promise<string> {
    const tag: Tag = { ...data, createdAt: Date.now() }
    await db.tags.add(tag)
    return tag.id
  },

  async update(id: string, patch: Partial<Tag>): Promise<void> {
    await db.tags.update(id, patch)
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.tags, db.itemTags, async () => {
      await db.itemTags.where('tagId').equals(id).delete()
      await db.tags.delete(id)
    })
  },

  async getItemTags(itemId: string): Promise<string[]> {
    const rows = await db.itemTags.where('itemId').equals(itemId).toArray()
    return rows.map((r) => r.tagId)
  },

  async setItemTags(itemId: string, tagIds: string[]): Promise<void> {
    await db.transaction('rw', db.itemTags, async () => {
      await db.itemTags.where('itemId').equals(itemId).delete()
      const rows: ItemTag[] = tagIds.map((tagId) => ({ itemId, tagId }))
      if (rows.length) await db.itemTags.bulkAdd(rows)
    })
  },

  async getItemIdsByTag(tagId: string): Promise<string[]> {
    const rows = await db.itemTags.where('tagId').equals(tagId).toArray()
    return rows.map((r) => r.itemId)
  },

  async removeByItem(itemId: string): Promise<void> {
    await db.itemTags.where('itemId').equals(itemId).delete()
  }
}
