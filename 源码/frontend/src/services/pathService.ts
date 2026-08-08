import type { LocationNode } from '@/types'

export function buildPath(locationId: string, locations: LocationNode[]): string[] {
  const byId = new Map(locations.map((l) => [l.id, l]))
  const names: string[] = []
  let cur = byId.get(locationId)
  let guard = 0
  while (cur && guard < 50) {
    names.unshift(cur.name)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
    guard++
  }
  return names
}

export function buildPathText(locationId: string, locations: LocationNode[]): string {
  return buildPath(locationId, locations).join(' / ')
}
