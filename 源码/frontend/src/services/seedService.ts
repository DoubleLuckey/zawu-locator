import { db } from '@/db'
import { userRootNodes, type SeedNode } from '@/data/userData'
import type { Item, ItemTag, LocationNode, Tag, TagColor } from '@/types'
import { uid } from '@/utils/id'
import { CLEARED_MARKER_KEY } from './resetService'

const SEED_VERSION = 'user-data-2'

async function seedAll(): Promise<void> {
  const now = Date.now()
  const locations: LocationNode[] = []
  const items: Item[] = []
  const itemTags: ItemTag[] = []
  let sortCounter = 0

  const walk = (node: SeedNode, parentId: string | null): void => {
    // 叶子节点作为物品，挂在最近的父位置下；根节点即使无子节点也作为位置
    if (node.children.length === 0 && parentId) {
      const itemId = uid()
      items.push({
        id: itemId,
        locationId: parentId,
        name: node.name,
        quantity: node.quantity ?? 1,
        unit: node.unit,
        remark: node.remark,
        status: 'IN_STOCK',
        photoBlob: null,
        createdAt: now,
        updatedAt: now
      })
      node.tags?.forEach((tagName) => {
        const tag = defaultTags.find((t) => t.name === tagName)
        if (tag) itemTags.push({ itemId, tagId: tag.id })
      })
      return
    }
    const id = uid()
    sortCounter++
    locations.push({
      id,
      parentId,
      name: node.name,
      type: node.type,
      icon: node.icon,
      sortOrder: sortCounter,
      createdAt: now,
      updatedAt: now
    })
    node.children.forEach((child) => walk(child, id))
  }

  const defaultTags: Tag[] = (
    [
      ['常用', 'GREEN'],
      ['重要', 'RED'],
      ['备用', 'BLUE'],
      ['工具', 'ORANGE']
    ] as Array<[string, TagColor]>
  ).map(([name, color]) => ({
    id: uid(),
    name,
    color,
    createdAt: now
  }))

  userRootNodes.forEach((node) => walk(node, null))

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
      if (locations.length) await db.locations.bulkAdd(locations)
      if (items.length) await db.items.bulkAdd(items)
      if (defaultTags.length) await db.tags.bulkAdd(defaultTags)
      if (itemTags.length) await db.itemTags.bulkAdd(itemTags)
    }
  )
}

export async function seedIfEmpty(): Promise<void> {
  const cleared = localStorage.getItem(CLEARED_MARKER_KEY) === '1'
  const count = await db.locations.count()
  if (count === 0 && !cleared) {
    await seedAll()
    localStorage.setItem('zawu-seed-version', SEED_VERSION)
    return
  }
  const marker = localStorage.getItem('zawu-seed-version')
  if (marker === SEED_VERSION) return
  // 版本升级：仅当库里仍是旧版演示数据（示例房间）时才重置，避免清掉真实导入的数据
  const oldDemoCount = await db.locations.where('name').equals('示例房间').count()
  if (oldDemoCount > 0) await seedAll()
  localStorage.setItem('zawu-seed-version', SEED_VERSION)
}
