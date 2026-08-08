import { describe, expect, it } from 'vitest'
import {
  decodeCsvText,
  normalizeImportRow,
  parseImportFile,
  splitLocationPath,
  splitTags
} from '../importParser'

const HEADER = ['物品名称', '别名', '数量', '单位', '位置路径', '标签', '状态', '借出人', '备注']

describe('splitLocationPath', () => {
  it('按 / 分隔并去除空格', () => {
    expect(splitLocationPath('储物间 / 纸箱A / 小袋子')).toEqual(['储物间', '纸箱A', '小袋子'])
  })

  it('兼容 →、>、｜ 分隔', () => {
    expect(splitLocationPath('储物间→纸箱A>小袋子｜夹层')).toEqual(['储物间', '纸箱A', '小袋子', '夹层'])
  })

  it('空白路径返回空数组', () => {
    expect(splitLocationPath('  ')).toEqual([])
  })
})

describe('splitTags', () => {
  it('按 、 ， , 分隔并去重', () => {
    expect(splitTags('证件、充电器，数据线,证件')).toEqual(['证件', '充电器', '数据线'])
  })

  it('空值返回空数组', () => {
    expect(splitTags('')).toEqual([])
  })
})

describe('normalizeImportRow', () => {
  it('完整行解析成功', () => {
    const result = normalizeImportRow(
      ['数据线', '苹果线', 3, '根', '抽屉 / 收纳盒', '数码', '在库', '', '备用'],
      HEADER,
      2
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row).toMatchObject({
        rowNumber: 2,
        name: '数据线',
        aliases: '苹果线',
        quantity: 3,
        unit: '根',
        locationPath: ['抽屉', '收纳盒'],
        tags: ['数码'],
        status: 'IN_STOCK',
        borrower: '',
        remark: '备用'
      })
    }
  })

  it('列顺序无关，多余列忽略', () => {
    const shuffled = ['数码', '数据线', '', '备用', '抽屉 / 收纳盒', 1, '在库', '', '根']
    const header = ['标签', '物品名称', '数量', '备注', '位置路径', '别名', '状态', '借出人', '单位']
    const result = normalizeImportRow(shuffled, header, 2)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.name).toBe('数据线')
      expect(result.row.unit).toBe('根')
      expect(result.row.remark).toBe('备用')
    }
  })

  it('缺少物品名称返回失败原因', () => {
    expect(normalizeImportRow(['', 'x', 1, '', '抽屉', '', '在库', '', ''], HEADER, 2)).toEqual({
      ok: false,
      reason: '缺少物品名称'
    })
  })

  it('缺少位置路径返回失败原因', () => {
    expect(normalizeImportRow(['剪刀', '', 1, '', '', '', '在库', '', ''], HEADER, 2)).toEqual({
      ok: false,
      reason: '缺少位置路径'
    })
  })

  it('数量留空默认 1，非正整数失败', () => {
    const blank = normalizeImportRow(['a', '', '', '', '抽屉', '', '在库', '', ''], HEADER, 2)
    expect(blank.ok).toBe(true)
    expect(normalizeImportRow(['a', '', 0, '', '抽屉', '', '在库', '', ''], HEADER, 2)).toEqual({
      ok: false,
      reason: '数量非正整数'
    })
  })

  it('状态支持中文与英文值，空为在库', () => {
    const borrowed = normalizeImportRow(['a', '', 1, '', '抽屉', '', '借出', '小明', ''], HEADER, 2)
    expect(borrowed.ok && borrowed.row.status).toBe('BORROWED')
    const en = normalizeImportRow(['a', '', 1, '', '抽屉', '', 'DISCARDED', '', ''], HEADER, 2)
    expect(en.ok && en.row.status).toBe('DISCARDED')
    const empty = normalizeImportRow(['a', '', 1, '', '抽屉', '', '', '', ''], HEADER, 2)
    expect(empty.ok && empty.row.status).toBe('IN_STOCK')
    expect(normalizeImportRow(['a', '', 1, '', '抽屉', '', '丢了', '', ''], HEADER, 2)).toEqual({
      ok: false,
      reason: '状态值不识别'
    })
  })

  it('借出状态缺少借出人返回失败', () => {
    expect(normalizeImportRow(['a', '', 1, '', '抽屉', '', '借出', '', ''], HEADER, 2)).toEqual({
      ok: false,
      reason: '借出状态缺少借出人'
    })
  })
})

describe('decodeCsvText', () => {
  it('UTF-8 正常解码并去除 BOM', () => {
    const bytes = new TextEncoder().encode('\uFEFF物品名称,数量\n数据线,2\n')
    expect(decodeCsvText(bytes.buffer)).toBe('物品名称,数量\n数据线,2\n')
  })

  it('UTF-8 解码出现替换字符时回退 GBK', () => {
    // GBK 编码的「中文字段」：中=D6D0 文=CEC4 字=D7D6 段=B6CE
    const bytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4, 0xd7, 0xd6, 0xb6, 0xce])
    expect(decodeCsvText(bytes.buffer)).toBe('中文字段')
  })
})

describe('parseImportFile', () => {
  it('跳过以 # 开头的示例行，不产生跳过原因', async () => {
    const text =
      '物品名称,别名,数量,单位,位置路径,标签,状态,借出人,备注\n' +
      '#示例：数据线,苹果快充线,2,根,书房 / 书桌 / 收纳盒,数码、常用,在库,,备用一根\n' +
      '充电宝,,1,个,客厅 / 抽屉,,在库,,\n'
    const file = {
      name: 'template.csv',
      arrayBuffer: async () => new TextEncoder().encode(text).buffer
    } as unknown as File
    const { rows, issues } = await parseImportFile(file)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('充电宝')
    expect(issues).toEqual([])
  })
})
