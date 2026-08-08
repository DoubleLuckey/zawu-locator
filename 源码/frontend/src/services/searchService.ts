import type { Item, ItemTag, LocationNode, SearchResult, Tag } from '@/types'
import { buildPath } from './pathService'

export interface SearchContext {
  items: Item[]
  locations: LocationNode[]
  tags: Tag[]
  itemTags: ItemTag[]
}

export function searchItems(keyword: string, ctx: SearchContext): SearchResult[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return []

  const locationById = new Map(ctx.locations.map((l) => [l.id, l]))
  const tagById = new Map(ctx.tags.map((t) => [t.id, t]))
  const tagIdsByItem = new Map<string, string[]>()
  ctx.itemTags.forEach((it) => {
    const arr = tagIdsByItem.get(it.itemId) ?? []
    arr.push(it.tagId)
    tagIdsByItem.set(it.itemId, arr)
  })

  const results: SearchResult[] = []
  for (const item of ctx.items) {
    const tagNames = (tagIdsByItem.get(item.id) ?? [])
      .map((id) => tagById.get(id)?.name ?? '')
      .filter(Boolean)

    const hits: { field: string }[] = []
    const check = (text: string | undefined, field: string) => {
      if (text && text.toLowerCase().includes(kw)) hits.push({ field })
    }
    check(item.name, '名称')
    check(item.aliases, '别名')
    check(item.remark, '备注')
    if (tagNames.some((t) => t.toLowerCase().includes(kw))) hits.push({ field: '标签' })

    let loc = locationById.get(item.locationId)
    let guard = 0
    while (loc && guard < 50) {
      if (loc.name.toLowerCase().includes(kw)) {
        hits.push({ field: '位置' })
        break
      }
      loc = loc.parentId ? locationById.get(loc.parentId) : undefined
      guard++
    }

    if (hits.length) {
      results.push({
        item,
        path: buildPath(item.locationId, ctx.locations).join(' / '),
        matchedField: hits[0].field,
        tagNames
      })
    }
  }

  const rank = (r: SearchResult) => (r.matchedField === '名称' ? 0 : 1)
  return results.sort((a, b) => rank(a) - rank(b))
}
