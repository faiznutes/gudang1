import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { inventoryService, type Category, type Product, type InventoryItem, type Warehouse } from '@/services/api/inventory'
import { enqueueOfflineOperation, isOfflineError } from '@/services/offlineQueue'

export type { Category, Product, InventoryItem, Warehouse }

export const useInventoryStore = defineStore('inventory', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const warehouses = ref<Warehouse[]>([])
  const inventory = ref<InventoryItem[]>([])
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const totalProducts = computed(() => products.value.length)
  const totalWarehouses = computed(() => warehouses.value.length)

  const productsWithInventory = computed(() => {
    return products.value.map(product => {
      const items = inventory.value.filter(inv => inv.product_id === product.id)
      const totalQty = items.reduce((sum, inv) => sum + inv.quantity, 0)
      const lowStock = items.some(inv => inv.quantity <= product.min_stock)
      return {
        ...product,
        total_quantity: totalQty,
        low_stock: lowStock,
        inventory: items,
      }
    })
  })

  function setError(error: unknown) {
    lastError.value = error instanceof Error ? error.message : 'Gagal memuat data inventori'
  }

  async function loadAll() {
    isLoading.value = true
    lastError.value = null
    try {
      const [productData, categoryData, warehouseData, inventoryData] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getCategories(),
        inventoryService.getWarehouses(),
        inventoryService.getInventory(),
      ])
      products.value = productData
      categories.value = categoryData
      warehouses.value = warehouseData
      inventory.value = inventoryData
    } catch (error) {
      setError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function loadInventory(warehouseId?: string) {
    inventory.value = await inventoryService.getInventory(warehouseId)
  }

  function upsertInventoryItem(item: InventoryItem) {
    const index = inventory.value.findIndex(i => i.id === item.id || (i.product_id === item.product_id && i.warehouse_id === item.warehouse_id))
    if (index === -1) inventory.value.push(item)
    else inventory.value[index] = item
  }

  function getProductById(id: string) {
    return products.value.find(p => p.id === id)
  }

  function getWarehouseById(id: string) {
    return warehouses.value.find(w => w.id === id)
  }

  function getInventoryByProductAndWarehouse(productId: string, warehouseId: string) {
    return inventory.value.find(i => i.product_id === productId && i.warehouse_id === warehouseId)
  }

  function getInventoryByWarehouse(warehouseId: string) {
    return inventory.value.filter(i => i.warehouse_id === warehouseId)
  }

  async function addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const payload = {
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      min_stock: product.min_stock,
      price: product.price,
    }
    try {
      const created = await inventoryService.createProduct(payload)
      products.value.unshift(created)
      return created
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOfflineOperation({ type: 'product.create', endpoint: '/products', method: 'POST', payload })
        throw new Error('Produk disimpan sebagai draft offline dan akan disinkronkan saat online')
      }
      throw error
    }
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    const updated = await inventoryService.updateProduct(id, {
      sku: updates.sku,
      name: updates.name,
      description: updates.description,
      category_id: updates.category_id,
      min_stock: updates.min_stock,
      price: updates.price,
    })
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) products.value[index] = updated
    return updated
  }

  async function deleteProduct(id: string) {
    await inventoryService.deleteProduct(id)
    products.value = products.value.filter(p => p.id !== id)
    inventory.value = inventory.value.filter(i => i.product_id !== id)
    return true
  }

  async function addCategory(category: Omit<Category, 'id'>) {
    const created = await inventoryService.createCategory(category)
    categories.value.push(created)
    return created
  }

  async function addWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at'>) {
    const created = await inventoryService.createWarehouse({
      name: warehouse.name,
      address: warehouse.address,
    })
    warehouses.value.push(created)
    return created
  }

  async function updateWarehouse(id: string, updates: Partial<Warehouse>) {
    const updated = await inventoryService.updateWarehouse(id, {
      name: updates.name,
      address: updates.address,
    })
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index !== -1) warehouses.value[index] = updated
    return updated
  }

  async function deleteWarehouse(id: string) {
    await inventoryService.deleteWarehouse(id)
    warehouses.value = warehouses.value.filter(w => w.id !== id)
    inventory.value = inventory.value.filter(i => i.warehouse_id !== id)
    return true
  }

  async function stockIn(data: { product_id: string; warehouse_id: string; quantity: number; notes?: string }) {
    let item: InventoryItem
    try {
      item = await inventoryService.stockIn(data)
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOfflineOperation({ type: 'stock-in', endpoint: '/stock-in', method: 'POST', payload: data })
        throw new Error('Stock masuk disimpan offline dan akan disinkronkan saat online')
      }
      throw error
    }
    upsertInventoryItem(item)
    return item
  }

  async function stockOut(data: { product_id: string; warehouse_id: string; quantity: number; notes?: string }) {
    let item: InventoryItem
    try {
      item = await inventoryService.stockOut(data)
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOfflineOperation({ type: 'stock-out', endpoint: '/stock-out', method: 'POST', payload: data })
        throw new Error('Stock keluar disimpan offline dan akan disinkronkan saat online')
      }
      throw error
    }
    upsertInventoryItem(item)
    return item
  }

  async function stockTransfer(data: { product_id: string; warehouse_id: string; to_warehouse_id: string; quantity: number; notes?: string }) {
    let result: unknown
    try {
      result = await inventoryService.stockTransfer(data)
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOfflineOperation({ type: 'stock-transfer', endpoint: '/stock-transfer', method: 'POST', payload: data })
        throw new Error('Transfer stock disimpan offline dan akan disinkronkan saat online')
      }
      throw error
    }
    await loadInventory()
    return result
  }

  async function updateInventory(productId: string, warehouseId: string, quantity: number) {
    return quantity >= 0
      ? stockIn({ product_id: productId, warehouse_id: warehouseId, quantity })
      : stockOut({ product_id: productId, warehouse_id: warehouseId, quantity: Math.abs(quantity) })
  }

  function getLowStockProducts() {
    return productsWithInventory.value.filter(p => p.low_stock)
  }

  function reset() {
    products.value = []
    categories.value = []
    warehouses.value = []
    inventory.value = []
    lastError.value = null
  }

  return {
    products,
    categories,
    warehouses,
    inventory,
    isLoading,
    lastError,
    totalProducts,
    totalWarehouses,
    productsWithInventory,
    loadAll,
    loadInventory,
    getProductById,
    getWarehouseById,
    getInventoryByProductAndWarehouse,
    getInventoryByWarehouse,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory: addCategory,
    deleteCategory: async () => false,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    stockIn,
    stockOut,
    stockTransfer,
    updateInventory,
    getLowStockProducts,
    reset,
  }
})
