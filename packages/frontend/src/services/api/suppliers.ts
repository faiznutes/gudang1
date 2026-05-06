import api from './client'

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export type SupplierPayload = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    return api.get<Supplier[]>('/suppliers')
  },

  async createSupplier(data: SupplierPayload, idempotencyKey: string): Promise<Supplier> {
    return api.postWithIdempotency<Supplier>('/suppliers', data, idempotencyKey)
  },

  async updateSupplier(id: string, data: Partial<SupplierPayload>): Promise<Supplier> {
    return api.put<Supplier>(`/suppliers/${id}`, data)
  },

  async deleteSupplier(id: string): Promise<void> {
    return api.delete<void>(`/suppliers/${id}`)
  },
}

export default supplierService
