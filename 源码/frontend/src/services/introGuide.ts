const STORAGE_KEY = 'zawu-intro-seen'

export type IntroState = 'seen' | 'new' | 'unavailable'

export function getIntroState(): IntroState {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1' ? 'seen' : 'new'
  } catch {
    // localStorage 不可用（如隐私模式）时返回 unavailable，界面只显示按钮、不自动弹窗
    return 'unavailable'
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage 不可用时忽略，不影响其它功能
  }
}
