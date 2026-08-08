import { defineStore } from 'pinia'
import { ref } from 'vue'
import { searchLogRepo } from '@/db/repositories/searchLogRepo'
import { itemRepo } from '@/db/repositories/itemRepo'
import { tagRepo } from '@/db/repositories/tagRepo'
import { searchItems } from '@/services/searchService'
import { useItemStore } from './item'
import { useLocationStore } from './location'
import { useTagStore } from './tag'
import type { Item, SearchResult } from '@/types'

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const results = ref<SearchResult[]>([])
  const history = ref<string[]>([])
  const recentItems = ref<Item[]>([])

  async function loadHistory(): Promise<void> {
    const logs = await searchLogRepo.getRecent(8)
    history.value = [...new Set(logs.map((l) => l.keyword))]
  }

  async function run(kw: string): Promise<void> {
    keyword.value = kw
    const itemStore = useItemStore()
    const locationStore = useLocationStore()
    const tagStore = useTagStore()
    const ctx = {
      items: itemStore.items,
      locations: locationStore.locations,
      tags: tagStore.tags,
      itemTags: await tagRepo.getAllItemTags()
    }
    results.value = searchItems(kw, ctx)
    if (kw.trim()) {
      await searchLogRepo.add(kw.trim(), results.value.length)
      await loadHistory()
    }
  }

  async function loadRecent(): Promise<void> {
    recentItems.value = await itemRepo.getRecent(8)
  }

  async function clearHistory(): Promise<void> {
    await searchLogRepo.clear()
    history.value = []
  }

  return { keyword, results, history, recentItems, loadHistory, run, loadRecent, clearHistory }
})
