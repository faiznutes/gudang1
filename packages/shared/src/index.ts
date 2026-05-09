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

export const MODULE_STATUSES = ['core', 'premium', 'addon', 'postponed', 'never'] as const
export type ModuleStatus = (typeof MODULE_STATUSES)[number]

export const MODULE_KEYS = [
  'tenantAdmin',
  'inventory',
  'warehouse',
  'stockMovement',
  'supplier',
  'activity',
  'notifications',
  'analytics',
  'billing',
  'importExport',
  'reports',
  'purchaseOrderLite',
  'receiving',
  'stockOpname',
  'barcodeScanning',
  'salesInvoiceLite',
  'marketplaceSync',
  'whatsappNotifications',
  'mobileWarehouse',
  'apiIntegrations',
  'fullAccounting',
  'hrPayroll',
  'whiteLabelErp',
  'workflowBuilder',
] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

export interface ProductModuleDefinition {
  key: ModuleKey
  label: string
  status: ModuleStatus
  runtimeFeatureKeys: readonly FeatureKey[]
  tenantRoutePrefixes: readonly string[]
  value: string
}

export const MODULE_CATALOG = {
  tenantAdmin: {
    key: 'tenantAdmin',
    label: 'Tenant admin and users',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/auth/me', '/api/auth/workspaces', '/api/auth/switch-workspace'],
    value: 'Workspace context, user roles, and tenant-safe access boundaries.',
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory master data',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/products', '/api/categories', '/api/inventory'],
    value: 'Product catalog, categories, stock balances, and low-stock visibility.',
  },
  warehouse: {
    key: 'warehouse',
    label: 'Warehouse and branch locations',
    status: 'core',
    runtimeFeatureKeys: ['multiWarehouse'],
    tenantRoutePrefixes: ['/api/warehouses'],
    value: 'Single or multi-location warehouse structure for UMKM operations.',
  },
  stockMovement: {
    key: 'stockMovement',
    label: 'Stock movement',
    status: 'core',
    runtimeFeatureKeys: ['stockInOut'],
    tenantRoutePrefixes: ['/api/stock-in', '/api/stock-out', '/api/stock-transfer'],
    value: 'Audited stock in, stock out, and transfer transactions.',
  },
  supplier: {
    key: 'supplier',
    label: 'Supplier directory',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/suppliers'],
    value: 'Simple supplier records for purchasing readiness without full procurement complexity.',
  },
  activity: {
    key: 'activity',
    label: 'Activity tracking',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/activities'],
    value: 'Operational history and scheduled work visibility.',
  },
  notifications: {
    key: 'notifications',
    label: 'In-app notifications',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/notifications'],
    value: 'Low-risk alerts inside the app before external notification channels.',
  },
  analytics: {
    key: 'analytics',
    label: 'Operational analytics',
    status: 'premium',
    runtimeFeatureKeys: ['analytics'],
    tenantRoutePrefixes: ['/api/analytics'],
    value: 'Summary dashboards and performance signals for paid plans.',
  },
  billing: {
    key: 'billing',
    label: 'Subscription and entitlements',
    status: 'core',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/billing', '/api/me/entitlements'],
    value: 'Plan state, entitlement limits, and upgrade or downgrade behavior.',
  },
  importExport: {
    key: 'importExport',
    label: 'Import and export',
    status: 'premium',
    runtimeFeatureKeys: ['batchImport', 'exportPDF'],
    tenantRoutePrefixes: ['/api/import', '/api/export'],
    value: 'Bulk onboarding and operational reports without custom data services.',
  },
  reports: {
    key: 'reports',
    label: 'Reports',
    status: 'premium',
    runtimeFeatureKeys: ['reports', 'exportPDF'],
    tenantRoutePrefixes: [],
    value: 'Standardized management outputs, not custom BI per client.',
  },
  purchaseOrderLite: {
    key: 'purchaseOrderLite',
    label: 'Purchase order lite',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/purchase-orders'],
    value: 'Controlled procurement workflow after receiving and stock rules are stable.',
  },
  receiving: {
    key: 'receiving',
    label: 'Receiving flow',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/receiving'],
    value: 'Structured inbound goods flow before full purchasing automation.',
  },
  stockOpname: {
    key: 'stockOpname',
    label: 'Stock opname',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/stock-opname'],
    value: 'Count, variance, approval, and correction flow after core movement is proven.',
  },
  barcodeScanning: {
    key: 'barcodeScanning',
    label: 'Barcode scanning',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/barcodes'],
    value: 'Mobile-first scanning experience after product variant rules are defined.',
  },
  salesInvoiceLite: {
    key: 'salesInvoiceLite',
    label: 'Sales invoice lite',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/sales-invoices'],
    value: 'Simple outbound sales document flow without becoming full accounting.',
  },
  marketplaceSync: {
    key: 'marketplaceSync',
    label: 'Marketplace sync',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/marketplace'],
    value: 'Integration layer only after local stock truth and reconciliation are reliable.',
  },
  whatsappNotifications: {
    key: 'whatsappNotifications',
    label: 'WhatsApp notifications',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/whatsapp'],
    value: 'External notification channel after in-app notification rules are stable.',
  },
  mobileWarehouse: {
    key: 'mobileWarehouse',
    label: 'Mobile warehouse app',
    status: 'postponed',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/mobile-warehouse'],
    value: 'Dedicated mobile surface after web warehouse flows prove the operating model.',
  },
  apiIntegrations: {
    key: 'apiIntegrations',
    label: 'Public API integrations',
    status: 'addon',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/integrations'],
    value: 'Paid integration capability with strict rate limits and audit logs.',
  },
  fullAccounting: {
    key: 'fullAccounting',
    label: 'Full accounting',
    status: 'never',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/accounting'],
    value: 'Avoid full ledger, tax, and reconciliation scope in WMS Lite.',
  },
  hrPayroll: {
    key: 'hrPayroll',
    label: 'HR and payroll',
    status: 'never',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/hr', '/api/payroll'],
    value: 'Avoid unrelated HR/payroll complexity and support burden.',
  },
  whiteLabelErp: {
    key: 'whiteLabelErp',
    label: 'White-label ERP',
    status: 'never',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/white-label'],
    value: 'Avoid per-client product forks that break SaaS leverage.',
  },
  workflowBuilder: {
    key: 'workflowBuilder',
    label: 'Arbitrary workflow builder',
    status: 'never',
    runtimeFeatureKeys: [],
    tenantRoutePrefixes: ['/api/workflows'],
    value: 'Avoid custom workflow engine before repeatable WMS processes are mature.',
  },
} as const satisfies Record<ModuleKey, ProductModuleDefinition>

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

export interface SessionRoleContext {
  platform_role: UserRole
  workspace_role: UserRole
}

export interface ApiErrorResponse {
  code: 'unauthenticated' | 'forbidden' | 'feature_locked' | 'conflict' | 'validation_error' | 'not_found' | 'internal_error'
  message: string
  details?: unknown
}
