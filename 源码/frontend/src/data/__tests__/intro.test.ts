import { describe, expect, it } from 'vitest'
import { INTRO_CONTENT } from '../intro'

describe('INTRO_CONTENT', () => {
  it('包含完整结构：标题、副标题、简介、功能、步骤、提示', () => {
    expect(INTRO_CONTENT.title).toBeTruthy()
    expect(INTRO_CONTENT.tagline).toBeTruthy()
    expect(INTRO_CONTENT.intro).toBeTruthy()
    expect(INTRO_CONTENT.features.length).toBeGreaterThanOrEqual(4)
    expect(INTRO_CONTENT.steps.length).toBe(3)
    expect(INTRO_CONTENT.tips.length).toBeGreaterThanOrEqual(3)
  })

  it('每个功能点都有标题和说明', () => {
    for (const f of INTRO_CONTENT.features) {
      expect(f.title).toBeTruthy()
      expect(f.text).toBeTruthy()
    }
  })

  it('每个上手步骤都有标题和说明', () => {
    for (const s of INTRO_CONTENT.steps) {
      expect(s.title).toBeTruthy()
      expect(s.text).toBeTruthy()
    }
  })
})
