import api from './client'

export interface StockMove {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  warehouse_id: string
  warehouse_name: string
  to_warehouse_id?: string
  to_warehouse_name?: string
  type: 'in' | 'out' | 'transfer'
  quantity: number
  notes?: string
  user_id: string
  user_name: string
  created_at: string
}

export const activityService = {
  async getActivities(): Promise<StockMove[]> {
    return api.get<StockMove[]>('/activities')
  },
}

export default activityService
