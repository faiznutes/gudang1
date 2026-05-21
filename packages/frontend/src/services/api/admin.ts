import api from './client'

export type AdminPlan = string
export type AdminRole = 'super_admin' | 'admin' | 'staff' | 'supplier' | 'trial'
export type TenantRole = Exclude<AdminRole, 'super_admin'>
export type WorkspaceStatus = 'active' | 'suspended' | 'trial'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing'
export type BillingCycle = 'monthly' | 'yearly' | 'manual'
export type CatalogStatus = 'active' | 'archived'
export type FeatureKey = 'stockInOut' | 'multiWarehouse' | 'analytics' | 'exportPDF' | 'batchImport' | 'reports'
export type BillingRequestType = 'plan_change' | 'addon_activation' | 'limit_increase' | 'subscription_extension' | 'custom_feature' | 'manual_adjustment' | 'enterprise_customization'
export type BillingRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type CustomizationClassification = 'rejected' | 'future_roadmap' | 'enterprise_only' | 'billable_customization' | 'global_feature_candidate'

export interface Workspace {
  id: string
  name: string
  owner_id?: string
  owner_name?: string
  owner_email?: string
  plan: AdminPlan
  status: WorkspaceStatus
  users?: number
  products?: number
  warehouses?: number
  suppliers?: number
  mrr?: number
  trial_ends_at?: string | null
  created_at: string
}

export interface WorkspaceUser {
  id: string
  user_id: string
  workspace_id: string
  role: AdminRole
  user: {
    id: string
    name: string
    email: string
    role?: AdminRole
    disabled_at?: string | null
    created_at?: string
  }
  workspace?: Workspace
  created_at: string
  last_login_at?: string | null
}

export interface ManagedProduct {
  id: string
  sku: string
  name: string
  description?: string
  category_id: string
  category?: { id: string; name: string }
  min_stock: number
  price: number
  disabled_at?: string | null
  created_at: string
  updated_at: string
}

export interface ManagedWarehouse {
  id: string
  name: string
  address?: string
  is_default: boolean
  disabled_at?: string | null
  created_at: string
}

export interface ManagedSupplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  disabled_at?: string | null
  created_at: string
  updated_at?: string
}

export interface ManagedInventoryItem {
  id: string
  product_id: string
  product?: ManagedProduct
  warehouse_id: string
  warehouse?: ManagedWarehouse
  quantity: number
  updated_at: string
}

export interface ScheduledActivity {
  id: string
  workspace_id: string
  title: string
  type: string
  status: string
  description?: string
  due_at?: string | null
  disabled_at?: string | null
  created_by_id?: string
  created_at: string
  updated_at: string
}

export interface ManagedProductPayload {
  sku?: string
  name?: string
  description?: string
  category?: string
  min_stock?: number
  price?: number
}

export interface TenantCreatePayload {
  name: string
  plan: AdminPlan
  status: WorkspaceStatus
  subscription_status: SubscriptionStatus
  current_period_start?: string
  current_period_end?: string
  owner: { name: string; email: string; password: string }
  warehouse: { name: string; address?: string }
  staff: Array<{ name: string; email: string; password: string; role: TenantRole }>
  suppliers: Array<{ name: string; contact_person?: string; phone?: string; email?: string; address?: string; notes?: string }>
}

