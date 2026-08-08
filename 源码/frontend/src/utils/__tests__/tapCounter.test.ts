import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTapCounter } from '../tapCounter'

describe('createTapCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('连续点击 5 次解锁', () => {
    const counter = createTapCounter(5, 2000)
    expect(counter.tap()).toBe(false)
    expect(counter.tap()).toBe(false)
    expect(counter.tap()).toBe(false)
    expect(counter.tap()).toBe(false)
    expect(counter.tap()).toBe(true)
  })

  it('间隔超过时间窗口后重新计数', () => {
    const counter = createTapCounter(5, 2000)
    for (let i = 0; i < 4; i++) counter.tap()
    vi.advanceTimersByTime(2100)
    expect(counter.tap()).toBe(false)
    counter.tap()
    counter.tap()
    counter.tap()
    expect(counter.tap()).toBe(true)
  })
})
