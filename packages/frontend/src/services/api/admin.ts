import api from './client'

export type AdminPlan = 'free' | 'starter' | 'growth' | 'pro' | 'custom'
export type AdminRole = 'super_admin' | 'admin' | 'staff' | 'supplier' | 'trial'
export type TenantRole = Exclude<AdminRole, 'super_admin'>
export type WorkspaceStatus = 'active' | 'suspended' | 'trial'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing'

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

export interface Subscription {
  id: string
  workspace_id: string
  workspace?: Pick<Workspace, 'id' | 'name' | 'plan' | 'status'>
  plan: AdminPlan
  status: SubscriptionStatus
  amount: number
  billing_cycle: 'monthly'
  current_period_start: string
  current_period_end: string
  next_billing: string | null
  cancel_at_period_end: boolean
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

  async createWorkspaceUser(workspaceId: string, data: { name: string; email: string; password?: string; role: TenantRole }): Promise<WorkspaceUser> {
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

  async changePlan(workspaceId: string, plan: string): Promise<Subscription> {
    return api.post<Subscription>(`/admin/workspaces/${workspaceId}/subscriptions/change-plan`, { plan })
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

  async getDashboardStats(): Promise<DashboardStats> {
    return api.get<DashboardStats>('/admin/dashboard/stats')
  },
}

export default adminService