export interface SupplierPayload {
  name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface StockAdjustmentPayload {
  product_id: string
  warehouse_id: string
  quantity: number
  notes?: string
}

export interface Subscription {
  id: string
  workspace_id: string
  workspace?: Pick<Workspace, 'id' | 'name' | 'plan' | 'status'>
  plan: AdminPlan
  package_code?: string
  package_name?: string
  status: SubscriptionStatus
  amount: number
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  next_billing: string | null
  cancel_at_period_end: boolean
}

export interface PlanPackage {
  id: string
  code: string
  name: string
  description?: string | null
  status: CatalogStatus
  monthly_price: number
  yearly_price: number | null
  original_monthly_price: number | null
  market_price?: number | null
  discount_amount?: number | null
  discount_percent?: number | null
  trial_days: number
  sort_order: number
  limits: { warehouses: number; products: number; users: number }
  features: Record<FeatureKey, boolean>
  created_at?: string
  updated_at?: string
}

export interface Addon {
  id: string
  code: string
  name: string
  description?: string | null
  status: CatalogStatus
  monthly_price: number
  yearly_price: number | null
  feature_key: FeatureKey | null
  limit_key: 'warehouses' | 'products' | 'users' | null
  limit_increment: number | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface WorkspaceAddon {
  id: string
  workspace_id: string
  addon: Addon
  status: 'active' | 'cancelled' | 'expired'
  billing_cycle: BillingCycle
  quantity: number
  amount: number
  current_period_start: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export interface BillingRequest {
  id: string
  workspace_id: string
  workspace_name?: string
  requested_by?: { id: string; name: string; email: string } | null
  reviewed_by?: { id: string; name: string; email: string } | null
  type: BillingRequestType
  status: BillingRequestStatus
  title: string
  current_package?: Pick<PlanPackage, 'id' | 'code' | 'name' | 'monthly_price' | 'yearly_price'> | null
  requested_package?: Pick<PlanPackage, 'id' | 'code' | 'name' | 'monthly_price' | 'yearly_price'> | null
  addon?: Addon | null
  billing_cycle: BillingCycle
  quantity: number
  requested_limit_key?: string | null
  requested_limit_value?: number | null
  current_amount: number
  requested_amount: number
  billing_impact: number
  approved_amount?: number | null
  promotional_amount?: number | null
  temporary_access_until?: string | null
  requested_activation_date?: string | null
  approved_activation_date?: string | null
  notes?: string | null
  admin_notes?: string | null
  rejection_reason?: string | null
  classification?: CustomizationClassification | null
  metadata?: Record<string, unknown> | null
  decided_at?: string | null
  created_at: string
  updated_at: string
  history?: Array<{
    id: string
    action: string
    from_status?: BillingRequestStatus | null
    to_status?: BillingRequestStatus | null
    notes?: string | null
    user?: { id: string; name: string; email: string } | null
    created_at: string
  }>
}

export interface AuditLog {
  id: string
  workspace_id: string
  workspace?: { id: string; name: string }
  user_id?: string
  user?: { id: string; name: string; email: string }
  action: string
  category: 'user' | 'workspace' | 'subscription' | 'system' | 'security'
  entity_type: string
  entity_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SystemSetting {
  key: string
  value: string
  description?: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface DashboardStats {
  total_workspaces: number
  active_workspaces: number
  trial_workspaces: number
  total_users: number
  total_revenue: number
  subscription_revenue?: number
  addon_revenue?: number
  active_addons?: number
  active_subscriptions?: number
  pending_approvals?: number
  pending_billing_requests?: number
  expiring_subscriptions?: number
  low_stock_items?: number
  total_products?: number
  total_warehouses?: number
  total_suppliers?: number
  stock_movements_7d?: number
  recent_signups: number
  recent_users: Array<{
    id: string
    name: string
    email: string
    role: AdminRole
    workspace_id: string
    workspace_name: string
    plan: AdminPlan
    created_at: string
  }>
  recent_workspaces: Workspace[]
  plan_distribution: Array<{ plan: AdminPlan; count: number }>
  active_vs_expired_tenants?: { active: number; trial: number; suspended: number; expiring_soon: number }
  analytics_range?: { range: string; granularity: string; from: string; to: string }
  revenue_trends?: Array<{ key: string; label: string; subscription: number; addon: number; total: number }>
  tenant_growth_trends?: Array<{ key: string; label: string; new_tenants: number }>
  addon_sales_trends?: Array<{ key: string; label: string; count: number; revenue: number }>
  request_trends?: Array<{ key: string; label: string; pending: number; approved: number; rejected: number; plan_changes: number; addon_requests: number; custom_requests: number }>
  feature_usage_trends?: Array<{ key: string; label: string; stock_in: number; stock_out: number; transfer: number; total: number }>
  recent_audit_logs?: AuditLog[]
  system_health: Array<{ service: string; status: string; uptime: string }>
}

export interface WorkspaceSummary {
  workspace: Workspace
  users: WorkspaceUser[]
  subscription: Subscription | null
  usage: {
    users: number
    products: number
    warehouses: number
    suppliers: number
    stock_movements: number
    total_stock: number
    low_stock_items: number
  }
  recent_audit_logs: AuditLog[]
}

export interface WorkspaceInventorySummary {
  workspace: Workspace
  totals: {
    items: number
    stock: number
    low_stock: number
  }
  items: Array<{
    id: string
    product_id: string
    product_name: string
    product_sku: string
    warehouse_id: string
    warehouse_name: string
    quantity: number
    min_stock: number
    status: 'ok' | 'low_stock'
    updated_at: string
  }>
}

function params(input: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') search.append(key, String(value))
  })
  return search.toString()
}

export const adminService = {
  async getPlatformUsers(filters: { page?: number; q?: string; role?: string; status?: string; workspace_id?: string } = {}): Promise<PaginatedResponse<WorkspaceUser>> {
    return api.get<PaginatedResponse<WorkspaceUser>>(`/admin/users?${params({ page: filters.page ?? 1, q: filters.q, role: filters.role, status: filters.status, workspace_id: filters.workspace_id })}`)
  },

  async getUsers(workspaceId: string, page = 1): Promise<PaginatedResponse<WorkspaceUser>> {
    return api.get<PaginatedResponse<WorkspaceUser>>(`/admin/workspaces/${workspaceId}/users?page=${page}`)
  },

  async inviteUser(workspaceId: string, email: string, role: string): Promise<WorkspaceUser> {
    return api.post<WorkspaceUser>(`/admin/workspaces/${workspaceId}/users/invite`, { email, role })
  },

  async removeUser(workspaceId: string, userId: string): Promise<void> {
    return api.delete<void>(`/admin/workspaces/${workspaceId}/users/${userId}`)
  },

  async updateUserRole(workspaceId: string, userId: string, role: TenantRole): Promise<WorkspaceUser> {
    return api.put<WorkspaceUser>(`/admin/workspaces/${workspaceId}/users/${userId}`, { role })
  },

  async createWorkspaceUser(workspaceId: string, data: { name: string; email: string; password: string; role: TenantRole }): Promise<WorkspaceUser> {
    return api.post<WorkspaceUser>(`/admin/workspaces/${workspaceId}/users`, data)
  },

  async updateWorkspaceUserProfile(workspaceId: string, userId: string, data: { name?: string; email?: string; role?: TenantRole }): Promise<WorkspaceUser['user']> {
    return api.put<WorkspaceUser['user']>(`/admin/workspaces/${workspaceId}/users/${userId}/profile`, data)
  },

  async disableWorkspaceUser(workspaceId: string, userId: string): Promise<WorkspaceUser['user']> {
    return api.post<WorkspaceUser['user']>(`/admin/workspaces/${workspaceId}/users/${userId}/disable`, {})
  },

  async enableWorkspaceUser(workspaceId: string, userId: string): Promise<WorkspaceUser['user']> {
    return api.post<WorkspaceUser['user']>(`/admin/workspaces/${workspaceId}/users/${userId}/enable`, {})
  },

  async getWorkspaces(page = 1, filters: { status?: string; plan?: string; q?: string } = {}): Promise<PaginatedResponse<Workspace>> {
    return api.get<PaginatedResponse<Workspace>>(`/admin/workspaces?${params({ page, status: filters.status, plan: filters.plan, q: filters.q })}`)
  },

  async createWorkspace(data: TenantCreatePayload): Promise<Workspace> {
    return api.post<Workspace>('/admin/workspaces', data)
  },

  async getWorkspace(id: string): Promise<Workspace> {
    return api.get<Workspace>(`/admin/workspaces/${id}`)
  },

  async getWorkspaceSummary(id: string): Promise<WorkspaceSummary> {
    return api.get<WorkspaceSummary>(`/admin/workspaces/${id}/summary`)
  },

  async getWorkspaceInventorySummary(id: string): Promise<WorkspaceInventorySummary> {
    return api.get<WorkspaceInventorySummary>(`/admin/workspaces/${id}/inventory-summary`)
  },

  async getWorkspaceProducts(workspaceId: string): Promise<ManagedProduct[]> {
    return api.get<ManagedProduct[]>(`/admin/workspaces/${workspaceId}/products`)
  },

  async createWorkspaceProduct(workspaceId: string, data: ManagedProductPayload): Promise<ManagedProduct> {
    return api.post<ManagedProduct>(`/admin/workspaces/${workspaceId}/products`, data)
  },

  async updateWorkspaceProduct(workspaceId: string, productId: string, data: ManagedProductPayload): Promise<ManagedProduct> {
    return api.put<ManagedProduct>(`/admin/workspaces/${workspaceId}/products/${productId}`, data)
  },

  async disableWorkspaceProduct(workspaceId: string, productId: string): Promise<ManagedProduct> {
    return api.post<ManagedProduct>(`/admin/workspaces/${workspaceId}/products/${productId}/disable`, {})
  },

  async enableWorkspaceProduct(workspaceId: string, productId: string): Promise<ManagedProduct> {
    return api.post<ManagedProduct>(`/admin/workspaces/${workspaceId}/products/${productId}/enable`, {})
  },

  async removeWorkspaceProduct(workspaceId: string, productId: string): Promise<void> {
    return api.delete<void>(`/admin/workspaces/${workspaceId}/products/${productId}`)
  },

  async getWorkspaceWarehouses(workspaceId: string): Promise<ManagedWarehouse[]> {
    return api.get<ManagedWarehouse[]>(`/admin/workspaces/${workspaceId}/warehouses`)
  },

  async createWorkspaceWarehouse(workspaceId: string, data: { name: string; address?: string; is_default?: boolean }): Promise<ManagedWarehouse> {
    return api.post<ManagedWarehouse>(`/admin/workspaces/${workspaceId}/warehouses`, data)
  },

  async updateWorkspaceWarehouse(workspaceId: string, warehouseId: string, data: Partial<ManagedWarehouse>): Promise<ManagedWarehouse> {
    return api.put<ManagedWarehouse>(`/admin/workspaces/${workspaceId}/warehouses/${warehouseId}`, data)
  },

  async disableWorkspaceWarehouse(workspaceId: string, warehouseId: string): Promise<ManagedWarehouse> {
    return api.post<ManagedWarehouse>(`/admin/workspaces/${workspaceId}/warehouses/${warehouseId}/disable`, {})
  },

  async enableWorkspaceWarehouse(workspaceId: string, warehouseId: string): Promise<ManagedWarehouse> {
    return api.post<ManagedWarehouse>(`/admin/workspaces/${workspaceId}/warehouses/${warehouseId}/enable`, {})
  },

  async removeWorkspaceWarehouse(workspaceId: string, warehouseId: string): Promise<void> {
    return api.delete<void>(`/admin/workspaces/${workspaceId}/warehouses/${warehouseId}`)
  },

  async getWorkspaceSuppliers(workspaceId: string): Promise<ManagedSupplier[]> {
    return api.get<ManagedSupplier[]>(`/admin/workspaces/${workspaceId}/suppliers`)
  },

  async createWorkspaceSupplier(workspaceId: string, data: SupplierPayload): Promise<ManagedSupplier> {
    return api.post<ManagedSupplier>(`/admin/workspaces/${workspaceId}/suppliers`, data)
  },

  async updateWorkspaceSupplier(workspaceId: string, supplierId: string, data: SupplierPayload): Promise<ManagedSupplier> {
    return api.put<ManagedSupplier>(`/admin/workspaces/${workspaceId}/suppliers/${supplierId}`, data)
  },

  async disableWorkspaceSupplier(workspaceId: string, supplierId: string): Promise<ManagedSupplier> {
    return api.post<ManagedSupplier>(`/admin/workspaces/${workspaceId}/suppliers/${supplierId}/disable`, {})
  },

  async enableWorkspaceSupplier(workspaceId: string, supplierId: string): Promise<ManagedSupplier> {
    return api.post<ManagedSupplier>(`/admin/workspaces/${workspaceId}/suppliers/${supplierId}/enable`, {})
  },

  async removeWorkspaceSupplier(workspaceId: string, supplierId: string): Promise<void> {
    return api.delete<void>(`/admin/workspaces/${workspaceId}/suppliers/${supplierId}`)
  },

  async adminStockIn(workspaceId: string, data: StockAdjustmentPayload): Promise<ManagedInventoryItem> {
    return api.post<ManagedInventoryItem>(`/admin/workspaces/${workspaceId}/stock-in`, data)
  },

  async adminStockOut(workspaceId: string, data: StockAdjustmentPayload): Promise<ManagedInventoryItem> {
    return api.post<ManagedInventoryItem>(`/admin/workspaces/${workspaceId}/stock-out`, data)
  },

  async adminStockTransfer(workspaceId: string, data: StockAdjustmentPayload & { to_warehouse_id: string }): Promise<unknown> {
    return api.post<unknown>(`/admin/workspaces/${workspaceId}/stock-transfer`, data)
  },

  async getScheduledActivities(workspaceId: string): Promise<ScheduledActivity[]> {
    return api.get<ScheduledActivity[]>(`/admin/workspaces/${workspaceId}/scheduled-activities`)
  },

  async createScheduledActivity(workspaceId: string, data: Partial<ScheduledActivity>): Promise<ScheduledActivity> {
    return api.post<ScheduledActivity>(`/admin/workspaces/${workspaceId}/scheduled-activities`, data)
  },

  async updateScheduledActivity(workspaceId: string, activityId: string, data: Partial<ScheduledActivity>): Promise<ScheduledActivity> {
    return api.put<ScheduledActivity>(`/admin/workspaces/${workspaceId}/scheduled-activities/${activityId}`, data)
  },

  async disableScheduledActivity(workspaceId: string, activityId: string): Promise<ScheduledActivity> {
    return api.post<ScheduledActivity>(`/admin/workspaces/${workspaceId}/scheduled-activities/${activityId}/disable`, {})
  },

  async enableScheduledActivity(workspaceId: string, activityId: string): Promise<ScheduledActivity> {
    return api.post<ScheduledActivity>(`/admin/workspaces/${workspaceId}/scheduled-activities/${activityId}/enable`, {})
  },

  async removeScheduledActivity(workspaceId: string, activityId: string): Promise<void> {
    return api.delete<void>(`/admin/workspaces/${workspaceId}/scheduled-activities/${activityId}`)
  },

  async updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace> {
    return api.put<Workspace>(`/admin/workspaces/${id}`, data)
  },

  async suspendWorkspace(id: string): Promise<Workspace> {
    return api.post<Workspace>(`/admin/workspaces/${id}/suspend`, {})
  },

  async activateWorkspace(id: string): Promise<Workspace> {
    return api.post<Workspace>(`/admin/workspaces/${id}/activate`, {})
  },

  async getAllSubscriptions(filters: { page?: number; q?: string; plan?: string; status?: string; workspace_id?: string } = {}): Promise<PaginatedResponse<Subscription>> {
    return api.get<PaginatedResponse<Subscription>>(`/admin/subscriptions?${params({ page: filters.page ?? 1, q: filters.q, plan: filters.plan, status: filters.status, workspace_id: filters.workspace_id })}`)
  },

  async getSubscriptions(workspaceId: string): Promise<Subscription[]> {
    return api.get<Subscription[]>(`/admin/workspaces/${workspaceId}/subscriptions`)
  },

  async changePlan(workspaceId: string, packageCode: string, billingCycle: BillingCycle = 'monthly'): Promise<Subscription> {
    return api.post<Subscription>(`/admin/workspaces/${workspaceId}/subscriptions/change-plan`, { package_code: packageCode, billing_cycle: billingCycle })
  },

  async updateSubscriptionPeriod(workspaceId: string, subscriptionId: string, data: { current_period_start?: string; current_period_end: string; status?: SubscriptionStatus; reason?: string }): Promise<Subscription> {
    return api.put<Subscription>(`/admin/workspaces/${workspaceId}/subscriptions/${subscriptionId}/period`, data)
  },

  async cancelSubscription(workspaceId: string): Promise<Subscription> {
    return api.post<Subscription>(`/admin/workspaces/${workspaceId}/subscriptions/cancel`, {})
  },

  async getAllAuditLogs(filters: { page?: number; q?: string; category?: string; action?: string; workspace_id?: string } = {}): Promise<PaginatedResponse<AuditLog>> {
    return api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params({ page: filters.page ?? 1, q: filters.q, category: filters.category, action: filters.action, workspace_id: filters.workspace_id })}`)
  },

  async getAuditLogs(workspaceId: string, page = 1, filters?: { user_id?: string; action?: string }): Promise<PaginatedResponse<AuditLog>> {
    const search = params({ page, user_id: filters?.user_id, action: filters?.action })
    return api.get<PaginatedResponse<AuditLog>>(`/admin/workspaces/${workspaceId}/audit-logs?${search}`)
  },

  async getSystemSettings(): Promise<SystemSetting[]> {
    return api.get<SystemSetting[]>('/admin/settings')
  },

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    return api.put<SystemSetting>(`/admin/settings/${key}`, { value })
  },

  async getDashboardStats(filters: { range?: string; from?: string; to?: string } = {}): Promise<DashboardStats> {
    return api.get<DashboardStats>(`/admin/dashboard/stats?${params({ range: filters.range, from: filters.from, to: filters.to })}`)
  },

  async getBillingRequests(filters: { page?: number; q?: string; status?: string; type?: string; workspace_id?: string } = {}): Promise<PaginatedResponse<BillingRequest>> {
    return api.get<PaginatedResponse<BillingRequest>>(`/admin/billing-requests?${params({ page: filters.page ?? 1, q: filters.q, status: filters.status, type: filters.type, workspace_id: filters.workspace_id })}`)
  },

  async getBillingRequest(id: string): Promise<BillingRequest> {
    return api.get<BillingRequest>(`/admin/billing-requests/${id}`)
  },

  async approveBillingRequest(id: string, data: { notes?: string; approved_amount?: number; promotional_amount?: number; approved_activation_date?: string | null; temporary_access_until?: string | null; classification?: CustomizationClassification }): Promise<BillingRequest> {
    return api.post<BillingRequest>(`/admin/billing-requests/${id}/approve`, data)
  },

  async rejectBillingRequest(id: string, data: { notes?: string; rejection_reason?: string; classification?: CustomizationClassification }): Promise<BillingRequest> {
    return api.post<BillingRequest>(`/admin/billing-requests/${id}/reject`, data)
  },

  async getPackages(status?: CatalogStatus): Promise<PlanPackage[]> {
    return api.get<PlanPackage[]>(`/admin/packages?${params({ status })}`)
  },

  async createPackage(data: Partial<PlanPackage> & { code: string; name: string }): Promise<PlanPackage> {
    return api.post<PlanPackage>('/admin/packages', data)
  },

  async updatePackage(id: string, data: Partial<PlanPackage>): Promise<PlanPackage> {
    return api.put<PlanPackage>(`/admin/packages/${id}`, data)
  },

  async archivePackage(id: string): Promise<PlanPackage> {
    return api.post<PlanPackage>(`/admin/packages/${id}/archive`, {})
  },

  async restorePackage(id: string): Promise<PlanPackage> {
    return api.post<PlanPackage>(`/admin/packages/${id}/restore`, {})
  },

  async deletePackage(id: string): Promise<void> {
    return api.delete<void>(`/admin/packages/${id}`)
  },

  async getAddons(status?: CatalogStatus): Promise<Addon[]> {
    return api.get<Addon[]>(`/admin/addons?${params({ status })}`)
  },

  async createAddon(data: Partial<Addon> & { code: string; name: string }): Promise<Addon> {
    return api.post<Addon>('/admin/addons', data)
  },

  async updateAddon(id: string, data: Partial<Addon>): Promise<Addon> {
    return api.put<Addon>(`/admin/addons/${id}`, data)
  },

  async archiveAddon(id: string): Promise<Addon> {
    return api.post<Addon>(`/admin/addons/${id}/archive`, {})
  },

  async restoreAddon(id: string): Promise<Addon> {
    return api.post<Addon>(`/admin/addons/${id}/restore`, {})
  },

  async deleteAddon(id: string): Promise<void> {
    return api.delete<void>(`/admin/addons/${id}`)
  },

  async getWorkspaceAddons(workspaceId: string): Promise<WorkspaceAddon[]> {
    return api.get<WorkspaceAddon[]>(`/admin/workspaces/${workspaceId}/addons`)
  },

  async assignWorkspaceAddon(workspaceId: string, data: { addon_id?: string; addon_code?: string; billing_cycle?: BillingCycle; quantity?: number; current_period_start?: string; current_period_end?: string | null }): Promise<WorkspaceAddon> {
    return api.post<WorkspaceAddon>(`/admin/workspaces/${workspaceId}/addons`, data)
  },

  async cancelWorkspaceAddon(workspaceId: string, assignmentId: string): Promise<WorkspaceAddon> {
    return api.post<WorkspaceAddon>(`/admin/workspaces/${workspaceId}/addons/${assignmentId}/cancel`, {})
  },

  async runSubscriptionLifecycle(): Promise<{ expired: number; reminders: number }> {
    return api.post<{ expired: number; reminders: number }>('/admin/subscriptions/lifecycle/run', {})
  },
}

export default adminService
