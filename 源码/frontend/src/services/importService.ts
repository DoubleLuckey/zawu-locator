import { db } from '@/db'
import type { Item, ItemTag, LocationNode, LocationType, Tag } from '@/types'
import { uid } from '@/utils/id'
import { download } from '@/utils/export'
import { markChanged } from './autoBackupService'
import { parseImportFile, type ImportRow, type ImportRowIssue } from './importParser'

export interface ImportContext {
  locations: LocationNode[]
  items: Item[]
  tags: Tag[]
  itemTags: ItemTag[]
}

export interface ImportPlan {
  newLocations: LocationNode[]
  newTags: Tag[]
  items: Array<{ existing: Item | null; next: Item }>
  itemTags: Array<{ itemId: string; tagIds: string[] }>
}

export interface PlanResult {
  plan: ImportPlan
  issues: ImportRowIssue[]
}

export interface ImportResult {
  added: number
  updated: number
  issues: ImportRowIssue[]
}

/** 按名称关键词推断位置类型（顺序敏感：收纳优先于盒/箱） */
function inferLocationType(name: string): LocationType {
  const n = name.toLowerCase()
  if (/抽屉/.test(n)) return 'DRAWER'
  if (/柜/.test(n)) return 'CABINET'
  if (/收纳/.test(n)) return 'BIN'
  if (/盒|箱/.test(n)) return 'BOX'
  if (/包|袋/.test(n)) return 'BAG'
  if (/层|架/.test(n)) return 'SHELF'
  if (/房|间|厅|区/.test(n)) return 'ROOM'
  return 'OTHER'
}

const childKey = (parentId: string | null, name: string): string =>
  `${parentId ?? ''}\u0000${name.toLowerCase()}`

/** 纯函数：把合法行与现有数据合并，产出待写入计划与跳过原因 */
export function planImport(rows: ImportRow[], ctx: ImportContext): PlanResult {
  const now = Date.now()
  const childrenByName = new Map<string, LocationNode>()
  ctx.locations.forEach((l) => {
    const key = childKey(l.parentId, l.name)
    if (!childrenByName.has(key)) childrenByName.set(key, l)
  })
  const itemsByLocationName = new Map<string, Item>()
  ctx.items.forEach((item) => {
    const key = `${item.locationId}\u0000${item.name.toLowerCase()}`
    if (!itemsByLocationName.has(key)) itemsByLocationName.set(key, item)
  })
  const tagsByName = new Map<string, Tag>()
  ctx.tags.forEach((t) => {
    const key = t.name.toLowerCase()
    if (!tagsByName.has(key)) tagsByName.set(key, t)
  })

  const nextSortOrder = new Map<string, number>()
  const sortOf = (parentId: string | null): number => {
    const key = parentId ?? ''
    if (!nextSortOrder.has(key)) {
      const max = Math.max(0, ...ctx.locations.filter((l) => l.parentId === parentId).map((l) => l.sortOrder))
      nextSortOrder.set(key, max + 1)
    }
    const order = nextSortOrder.get(key)!
    nextSortOrder.set(key, order + 1)
    return order
  }

  const plan: ImportPlan = { newLocations: [], newTags: [], items: [], itemTags: [] }
  const issues: ImportRowIssue[] = []
  const seenItemKeys = new Set<string>()

  for (const row of rows) {
    const fileKey = `${row.locationPath.join('/').toLowerCase()}\u0000${row.name.toLowerCase()}`
    if (seenItemKeys.has(fileKey)) {
      issues.push({ rowNumber: row.rowNumber, reason: '文件内重复行，仅第一行生效' })
      continue
    }
    seenItemKeys.add(fileKey)

    let parentId: string | null = null
    for (const segment of row.locationPath) {
      const key = childKey(parentId, segment)
      let node = childrenByName.get(key)
      if (!node) {
        node = {
          id: uid(),
          parentId,
          name: segment,
          type: inferLocationType(segment),
          sortOrder: sortOf(parentId),
          createdAt: now,
          updatedAt: now
        }
        plan.newLocations.push(node)
        childrenByName.set(key, node)
      }
      parentId = node.id
    }

    // 解析阶段已保证 locationPath 非空，此处 parentId 必为末级位置 id
    const locationId = parentId as string
    const itemKey = `${locationId}\u0000${row.name.toLowerCase()}`
    const existing = itemsByLocationName.get(itemKey)
    let next: Item
    if (existing) {
      next = {
        ...existing,
        aliases: row.aliases,
        quantity: row.quantity,
        unit: row.unit,
        status: row.status,
        borrower: row.status === 'BORROWED' ? row.borrower : undefined,
        borrowedAt:
          row.status === 'BORROWED'
            ? existing.status === 'BORROWED' && existing.borrowedAt
              ? existing.borrowedAt
              : now
            : undefined,
        remark: row.remark,
        updatedAt: now
      }
    } else {
      next = {
        id: uid(),
        locationId,
        name: row.name,
        aliases: row.aliases,
        quantity: row.quantity,
        unit: row.unit,
        photoBlob: null,
        status: row.status,
        borrower: row.status === 'BORROWED' ? row.borrower : undefined,
        borrowedAt: row.status === 'BORROWED' ? now : undefined,
        remark: row.remark,
        createdAt: now,
        updatedAt: now
      }
      itemsByLocationName.set(itemKey, next)
    }
    plan.items.push({ existing: existing ?? null, next })

    const tagIds: string[] = []
    for (const tagName of row.tags) {
      const key = tagName.toLowerCase()
      let tag = tagsByName.get(key)
      if (!tag) {
        tag = { id: uid(), name: tagName, color: 'GRAY', createdAt: now }
        plan.newTags.push(tag)
        tagsByName.set(key, tag)
      }
      tagIds.push(tag.id)
    }
    plan.itemTags.push({ itemId: next.id, tagIds })
  }

  return { plan, issues }
}

