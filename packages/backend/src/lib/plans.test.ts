import { describe, expect, it } from 'vitest'
import { PLAN_CATALOG, PLAN_PRICES, planPrice } from './plans.js'

describe('PLAN_CATALOG', () => {
  it('keeps stock movement locked on free and unlocked on starter', () => {
    expect(PLAN_CATALOG.free.features.stockInOut).toBe(false)
    expect(PLAN_CATALOG.starter.features.stockInOut).toBe(true)
  })

  it('keeps analytics locked until growth', () => {
    expect(PLAN_CATALOG.starter.features.analytics).toBe(false)
    expect(PLAN_CATALOG.growth.features.analytics).toBe(true)
  })

  it('keeps paid package pricing aligned with the active promo', () => {
    expect(planPrice('starter')).toBe(250000)
    expect(planPrice('growth')).toBe(300000)
    expect(PLAN_PRICES.growth.originalMonthly).toBe(500000)
  })

  it('keeps export and batch import locked until pro', () => {
    expect(PLAN_CATALOG.starter.features.exportPDF).toBe(false)
    expect(PLAN_CATALOG.starter.features.batchImport).toBe(false)
    expect(PLAN_CATALOG.growth.features.exportPDF).toBe(false)
    expect(PLAN_CATALOG.growth.features.batchImport).toBe(false)
    expect(PLAN_CATALOG.pro.features.exportPDF).toBe(true)
    expect(PLAN_CATALOG.pro.features.batchImport).toBe(true)
  })
})
