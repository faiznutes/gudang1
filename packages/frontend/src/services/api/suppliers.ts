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

export interface BulkActionResponse {
  ok: true
  count: number
}

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

  async archiveSupplier(id: string): Promise<Supplier> {
    return api.post<Supplier>(`/suppliers/${id}/archive`, {})
  },

  async restoreSupplier(id: string): Promise<Supplier> {
    return api.post<Supplier>(`/suppliers/${id}/restore`, {})
  },

  async bulkArchiveSuppliers(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/suppliers/bulk-archive', { ids })
  },

  async bulkRestoreSuppliers(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/suppliers/bulk-restore', { ids })
  },
}

export default supplierService
