import api from './client'
import type { EntitlementResponse } from './auth'
import type { Addon, BillingCycle, PlanPackage } from './admin'

export const billingService = {
  async getPackages(): Promise<PlanPackage[]> {
    return api.get<PlanPackage[]>('/billing/packages')
  },

  async getAddons(): Promise<Addon[]> {
    return api.get<Addon[]>('/billing/addons')
  },

  async changePlan(packageCode: string, billingCycle: Exclude<BillingCycle, 'manual'> = 'monthly'): Promise<EntitlementResponse> {
    return api.post<EntitlementResponse>('/billing/change-plan', { package_code: packageCode, billing_cycle: billingCycle })
  },
}

export default billingService
