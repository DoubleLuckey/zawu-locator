import { db } from '@/db'
import { download } from '@/utils/export'
import { blobToDataUrl, dataUrlToBlob } from './imageService'
import type { Item } from '@/types'
import { buildPath } from './pathService'
import { validateBackupPayload } from './oneDriveHelpers'

export interface BackupPayload {
  version: number
  exportedAt: number
  locations: unknown[]
  items: unknown[]
  tags: unknown[]
  itemTags: unknown[]
  searchLogs: unknown[]
}

/** 从本地数据库读取全部数据并转换为备份文件内容（照片转 base64） */
export async function buildBackupPayload(): Promise<BackupPayload> {
  const [locations, items, tags, itemTags, searchLogs] = await Promise.all([
    db.locations.toArray(),
    db.items.toArray(),
    db.tags.toArray(),
    db.itemTags.toArray(),
    db.searchLogs.toArray()
  ])

  const itemsOut = await Promise.all(
    items.map(async (item) => ({
      ...item,
      photoBlob: undefined,
      photoBase64: item.photoBlob ? await blobToDataUrl(item.photoBlob) : null
    }))
  )

  return {
    version: 1,
    exportedAt: Date.now(),
    locations,
    items: itemsOut,
    tags,
    itemTags,
    searchLogs
  }
}

export async function exportJson(): Promise<void> {
  const payload = await buildBackupPayload()
  download('杂物定位备份.json', JSON.stringify(payload, null, 2), 'application/json')
}

/** 解析并导入备份 JSON 文本（本地文件与 OneDrive 恢复共用） */
export async function importJsonText(text: string): Promise<{ ok: boolean; message: string }> {
  try {
    const data: unknown = JSON.parse(text)
    const validation = validateBackupPayload(data)
    if (!validation.ok) return validation
    const payload = data as BackupPayload

    const items: Item[] = (payload.items as Array<Record<string, unknown>>).map((raw) => {
      const { photoBase64, ...rest } = raw
      return {
        ...(rest as unknown as Item),
        photoBlob: typeof photoBase64 === 'string' ? dataUrlToBlob(photoBase64) : null
      }
    })

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
        if (payload.locations?.length) await db.locations.bulkPut(payload.locations as never[])
        if (items.length) await db.items.bulkPut(items)
        if (payload.tags?.length) await db.tags.bulkPut(payload.tags as never[])
        if (payload.itemTags?.length) await db.itemTags.bulkPut(payload.itemTags as never[])
      }
    )
    return validation
  } catch {
    return { ok: false, message: '导入失败，请检查文件内容' }
  }
}

export async function importJson(file: File): Promise<{ ok: boolean; message: string }> {
  return importJsonText(await file.text())
}

export async function exportCsv(): Promise<void> {
  const [locations, items, tags, itemTags] = await Promise.all([
    db.locations.toArray(),
    db.items.toArray(),
    db.tags.toArray(),
    db.itemTags.toArray()
  ])
  const tagById = new Map(tags.map((t) => [t.id, t.name]))
  const tagNamesByItem = new Map<string, string[]>()
  itemTags.forEach((it) => {
    const arr = tagNamesByItem.get(it.itemId) ?? []
    if (tagById.get(it.tagId)) arr.push(tagById.get(it.tagId)!)
    tagNamesByItem.set(it.itemId, arr)
  })

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['物品名称,别名,数量,单位,位置路径,标签,状态,借出人,备注']
  items.forEach((item) => {
    const path = buildPath(item.locationId, locations).join(' / ')
    lines.push(
      [
        item.name,
        item.aliases ?? '',
        item.quantity,
        item.unit ?? '',
        path,
        (tagNamesByItem.get(item.id) ?? []).join('、'),
        item.status,
        item.borrower ?? '',
        item.remark ?? ''
      ]
        .map(esc)
        .join(',')
    )
  })

  download('杂物定位物品清单.csv', '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8')
}
