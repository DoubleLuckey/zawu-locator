import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tagRepo } from '@/db/repositories/tagRepo'
import type { Tag, TagColor } from '@/types'
import { uid } from '@/utils/id'
import { markChanged } from '@/services/autoBackupService'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])
  const itemTagMap = ref<Record<string, string[]>>({})
  const tagItemMap = ref<Record<string, string[]>>({})
  const loaded = ref(false)

  const getById = (id: string): Tag | undefined => tags.value.find((t) => t.id === id)

  async function load(): Promise<void> {
    tags.value = await tagRepo.getAll()
    await refreshItemTags()
    loaded.value = true
  }

  async function refreshItemTags(): Promise<void> {
    const rows = await tagRepo.getAllItemTags()
    const itemMap: Record<string, string[]> = {}
    const tagMap: Record<string, string[]> = {}
    rows.forEach((it) => {
      if (!itemMap[it.itemId]) itemMap[it.itemId] = []
      itemMap[it.itemId].push(it.tagId)
      if (!tagMap[it.tagId]) tagMap[it.tagId] = []
      tagMap[it.tagId].push(it.itemId)
    })
    itemTagMap.value = itemMap
    tagItemMap.value = tagMap
  }

  async function add(name: string, color: TagColor): Promise<string> {
    const exists = tags.value.some((t) => t.name === name.trim())
    if (exists) throw new Error('标签名称已存在')
    const id = await tagRepo.add({ id: uid(), name: name.trim(), color })
    await load()
    markChanged()
    return id
  }

  async function update(id: string, patch: Partial<Tag>): Promise<void> {
    await tagRepo.update(id, patch)
    await load()
    markChanged()
  }

  async function remove(id: string): Promise<void> {
    await tagRepo.remove(id)
    await refreshItemTags()
    await load()
    markChanged()
  }

  async function setItemTags(itemId: string, tagIds: string[]): Promise<void> {
    await tagRepo.setItemTags(itemId, tagIds)
    await refreshItemTags()
    markChanged()
  }

  async function getItemIdsByTag(tagId: string): Promise<string[]> {
    return tagRepo.getItemIdsByTag(tagId)
  }

  return {
    tags,
    loaded,
    itemTagMap,
    tagItemMap,
    getById,
    load,
    add,
    update,
    remove,
    setItemTags,
    getItemIdsByTag
  }
})
