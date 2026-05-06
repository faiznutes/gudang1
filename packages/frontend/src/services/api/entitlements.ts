import api from './client'
import type { EntitlementResponse } from './auth'

export const entitlementService = {
  async getEntitlements(): Promise<EntitlementResponse> {
    return api.get<EntitlementResponse>('/me/entitlements')
  },
}

export default entitlementService
