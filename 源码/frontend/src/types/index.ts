export type LocationType =
  | 'ROOM'
  | 'CABINET'
  | 'DRAWER'
  | 'SHELF'
  | 'BOX'
  | 'BAG'
  | 'BIN'
  | 'OTHER'

export type ItemStatus = 'IN_STOCK' | 'BORROWED' | 'DISCARDED'

export type SpaceIcon =
  | 'HOME'
  | 'BEDROOM'
  | 'KITCHEN'
  | 'BATHROOM'
  | 'STUDY'
  | 'STORAGE'
  | 'OTHER'

export type TagColor =
  | 'RED'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'BLUE'
  | 'PURPLE'
  | 'GRAY'

export interface LocationNode {
  id: string
  parentId: string | null
  name: string
  type: LocationType
  icon?: SpaceIcon
  sortOrder: number
  description?: string
  createdAt: number
  updatedAt: number
}

export interface Item {
  id: string
  locationId: string
  name: string
  aliases?: string
  quantity: number
  unit?: string
  photoBlob?: Blob | null
  status: ItemStatus
  borrower?: string
  borrowedAt?: number
  dueBackAt?: number
  remark?: string
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string
  color: TagColor
  createdAt: number
}

export interface ItemTag {
  itemId: string
  tagId: string
}

export interface SearchResult {
  item: Item
  path: string
  matchedField: string
  tagNames: string[]
}
