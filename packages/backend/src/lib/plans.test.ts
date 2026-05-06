import { describe, expect, it } from 'vitest'
import { PLAN_CATALOG } from './plans.js'

describe('PLAN_CATALOG', () => {
  it('keeps stock movement locked on free and unlocked on starter', () => {
    expect(PLAN_CATALOG.free.features.stockInOut).toBe(false)
    expect(PLAN_CATALOG.starter.features.stockInOut).toBe(true)
  })

  it('keeps analytics locked until growth', () => {
    expect(PLAN_CATALOG.starter.features.analytics).toBe(false)
    expect(PLAN_CATALOG.growth.features.analytics).toBe(true)
  })
})
