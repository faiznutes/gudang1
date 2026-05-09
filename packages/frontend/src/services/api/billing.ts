import api from './client'
import type { Addon, BillingCycle, BillingRequest, BillingRequestType, PlanPackage } from './admin'

export interface BillingRequestPayload {
  type: BillingRequestType
  package_code?: string
  package_id?: string
  addon_code?: string
  addon_id?: string
  billing_cycle?: Exclude<BillingCycle, 'manual'>
  quantity?: number
  requested_limit_key?: string
  requested_limit_value?: number
  requested_activation_date?: string
  title?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export const billingService = {
  async getPackages(): Promise<PlanPackage[]> {
    return api.get<PlanPackage[]>('/billing/packages')
  },

  async getAddons(): Promise<Addon[]> {
    return api.get<Addon[]>('/billing/addons')
  },

  async getRequests(): Promise<BillingRequest[]> {
    return api.get<BillingRequest[]>('/billing/requests')
  },

  async createRequest(data: BillingRequestPayload): Promise<BillingRequest> {
    return api.post<BillingRequest>('/billing/requests', data)
  },

  async changePlan(packageCode: string, billingCycle: Exclude<BillingCycle, 'manual'> = 'monthly'): Promise<BillingRequest> {
    return api.post<BillingRequest>('/billing/change-plan', { package_code: packageCode, billing_cycle: billingCycle })
  },

  async requestAddon(addonId: string, billingCycle: Exclude<BillingCycle, 'manual'> = 'monthly', quantity = 1): Promise<BillingRequest> {
    return api.post<BillingRequest>('/billing/requests', { type: 'addon_activation', addon_id: addonId, billing_cycle: billingCycle, quantity })
  },
}

export default billingService
