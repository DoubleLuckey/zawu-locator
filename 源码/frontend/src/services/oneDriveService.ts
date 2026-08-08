import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser'
import {
  AUTO_BACKUP_FILE_NAME,
  ONEDRIVE_AUTHORITY,
  ONEDRIVE_CLIENT_ID,
  ONEDRIVE_GRAPH_BASE,
  ONEDRIVE_SCOPES
} from '@/config/oneDrive'
import {
  buildBackupFileName,
  getOneDriveRedirectUriForMode,
  parseBackupFileList,
  type BackupFileInfo,
  type BackupPayload
} from './oneDriveHelpers'
import { buildBackupPayload, importJsonText } from './backupService'

export class OneDriveError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'OneDriveError'
  }
}

let pcaPromise: Promise<PublicClientApplication> | null = null
let initPromise: Promise<AccountInfo | null> | null = null

function buildRedirectUri(): string {
  // 本地开发固定重定向到站点根（http://localhost:10086/），
  // 生产（GitHub Pages）使用 /zawu-locator/ 子路径，均需在 Azure 注册
  return getOneDriveRedirectUriForMode(
    window.location.origin,
    import.meta.env.BASE_URL,
    import.meta.env.DEV
  )
}

function getPca(): Promise<PublicClientApplication> {
  if (!ONEDRIVE_CLIENT_ID) {
    return Promise.reject(new OneDriveError('未配置 OneDrive 客户端 ID，请查看 README', 'NOT_CONFIGURED'))
  }
  if (!pcaPromise) {
    pcaPromise = (async () => {
      const instance = new PublicClientApplication({
        auth: {
          clientId: ONEDRIVE_CLIENT_ID,
          authority: ONEDRIVE_AUTHORITY,
          redirectUri: buildRedirectUri()
        },
        cache: { cacheLocation: 'localStorage' }
      })
      // MSAL v5 要求先完成初始化才能调用其他方法
      await instance.initialize()
      return instance
    })()
  }
  return pcaPromise
}

export function isOneDriveConfigured(): boolean {
  return Boolean(ONEDRIVE_CLIENT_ID)
}

/**
 * 应用启动时调用，处理整页跳转授权后的回调。
 * 返回当前登录账号（授权完成或已有会话时），未登录返回 null。
 */
export function initOneDriveAuth(): Promise<AccountInfo | null> {
  if (!isOneDriveConfigured()) return Promise.resolve(null)
  if (!initPromise) {
    initPromise = getPca()
      .then(async (instance) => {
        const result = await instance.handleRedirectPromise()
        if (result?.account) {
          instance.setActiveAccount(result.account)
          return result.account
        }
        return instance.getActiveAccount()
      })
      .catch(() => null)
  }
  return initPromise
}

export async function getOneDriveLoginState(): Promise<{
  loggedIn: boolean
  account: AccountInfo | null
}> {
  if (!isOneDriveConfigured()) return { loggedIn: false, account: null }
  const instance = await getPca()
  const account = instance.getActiveAccount()
  return { loggedIn: Boolean(account), account }
}

export async function loginOneDrive(): Promise<void> {
  const instance = await getPca()
  await instance.loginRedirect({ scopes: ONEDRIVE_SCOPES, redirectUri: buildRedirectUri() })
}

export async function logoutOneDrive(): Promise<void> {
  const instance = await getPca()
  await instance.logoutRedirect({ postLogoutRedirectUri: buildRedirectUri() })
}

async function acquireToken(): Promise<string> {
  const instance = await getPca()
  const account = instance.getActiveAccount()
  if (!account) throw new OneDriveError('请先登录微软账号', 'AUTH_REQUIRED')
  const request = { scopes: ONEDRIVE_SCOPES, account }
  try {
    const silent = await instance.acquireTokenSilent(request)
    return silent.accessToken
  } catch {
    throw new OneDriveError('登录状态已失效，请重新登录', 'TOKEN_EXPIRED')
  }
}

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await acquireToken()
  const res = await fetch(`${ONEDRIVE_GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  })
  if (!res.ok) {
    throw new OneDriveError(`OneDrive 请求失败（HTTP ${res.status}），请稍后重试`, 'GRAPH_ERROR')
  }
  return res
}

/** 将当前数据备份到 OneDrive 应用专属文件夹，文件名为带时间戳的新文件 */
export async function backupToOneDrive(): Promise<void> {
  const payload = await buildBackupPayload()
  await uploadPayload(payload, buildBackupFileName(new Date()))
}

/** 自动备份：固定文件名覆盖写，供数据变更后自动调度使用 */
export async function backupAutoToOneDrive(): Promise<void> {
  const payload = await buildBackupPayload()
  await uploadPayload(payload, AUTO_BACKUP_FILE_NAME)
}

async function uploadPayload(payload: BackupPayload, fileName: string): Promise<void> {
  await graphFetch(`/me/drive/special/approot:/${encodeURIComponent(fileName)}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/** 列出 OneDrive 应用文件夹中的备份文件（按修改时间倒序） */
export async function listOneDriveBackups(): Promise<BackupFileInfo[]> {
  const res = await graphFetch(
    '/me/drive/special/approot/children?$select=id,name,size,lastModifiedDateTime'
  )
  return parseBackupFileList(await res.json())
}

/** 从 OneDrive 下载指定备份并导入（覆盖当前数据） */
export async function restoreFromOneDrive(
  fileName: string
): Promise<{ ok: boolean; message: string }> {
  const res = await graphFetch(`/me/drive/special/approot:/${encodeURIComponent(fileName)}:/content`)
  return importJsonText(await res.text())
}
