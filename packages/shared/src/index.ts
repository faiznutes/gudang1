export const USER_ROLES = ['super_admin', 'admin', 'staff', 'supplier', 'trial'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const PLAN_TYPES = ['free', 'starter', 'growth', 'pro', 'custom'] as const
export type PlanType = (typeof PLAN_TYPES)[number]

export const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'past_due', 'expired', 'trialing'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const FEATURE_KEYS = [
  'stockInOut',
  'multiWarehouse',
  'analytics',
  'exportPDF',
  'batchImport',
  'reports',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export type FeatureMap = Record<FeatureKey, boolean>

export interface EntitlementLimits {
  warehouses: number
  products: number
  users: number
}

export interface EntitlementUsage {
  warehouses: number
  products: number
  users: number
}

export interface EntitlementResponse {
  plan: PlanType
  subscriptionStatus: SubscriptionStatus | 'none'
  trialEndsAt: string | null
  subscriptionStartsAt: string | null
  subscriptionEndsAt: string | null
  features: FeatureMap
  limits: EntitlementLimits
  usage: EntitlementUsage
}

export interface ApiErrorResponse {
  code: 'unauthenticated' | 'forbidden' | 'feature_locked' | 'conflict' | 'validation_error' | 'not_found' | 'internal_error'
  message: string
  details?: unknown
}
