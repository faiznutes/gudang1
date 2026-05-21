import api from './client'

export interface Category {
  id: string
  name: string
  description?: string
  disabled_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category_id: string
  category?: Category
  min_stock: number
  price: number
  disabled_at?: string | null
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: string
  name: string
  address?: string
  is_default: boolean
  disabled_at?: string | null
  created_at: string
}

export interface InventoryItem {
  id: string
  product_id: string
  product?: Product
  warehouse_id: string
  warehouse?: Warehouse
  quantity: number
  updated_at: string
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
  category_id: string
  min_stock: number
  price: number
}

export interface CreateWarehouseRequest {
  name: string
  address?: string
}

export interface BulkActionResponse {
  ok: true
  count: number
}

export interface StockMovementRequest {
  product_id: string
  warehouse_id: string
  quantity: number
  notes?: string
  type: 'in' | 'out'
}

export const inventoryService = {
  async getProducts(): Promise<Product[]> {
    return api.get<Product[]>('/products')
  },

  async getProduct(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`)
  },

  async createProduct(data: CreateProductRequest): Promise<Product> {
    return api.postWithIdempotency<Product>('/products', data, crypto.randomUUID())
  },

  async updateProduct(id: string, data: Partial<CreateProductRequest>): Promise<Product> {
    return api.put<Product>(`/products/${id}`, data)
  },

  async deleteProduct(id: string): Promise<void> {
    return api.delete<void>(`/products/${id}`)
  },

  async archiveProduct(id: string): Promise<Product> {
    return api.post<Product>(`/products/${id}/archive`, {})
  },

  async restoreProduct(id: string): Promise<Product> {
    return api.post<Product>(`/products/${id}/restore`, {})
  },

  async bulkArchiveProducts(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/products/bulk-archive', { ids })
  },

  async bulkRestoreProducts(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/products/bulk-restore', { ids })
  },

  async getCategories(status: 'active' | 'archived' | 'all' = 'all'): Promise<Category[]> {
    if (status === 'all') return api.get<Category[]>('/categories')
    return api.get<Category[]>(`/categories?status=${status}`)
  },

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    return api.post<Category>('/categories', data)
  },

  async updateCategory(id: string, data: Pick<Category, 'name' | 'description'>): Promise<Category> {
    return api.put<Category>(`/categories/${id}`, data)
  },

  async archiveCategory(id: string): Promise<Category> {
    return api.post<Category>(`/categories/${id}/archive`, {})
  },

  async restoreCategory(id: string): Promise<Category> {
    return api.post<Category>(`/categories/${id}/restore`, {})
  },

  async mergeCategory(id: string, targetCategoryId: string): Promise<Category> {
    return api.post<Category>(`/categories/${id}/merge`, { target_category_id: targetCategoryId })
  },

  async bulkArchiveCategories(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/categories/bulk-archive', { ids })
  },

  async bulkRestoreCategories(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/categories/bulk-restore', { ids })
  },

  async getWarehouses(): Promise<Warehouse[]> {
    return api.get<Warehouse[]>('/warehouses')
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    return api.get<Warehouse>(`/warehouses/${id}`)
  },

  async createWarehouse(data: CreateWarehouseRequest): Promise<Warehouse> {
    return api.postWithIdempotency<Warehouse>('/warehouses', data, crypto.randomUUID())
  },

  async updateWarehouse(id: string, data: Partial<CreateWarehouseRequest>): Promise<Warehouse> {
    return api.put<Warehouse>(`/warehouses/${id}`, data)
  },

  async deleteWarehouse(id: string): Promise<void> {
    return api.delete<void>(`/warehouses/${id}`)
  },

  async archiveWarehouse(id: string): Promise<Warehouse> {
    return api.post<Warehouse>(`/warehouses/${id}/archive`, {})
  },

  async restoreWarehouse(id: string): Promise<Warehouse> {
    return api.post<Warehouse>(`/warehouses/${id}/restore`, {})
  },

  async bulkArchiveWarehouses(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/warehouses/bulk-archive', { ids })
  },

  async bulkRestoreWarehouses(ids: string[]): Promise<BulkActionResponse> {
    return api.post<BulkActionResponse>('/warehouses/bulk-restore', { ids })
  },

  async getInventory(warehouseId?: string): Promise<InventoryItem[]> {
    const params = warehouseId ? `?warehouse_id=${warehouseId}` : ''
    return api.get<InventoryItem[]>(`/inventory${params}`)
  },

  async stockIn(data: Omit<StockMovementRequest, 'type'>): Promise<InventoryItem> {
    return api.postWithIdempotency<InventoryItem>('/stock-in', data, crypto.randomUUID())
  },

  async stockOut(data: Omit<StockMovementRequest, 'type'>): Promise<InventoryItem> {
    return api.postWithIdempotency<InventoryItem>('/stock-out', data, crypto.randomUUID())
  },

  async stockTransfer(data: Omit<StockMovementRequest, 'type'> & { to_warehouse_id: string }): Promise<unknown> {
    return api.postWithIdempotency('/stock-transfer', data, crypto.randomUUID())
  },

  async getLowStockProducts(): Promise<Product[]> {
    return api.get<Product[]>('/products/low-stock')
  },
}

export default inventoryService
