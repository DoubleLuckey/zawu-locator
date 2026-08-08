import * as XLSX from 'xlsx'
import type { ItemStatus } from '@/types'

const HEADER_NAME = '物品名称'
const HEADER_ALIASES = '别名'
const HEADER_QUANTITY = '数量'
const HEADER_UNIT = '单位'
const HEADER_PATH = '位置路径'
const HEADER_TAGS = '标签'
const HEADER_STATUS = '状态'
const HEADER_BORROWER = '借出人'
const HEADER_REMARK = '备注'

export interface ImportRow {
  rowNumber: number
  name: string
  aliases: string
  quantity: number
  unit: string
  locationPath: string[]
  tags: string[]
  status: ItemStatus
  borrower: string
  remark: string
}

export interface ImportRowIssue {
  rowNumber: number
  reason: string
}

export type NormalizeResult = { ok: true; row: ImportRow } | { ok: false; reason: string }

/** 拆分位置路径，兼容 /、>、｜、→ 分隔 */
export function splitLocationPath(path: string): string[] {
  return path
    .split(/[/>｜→]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 拆分标签，兼容 、 ， , 分隔并按忽略大小写去重 */
export function splitTags(value: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  String(value ?? '')
    .split(/[、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(tag)
      }
    })
  return out
}

function parseStatus(value: unknown): ItemStatus | null {
  const s = String(value ?? '').trim()
  if (!s) return 'IN_STOCK'
  const upper = s.toUpperCase()
  if (upper === 'IN_STOCK' || s === '在库') return 'IN_STOCK'
  if (upper === 'BORROWED' || s === '借出') return 'BORROWED'
  if (upper === 'DISCARDED' || s === '已丢弃') return 'DISCARDED'
  return null
}

function parseQuantity(value: unknown): number | null {
  const s = String(value ?? '').trim()
  if (!s) return 1
  const n = Number(s)
  return Number.isInteger(n) && n >= 1 ? n : null
}

/** 将一行原始单元格按表头列名规范化为 ImportRow；失败时返回原因 */
export function normalizeImportRow(
  cells: unknown[],
  header: string[],
  rowNumber: number
): NormalizeResult {
  const cell = (name: string): unknown => cells[header.indexOf(name)] ?? ''

  const name = String(cell(HEADER_NAME) ?? '').trim()
  if (!name) return { ok: false, reason: '缺少物品名称' }

  const locationPath = splitLocationPath(String(cell(HEADER_PATH) ?? '').trim())
  if (!locationPath.length) return { ok: false, reason: '缺少位置路径' }

  const quantity = parseQuantity(cell(HEADER_QUANTITY))
  if (quantity === null) return { ok: false, reason: '数量非正整数' }

  const status = parseStatus(cell(HEADER_STATUS))
  if (!status) return { ok: false, reason: '状态值不识别' }

  const borrower = String(cell(HEADER_BORROWER) ?? '').trim()
  if (status === 'BORROWED' && !borrower) return { ok: false, reason: '借出状态缺少借出人' }

  return {
    ok: true,
    row: {
      rowNumber,
      name,
      aliases: String(cell(HEADER_ALIASES) ?? '').trim(),
      quantity,
      unit: String(cell(HEADER_UNIT) ?? '').trim(),
      locationPath,
      tags: splitTags(cell(HEADER_TAGS)),
      status,
      borrower,
      remark: String(cell(HEADER_REMARK) ?? '').trim()
    }
  }
}

/** CSV 文本解码：优先 UTF-8（去 BOM），出现替换字符时回退 GBK */
export function decodeCsvText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '')
  if (!utf8.includes('\uFFFD')) return utf8
  return new TextDecoder('gbk').decode(buffer)
}

/** 解析用户选择的 .xlsx / .csv 文件，返回合法行与逐行跳过原因 */
export async function parseImportFile(file: File): Promise<{
  rows: ImportRow[]
  issues: ImportRowIssue[]
}> {
  const buffer = await file.arrayBuffer()
  const workbook = file.name.toLowerCase().endsWith('.csv')
    ? XLSX.read(decodeCsvText(buffer), { type: 'string' })
    : XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { rows: [], issues: [] }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  }) as unknown[][]
  if (!matrix.length) return { rows: [], issues: [] }

  const header = (matrix[0] as unknown[]).map((c) => String(c ?? '').trim())
  const missing = [HEADER_NAME, HEADER_PATH].filter((h) => !header.includes(h))
  if (missing.length) {
    return { rows: [], issues: [{ rowNumber: 1, reason: `缺少必需表头：${missing.join(' / ')}` }] }
  }

  const rows: ImportRow[] = []
  const issues: ImportRowIssue[] = []
  matrix.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2
    const hasContent = (cells as unknown[]).some((c) => String(c ?? '').trim() !== '')
    if (!hasContent) return
    // 以 # 开头的行视为示例/注释，直接跳过（下载的导入模板自带示例行）
    const rawName = String((cells as unknown[])[header.indexOf(HEADER_NAME)] ?? '').trim()
    if (rawName.startsWith('#')) return
    const result = normalizeImportRow(cells, header, rowNumber)
    if (result.ok) rows.push(result.row)
    else issues.push({ rowNumber, reason: result.reason })
  })
  return { rows, issues }
}
