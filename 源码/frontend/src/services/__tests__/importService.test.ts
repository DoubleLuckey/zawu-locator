import { describe, expect, it } from 'vitest'
import type { ImportRow } from '../importParser'
import { buildImportTemplateCsv, planImport, type ImportContext } from '../importService'

function row(partial: Partial<ImportRow> & { name: string; locationPath: string[] }): ImportRow {
  return {
    rowNumber: 2,
    aliases: '',
    quantity: 1,
    unit: '',
    tags: [],
    status: 'IN_STOCK',
    borrower: '',
    remark: '',
    ...partial
  }
}

const baseCtx: ImportContext = {
  locations: [
    { id: 'L1', parentId: null, name: '储物间', type: 'ROOM', sortOrder: 1, createdAt: 1, updatedAt: 1 }
  ],
  items: [
    {
      id: 'I1',
      locationId: 'L1',
      name: '数据线',
      quantity: 1,
      status: 'IN_STOCK',
      photoBlob: null,
      createdAt: 1,
      updatedAt: 1
    }
  ],
  tags: [{ id: 'T1', name: '数码', color: 'BLUE', createdAt: 1 }],
  itemTags: [{ itemId: 'I1', tagId: 'T1' }]
}

describe('planImport', () => {
  it('新增物品时按路径自动创建位置并推断类型', () => {
    const { plan } = planImport([row({ name: '剪刀', locationPath: ['储物间', '纸箱A'] })], baseCtx)
    expect(plan.newLocations).toHaveLength(1)
    expect(plan.newLocations[0]).toMatchObject({ parentId: 'L1', name: '纸箱A', type: 'BOX', sortOrder: 1 })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].existing).toBeNull()
    expect(plan.items[0].next.locationId).toBe(plan.newLocations[0].id)
    expect(plan.items[0].next).toMatchObject({ name: '剪刀', photoBlob: null })
  })

  it('位置已存在时复用，不重复创建', () => {
    const { plan } = planImport([row({ name: '毛巾', locationPath: ['储物间'] })], baseCtx)
    expect(plan.newLocations).toHaveLength(0)
  })

  it('同位置同名物品按更新处理，保留照片', () => {
    const { plan } = planImport(
      [row({ name: '数据线', quantity: 3, unit: '根', tags: ['数码'], locationPath: ['储物间'] })],
      baseCtx
    )
    const entry = plan.items[0]
    expect(entry.existing?.id).toBe('I1')
    expect(entry.next.quantity).toBe(3)
    expect(entry.next.photoBlob).toBeNull()
  })

  it('借出状态保留原借出时间，在库状态清空借出信息', () => {
    const borrowedCtx: ImportContext = {
      ...baseCtx,
      items: [{ ...baseCtx.items[0], status: 'BORROWED', borrower: '小明', borrowedAt: 100 }]
    }
    const borrowed = planImport(
      [row({ name: '数据线', status: 'BORROWED', borrower: '小王', locationPath: ['储物间'] })],
      borrowedCtx
    )
    expect(borrowed.plan.items[0].next).toMatchObject({
      status: 'BORROWED',
      borrower: '小王',
      borrowedAt: 100
    })

    const returned = planImport(
      [row({ name: '数据线', status: 'IN_STOCK', locationPath: ['储物间'] })],
      borrowedCtx
    )
    expect(returned.plan.items[0].next.borrowedAt).toBeUndefined()
    expect(returned.plan.items[0].next.borrower).toBeUndefined()
  })

  it('标签按名称复用，新标签默认灰色并替换物品标签', () => {
    const { plan } = planImport(
      [row({ name: '数据线', tags: ['数码', '常用'], locationPath: ['储物间'] })],
      baseCtx
    )
    expect(plan.newTags).toHaveLength(1)
    expect(plan.newTags[0]).toMatchObject({ name: '常用', color: 'GRAY' })
    const rel = plan.itemTags[0]
    expect(rel.itemId).toBe('I1')
    expect(rel.tagIds).toHaveLength(2)
    expect(rel.tagIds).toContain('T1')
  })

  it('文件内重复行仅第一行生效', () => {
    const { plan, issues } = planImport(
      [
        row({ rowNumber: 2, name: '剪刀', locationPath: ['储物间'] }),
        row({ rowNumber: 3, name: '剪刀', locationPath: ['储物间'] })
      ],
      baseCtx
    )
    expect(plan.items).toHaveLength(1)
    expect(issues).toEqual([{ rowNumber: 3, reason: '文件内重复行，仅第一行生效' }])
  })
})

describe('buildImportTemplateCsv', () => {
  it('包含表头、说明行与三种状态示例，示例行以 # 开头', () => {
    const csv = buildImportTemplateCsv()
    expect(csv.startsWith('\ufeff物品名称,别名,数量,单位,位置路径,标签,状态,借出人,备注')).toBe(true)
    expect(csv).toContain('# 状态列可选值：在库（默认，留空按在库）/ 借出（必须填写借出人）/ 已丢弃')
    expect(csv).toContain('#示例：数据线')
    expect(csv).toContain('#示例：充电宝')
    expect(csv).toContain('#示例：旧键盘')
  })
})
