import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  loginRedirect: vi.fn(),
  logoutRedirect: vi.fn(),
  handleRedirectPromise: vi.fn(),
  setActiveAccount: vi.fn(),
  getActiveAccount: vi.fn(),
  acquireTokenSilent: vi.fn(),
  fetch: vi.fn()
}))

vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: class {
    initialize = mocks.initialize
    loginRedirect = mocks.loginRedirect
    logoutRedirect = mocks.logoutRedirect
    handleRedirectPromise = mocks.handleRedirectPromise
    setActiveAccount = mocks.setActiveAccount
    getActiveAccount = mocks.getActiveAccount
    acquireTokenSilent = mocks.acquireTokenSilent
  }
}))

vi.mock('@/services/backupService', () => ({
  buildBackupPayload: vi.fn().mockResolvedValue({ locations: [], items: [] }),
  importJsonText: vi.fn()
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_ONEDRIVE_CLIENT_ID', 'test-client-id')
  vi.stubGlobal('window', { location: { origin: 'http://localhost:10086' } })
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.initialize.mockResolvedValue(undefined)
  mocks.handleRedirectPromise.mockResolvedValue(null)
  mocks.loginRedirect.mockResolvedValue(undefined)
  mocks.logoutRedirect.mockResolvedValue(undefined)
  mocks.getActiveAccount.mockReturnValue(null)
  mocks.acquireTokenSilent.mockResolvedValue({ accessToken: 'test-token' })
  mocks.fetch.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('oneDriveService 整页跳转登录', () => {
  it('登录前会先完成初始化，再调用 loginRedirect', async () => {
    let resolveInit!: () => void
    mocks.initialize.mockReturnValue(new Promise<void>((resolve) => (resolveInit = resolve)))
    const { loginOneDrive } = await import('../oneDriveService')

    const pending = loginOneDrive()
    await Promise.resolve()
    expect(mocks.loginRedirect).not.toHaveBeenCalled()

    resolveInit()
    await pending
    expect(mocks.initialize).toHaveBeenCalledTimes(1)
    expect(mocks.loginRedirect).toHaveBeenCalledTimes(1)
  })

  it('初始化失败时登录失败且不会调用 loginRedirect', async () => {
    mocks.initialize.mockRejectedValue(new Error('init failed'))
    const { loginOneDrive } = await import('../oneDriveService')

    await expect(loginOneDrive()).rejects.toThrow('init failed')
    expect(mocks.loginRedirect).not.toHaveBeenCalled()
  })

  it('多次操作复用同一个实例，只初始化一次', async () => {
    const { loginOneDrive } = await import('../oneDriveService')

    await loginOneDrive()
    await loginOneDrive()
    expect(mocks.initialize).toHaveBeenCalledTimes(1)
  })

  it('initOneDriveAuth 初始化完成后才处理重定向回调并返回账号', async () => {
    let resolveInit!: () => void
    mocks.initialize.mockReturnValue(new Promise<void>((resolve) => (resolveInit = resolve)))
    mocks.handleRedirectPromise.mockResolvedValue({ account: { username: 'user@example.com' } })
    const { initOneDriveAuth } = await import('../oneDriveService')

    const pending = initOneDriveAuth()
    await Promise.resolve()
    expect(mocks.handleRedirectPromise).not.toHaveBeenCalled()

    resolveInit()
    const account = await pending
    expect(mocks.handleRedirectPromise).toHaveBeenCalledTimes(1)
    expect(account?.username).toBe('user@example.com')
  })

  it('退出登录走整页跳转 logoutRedirect', async () => {
    const { logoutOneDrive } = await import('../oneDriveService')

    await logoutOneDrive()
    expect(mocks.logoutRedirect).toHaveBeenCalledTimes(1)
    expect(mocks.logoutRedirect.mock.calls[0][0]).toMatchObject({
      postLogoutRedirectUri: 'http://localhost:10086/'
    })
  })

  it('自动备份上传到固定文件名', async () => {
    mocks.getActiveAccount.mockReturnValue({ username: 'user@example.com' })
    vi.stubGlobal('fetch', mocks.fetch)
    const { backupAutoToOneDrive } = await import('../oneDriveService')

    await backupAutoToOneDrive()

    const url = String(mocks.fetch.mock.calls[0][0])
    expect(url).toContain('/me/drive/special/approot:/')
    expect(url).toContain(encodeURIComponent('杂物定位备份-自动.json'))
    expect(url).toContain(':/content')
    expect(mocks.fetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
  })
})
