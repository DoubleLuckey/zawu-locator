// OneDrive 云备份配置
// VITE_ONEDRIVE_CLIENT_ID：在 Azure 门户注册应用后获取（见 README「OneDrive 云备份」章节）
export const ONEDRIVE_CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? ''

// 同时支持个人 Microsoft 账号与工作/学校账号
export const ONEDRIVE_AUTHORITY = 'https://login.microsoftonline.com/common'

// 最小权限：仅读写应用自己的 OneDrive 应用文件夹（Apps/杂物定位）
export const ONEDRIVE_SCOPES = ['Files.ReadWrite.AppFolder']

export const ONEDRIVE_GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export const BACKUP_FILE_PREFIX = '杂物定位备份'

// 自动备份固定文件名（覆盖写，避免云端堆积）
export const AUTO_BACKUP_FILE_NAME = '杂物定位备份-自动.json'

// 数据变更后等待多久触发自动备份
export const AUTO_BACKUP_DEBOUNCE_MS = 5000
