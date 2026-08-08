export interface TapCounter {
  tap(): boolean
}

/** 连续点击计数器：时间窗口内点击达到 threshold 次返回 true（用于隐藏入口解锁） */
export function createTapCounter(threshold = 5, windowMs = 2000): TapCounter {
  let lastTapAt = 0
  let count = 0

  return {
    tap(): boolean {
      const now = Date.now()
      if (now - lastTapAt > windowMs) count = 0
      lastTapAt = now
      count += 1
      return count >= threshold
    }
  }
}