/** 在单个事务中应用导入计划，任一步失败整体回滚 */
export async function applyImport(plan: ImportPlan): Promise<void> {
  await db.transaction('rw', db.locations, db.items, db.tags, db.itemTags, async () => {
    if (plan.newLocations.length) await db.locations.bulkPut(plan.newLocations)
    if (plan.newTags.length) await db.tags.bulkPut(plan.newTags)
    if (plan.items.length) await db.items.bulkPut(plan.items.map((p) => p.next))
    for (const rel of plan.itemTags) {
      await db.itemTags.where('itemId').equals(rel.itemId).delete()
      if (rel.tagIds.length) {
        await db.itemTags.bulkAdd(rel.tagIds.map((tagId) => ({ itemId: rel.itemId, tagId })))
      }
    }
  })
}

/** 导入入口：解析 → 合并规划 → 事务应用 → 返回结果汇总 */
export async function importFromFile(file: File): Promise<ImportResult> {
  const parsed = await parseImportFile(file)
  if (!parsed.rows.length) return { added: 0, updated: 0, issues: parsed.issues }

  const ctx: ImportContext = {
    locations: await db.locations.toArray(),
    items: await db.items.toArray(),
    tags: await db.tags.toArray(),
    itemTags: await db.itemTags.toArray()
  }
  const { plan, issues } = planImport(parsed.rows, ctx)
  const allIssues = [...parsed.issues, ...issues]
  const added = plan.items.filter((p) => !p.existing).length
  const updated = plan.items.filter((p) => p.existing).length

  if (plan.items.length || plan.newLocations.length || plan.newTags.length) {
    await applyImport(plan)
    await markChanged()
  }
  return { added, updated, issues: allIssues }
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** 生成导入模板文本：表头 + 说明行 + 3 行示例（# 开头的行导入时自动跳过） */
export function buildImportTemplateCsv(): string {
  const header = ['物品名称', '别名', '数量', '单位', '位置路径', '标签', '状态', '借出人', '备注']
  const notes = [
    '# 填写说明（以 # 开头的行不会被导入，可保留或删除）：',
    '# 状态列可选值：在库（默认，留空按在库）/ 借出（必须填写借出人）/ 已丢弃',
    '# 位置路径用 / 或 → 分隔层级；标签用 、 或 , 分隔；数量为正整数'
  ]
  const examples = [
    ['#示例：数据线', '苹果快充线', '2', '根', '书房 / 书桌 / 收纳盒', '数码、常用', '在库', '', '备用一根'],
    ['#示例：充电宝', '', '1', '个', '客厅 / 电视柜 / 抽屉', '', '借出', '小明', '借给同事，记得催还'],
    ['#示例：旧键盘', '', '1', '个', '储物间 / 纸箱B', '', '已丢弃', '', '已坏，待处理']
  ]
  const lines = [header.join(','), ...notes, ...examples.map((row) => row.map(csvEscape).join(','))]
  return '\ufeff' + lines.join('\n')
}

/** 下载导入模板（与导出 CSV 列一致，含示例行） */
export function downloadImportTemplate(): void {
  download('杂物定位导入模板.csv', buildImportTemplateCsv(), 'text/csv;charset=utf-8')
}
