import { BACKUP_FILE_PREFIX } from '@/config/oneDrive'

const pad = (n: number): string => String(n).padStart(2, '0')

/** 用本地时间生成带时间戳的备份文件名，例如 杂物定位备份-20260808-143000.json */
export function buildBackupFileName(date: Date): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${BACKUP_FILE_PREFIX}-${year}${month}${day}-${hour}${minute}${second}.json`
}

/** 拼接 MSAL 重定向地址：origin + base，并保证结尾斜杠 */
export function getOneDriveRedirectUri(origin: string, baseUrl: string): string {
  const base = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
  return `${origin}${base.endsWith('/') ? base : `${base}/`}`
}

/** 开发模式 Vite 始终把应用服务在站点根，生产模式才使用 base 子路径 */
export function getOneDriveRedirectUriForMode(
  origin: string,
  baseUrl: string,
  isDev: boolean
): string {
  return getOneDriveRedirectUri(origin, isDev ? '/' : baseUrl)
}

/** 文件大小展示：0 B / KB / MB */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 备份时间展示：年/月/日 时:分 */
export function formatBackupTime(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 把异常转成用户可读文案；非 Error 输入使用兜底文案 */
export function toUserMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  return fallback
}

export interface BackupFileInfo {
  id: string
  name: string
  size: number
  lastModifiedDateTime: string
  label: string
}

const labelFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

function formatLabel(iso: unknown): string {
  if (typeof iso !== 'string') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return labelFormatter.format(date)
}

/** 解析 Graph API children 响应，只保留本应用的备份文件并按修改时间倒序 */
export function parseBackupFileList(payload: unknown): BackupFileInfo[] {
  const value = (payload as { value?: unknown[] } | null)?.value
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : '',
      size: typeof item.size === 'number' ? item.size : 0,
      lastModifiedDateTime:
        typeof item.lastModifiedDateTime === 'string' ? item.lastModifiedDateTime : '',
      label: formatLabel(item.lastModifiedDateTime)
    }))
    .filter((file) => file.name.startsWith(BACKUP_FILE_PREFIX) && file.name.endsWith('.json'))
    .sort((a, b) => b.lastModifiedDateTime.localeCompare(a.lastModifiedDateTime))
}

export interface BackupPayload {
  version?: number
  exportedAt?: number
  locations?: unknown[]
  items?: unknown[]
  tags?: unknown[]
  itemTags?: unknown[]
  searchLogs?: unknown[]
}

/** 校验导入文件是否为合法的备份 JSON（纯逻辑，供本地导入与 OneDrive 恢复共用） */
export function validateBackupPayload(data: unknown): { ok: boolean; message: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: '文件格式不正确，请选择本应用导出的备份文件' }
  }
  const payload = data as Record<string, unknown>
  if (!Array.isArray(payload.locations) || !Array.isArray(payload.items)) {
    return { ok: false, message: '文件格式不正确，请选择本应用导出的备份文件' }
  }
  return {
    ok: true,
    message: `导入成功：${(payload.locations as unknown[]).length} 个位置、${(payload.items as unknown[]).length} 件物品`
  }
}
