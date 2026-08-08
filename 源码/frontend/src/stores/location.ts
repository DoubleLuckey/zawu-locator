import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { locationRepo } from '@/db/repositories/locationRepo'
import type { LocationNode } from '@/types'
import { uid } from '@/utils/id'
import { markChanged } from '@/services/autoBackupService'

export const useLocationStore = defineStore('location', () => {
  const locations = ref<LocationNode[]>([])
  const loaded = ref(false)

  const rootLocations = computed(() =>
    locations.value
      .filter((l) => !l.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const childrenOf = (parentId: string | null): LocationNode[] =>
    locations.value
      .filter((l) => l.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  const getById = (id: string): LocationNode | undefined =>
    locations.value.find((l) => l.id === id)

  const getDescendantIds = (id: string): string[] => {
    const out: string[] = []
    const collect = (pid: string): void => {
      locations.value
        .filter((l) => l.parentId === pid)
        .forEach((l) => {
          out.push(l.id)
          collect(l.id)
        })
    }
    collect(id)
    return out
  }

  async function load(): Promise<void> {
    locations.value = await locationRepo.getAll()
    loaded.value = true
  }

  async function add(data: {
    parentId: string | null
    name: string
    type: LocationNode['type']
    icon?: LocationNode['icon']
    description?: string
    sortOrder?: number
  }): Promise<string> {
    const id = await locationRepo.add({
      id: uid(),
      parentId: data.parentId,
      name: data.name.trim(),
      type: data.type,
      icon: data.icon,
      description: data.description,
      sortOrder: data.sortOrder ?? childrenOf(data.parentId).length + 1
    })
    await load()
    markChanged()
    return id
  }

  async function update(id: string, patch: Partial<LocationNode>): Promise<void> {
    await locationRepo.update(id, patch)
    await load()
    markChanged()
  }

  async function move(id: string, newParentId: string | null): Promise<void> {
    await locationRepo.update(id, { parentId: newParentId })
    await load()
    markChanged()
  }

  async function swapSort(idA: string, idB: string): Promise<void> {
    const a = locations.value.find((l) => l.id === idA)
    const b = locations.value.find((l) => l.id === idB)
    if (!a || !b) return
    await locationRepo.update(a.id, { sortOrder: b.sortOrder })
    await locationRepo.update(b.id, { sortOrder: a.sortOrder })
    await load()
    markChanged()
  }

  async function remove(id: string): Promise<void> {
    await locationRepo.remove(id)
    await load()
    markChanged()
  }

  return {
    locations,
    loaded,
    rootLocations,
    childrenOf,
    getById,
    getDescendantIds,
    load,
    add,
    update,
    move,
    swapSort,
    remove
  }
})
