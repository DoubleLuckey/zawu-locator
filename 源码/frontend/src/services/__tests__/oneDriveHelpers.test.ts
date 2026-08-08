import { describe, expect, it } from 'vitest'
import {
  buildBackupFileName,
  formatBackupTime,
  formatFileSize,
  getOneDriveRedirectUri,
  getOneDriveRedirectUriForMode,
  parseBackupFileList,
  toUserMessage,
  validateBackupPayload
} from '../oneDriveHelpers'

describe('buildBackupFileName', () => {
  it('用本地时间生成带时间戳的备份文件名', () => {
    const date = new Date(2026, 7, 8, 14, 30, 0)
    expect(buildBackupFileName(date)).toBe('杂物定位备份-20260808-143000.json')
  })

  it('月份、日期、时分秒不足两位时补零', () => {
    const date = new Date(2026, 0, 5, 9, 7, 3)
    expect(buildBackupFileName(date)).toBe('杂物定位备份-20260105-090703.json')
  })
})

describe('getOneDriveRedirectUri', () => {
  it('GitHub Pages 子路径下拼出完整重定向地址', () => {
    expect(getOneDriveRedirectUri('https://doubleluckey.github.io', '/zawu-locator/')).toBe(
      'https://doubleluckey.github.io/zawu-locator/'
    )
  })

  it('本地开发根路径下重定向到站点根', () => {
    expect(getOneDriveRedirectUri('http://localhost:10086', '/')).toBe('http://localhost:10086/')
  })

  it('base 缺少结尾斜杠时自动补全', () => {
    expect(getOneDriveRedirectUri('http://localhost:10086', '/zawu-locator')).toBe(
      'http://localhost:10086/zawu-locator/'
    )
  })
})

describe('getOneDriveRedirectUriForMode', () => {
  it('本地开发模式忽略 base，重定向到站点根', () => {
    expect(getOneDriveRedirectUriForMode('http://localhost:10086', '/zawu-locator/', true)).toBe(
      'http://localhost:10086/'
    )
  })

  it('生产模式使用 GitHub Pages 子路径', () => {
    expect(
      getOneDriveRedirectUriForMode('https://doubleluckey.github.io', '/zawu-locator/', false)
    ).toBe('https://doubleluckey.github.io/zawu-locator/')
  })
})

describe('parseBackupFileList', () => {
  it('只保留本应用备份文件并按时间倒序', () => {
    const result = parseBackupFileList({
      value: [
        {
          id: 'A',
          name: '杂物定位备份-20260801-100000.json',
          size: 100,
          lastModifiedDateTime: '2026-08-01T02:00:00Z'
        },
        {
          id: 'B',
          name: '杂物定位备份-20260808-143000.json',
          size: 200,
          lastModifiedDateTime: '2026-08-08T06:30:00Z'
        },
        { id: 'C', name: 'notes.txt', size: 10, lastModifiedDateTime: '2026-08-09T00:00:00Z' }
      ]
    })
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('B')
    expect(result[1].id).toBe('A')
  })

  it('时间标签按东八区格式化', () => {
    const result = parseBackupFileList({
      value: [
        {
          id: 'B',
          name: '杂物定位备份-20260808-143000.json',
          size: 200,
          lastModifiedDateTime: '2026-08-08T06:30:00Z'
        }
      ]
    })
    expect(result[0].label).toBe('2026/08/08 14:30')
  })

  it('空列表或缺少 value 时返回空数组', () => {
    expect(parseBackupFileList({ value: [] })).toEqual([])
    expect(parseBackupFileList({})).toEqual([])
  })
})

describe('validateBackupPayload', () => {
  it('合法的备份数据返回成功及统计信息', () => {
    const result = validateBackupPayload({
      locations: [{ id: 'L1' }],
      items: [{ id: 'I1' }, { id: 'I2' }],
      tags: [],
      itemTags: []
    })
    expect(result.ok).toBe(true)
    expect(result.message).toBe('导入成功：1 个位置、2 件物品')
  })

  it('缺少 locations 或 items 时返回失败', () => {
    expect(validateBackupPayload({ locations: [] }).ok).toBe(false)
    expect(validateBackupPayload({ items: [] }).ok).toBe(false)
  })

  it('非对象输入返回失败', () => {
    expect(validateBackupPayload(null).ok).toBe(false)
    expect(validateBackupPayload('hello').ok).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('小于 1MB 时显示 KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('大于 1MB 时显示 MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('0 字节显示 0 B', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })
})

describe('formatBackupTime', () => {
  it('格式化为 年/月/日 时:分', () => {
    expect(formatBackupTime(new Date(2026, 7, 8, 14, 30).getTime())).toBe('2026/08/08 14:30')
  })

  it('不足两位补零', () => {
    expect(formatBackupTime(new Date(2026, 0, 5, 9, 7).getTime())).toBe('2026/01/05 09:07')
  })
})

describe('toUserMessage', () => {
  it('Error 对象返回其 message', () => {
    expect(toUserMessage(new Error('AADSTS50011: redirect_uri 不匹配'), 'fallback')).toBe(
      'AADSTS50011: redirect_uri 不匹配'
    )
  })

  it('非 Error 输入返回兜底文案', () => {
    expect(toUserMessage('oops', 'fallback')).toBe('fallback')
    expect(toUserMessage(null, 'fallback')).toBe('fallback')
    expect(toUserMessage({ code: 1 }, 'fallback')).toBe('fallback')
  })
})
