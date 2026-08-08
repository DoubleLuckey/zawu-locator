import { defineStore } from 'pinia'
import { ref } from 'vue'
import { itemRepo } from '@/db/repositories/itemRepo'
import { tagRepo } from '@/db/repositories/tagRepo'
import type { Item, ItemStatus } from '@/types'
import { uid } from '@/utils/id'
import { markChanged } from '@/services/autoBackupService'

export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([])
  const loaded = ref(false)

  const byLocation = (locationId: string): Item[] =>
    items.value
      .filter((i) => i.locationId === locationId)
      .sort((a, b) => b.updatedAt - a.updatedAt)

  const getById = (id: string): Item | undefined =>
    items.value.find((i) => i.id === id)

  const countByLocation = (locationId: string): number =>
    items.value.filter((i) => i.locationId === locationId).length

  const recent = (limit = 8): Item[] =>
    [...items.value].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit)

  const countByStatus = (status: ItemStatus): number =>
    items.value.filter((i) => i.status === status).length

  async function load(): Promise<void> {
    items.value = await itemRepo.getAll()
    loaded.value = true
  }

  async function add(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await itemRepo.add({ ...data, id: uid() })
    await load()
    markChanged()
    return id
  }

  async function update(id: string, patch: Partial<Item>): Promise<void> {
    await itemRepo.update(id, patch)
    await load()
    markChanged()
  }

  async function move(id: string, locationId: string): Promise<void> {
    await itemRepo.move(id, locationId)
    await load()
    markChanged()
  }

  async function remove(id: string): Promise<void> {
    await itemRepo.remove(id)
    await tagRepo.removeByItem(id)
    await load()
    markChanged()
  }

  async function setTags(itemId: string, tagIds: string[]): Promise<void> {
    await tagRepo.setItemTags(itemId, tagIds)
    markChanged()
  }

  return {
    items,
    loaded,
    byLocation,
    getById,
    countByLocation,
    recent,
    countByStatus,
    load,
    add,
    update,
    move,
    remove,
    setTags
  }
})
