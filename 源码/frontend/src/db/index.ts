import Dexie, { type Table } from 'dexie'
import type { Item, ItemTag, LocationNode, Tag } from '@/types'

export interface SearchLog {
  id?: number
  keyword: string
  searchedAt: number
  hitCount: number
}

export class ZawuDB extends Dexie {
  locations!: Table<LocationNode, string>
  items!: Table<Item, string>
  tags!: Table<Tag, string>
  itemTags!: Table<ItemTag, [string, string]>
  searchLogs!: Table<SearchLog, number>

  constructor() {
    super('zawu-locator')
    this.version(1).stores({
      locations: 'id, parentId, sortOrder, updatedAt',
      items: 'id, locationId, status, updatedAt, name',
      tags: 'id, name',
      itemTags: '[itemId+tagId], itemId, tagId',
      searchLogs: '++id, keyword, searchedAt'
    })
  }
}

export const db = new ZawuDB()
