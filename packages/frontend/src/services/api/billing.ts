import api from './client'
import type { EntitlementResponse } from './auth'

export const billingService = {
  async changePlan(plan: 'free' | 'starter' | 'growth' | 'pro' | 'custom'): Promise<EntitlementResponse> {
    return api.post<EntitlementResponse>('/billing/change-plan', { plan })
  },
}

export default billingService
