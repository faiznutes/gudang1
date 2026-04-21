import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Category {
  id: string
  name: string
  description?: string
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
  created_at: string
  updated_at: string
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

export interface Warehouse {
  id: string
  name: string
  address?: string
  is_default: boolean
  created_at: string
}

export const useInventoryStore = defineStore('inventory', () => {
  const products = ref<Product[]>([
    {
      id: 'p1',
      sku: 'SKU-001',
      name: 'Baju Kaos Polos',
      description: 'Baju kaos polos warna putih',
      category_id: 'c1',
      min_stock: 10,
      price: 25000,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'p2',
      sku: 'SKU-002',
      name: 'Celana Jeans Slim',
      description: 'Celana jeans ukuran 30-32',
      category_id: 'c1',
      min_stock: 5,
      price: 150000,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'p3',
      sku: 'SKU-003',
      name: 'Sepatu Sneakers',
      description: 'Sepatu sneakers warna hitam',
      category_id: 'c2',
      min_stock: 3,
      price: 250000,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
  ])

  const categories = ref<Category[]>([
    { id: 'c1', name: 'Pakaian', description: 'Baju, celana, jaket' },
    { id: 'c2', name: 'Sepatu', description: 'Sepatu sneakers, sandals' },
    { id: 'c3', name: 'Aksesoris', description: 'Topi, tas, sabuk' },
  ])

  const warehouses = ref<Warehouse[]>([
    { id: 'w1', name: 'Gudang Utama', address: 'Jl. Merdeka No. 10, Jakarta', is_default: true, created_at: '2024-01-10T10:00:00Z' },
    { id: 'w2', name: 'Gudang Bandung', address: 'Jl. Asia Afrika No. 5, Bandung', is_default: false, created_at: '2024-01-12T10:00:00Z' },
  ])

  const inventory = ref<InventoryItem[]>([
    { id: 'i1', product_id: 'p1', warehouse_id: 'w1', quantity: 50, updated_at: '2024-01-15T10:00:00Z' },
    { id: 'i2', product_id: 'p2', warehouse_id: 'w1', quantity: 20, updated_at: '2024-01-15T10:00:00Z' },
    { id: 'i3', product_id: 'p3', warehouse_id: 'w1', quantity: 8, updated_at: '2024-01-15T10:00:00Z' },
    { id: 'i4', product_id: 'p1', warehouse_id: 'w2', quantity: 30, updated_at: '2024-01-15T10:00:00Z' },
    { id: 'i5', product_id: 'p2', warehouse_id: 'w2', quantity: 15, updated_at: '2024-01-15T10:00:00Z' },
  ])

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

  function addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const newProduct: Product = {
      ...product,
      id: 'p' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    products.value.push(newProduct)
    return newProduct
  }

  function updateProduct(id: string, updates: Partial<Product>) {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value[index] = {
        ...products.value[index],
        ...updates,
        updated_at: new Date().toISOString(),
      }
      return products.value[index]
    }
    return null
  }

  function deleteProduct(id: string) {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value.splice(index, 1)
      inventory.value = inventory.value.filter(i => i.product_id !== id)
      return true
    }
    return false
  }

  function addCategory(category: Omit<Category, 'id'>) {
    const newCategory: Category = {
      ...category,
      id: 'c' + Date.now(),
    }
    categories.value.push(newCategory)
    return newCategory
  }

  function updateCategory(id: string, updates: Partial<Category>) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index !== -1) {
      categories.value[index] = { ...categories.value[index], ...updates }
      return categories.value[index]
    }
    return null
  }

  function deleteCategory(id: string) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index !== -1) {
      categories.value.splice(index, 1)
      return true
    }
    return false
  }

  function addWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at'>) {
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: 'w' + Date.now(),
      created_at: new Date().toISOString(),
    }
    warehouses.value.push(newWarehouse)
    return newWarehouse
  }

  function updateWarehouse(id: string, updates: Partial<Warehouse>) {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index !== -1) {
      warehouses.value[index] = { ...warehouses.value[index], ...updates }
      return warehouses.value[index]
    }
    return null
  }

  function deleteWarehouse(id: string) {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index !== -1) {
      warehouses.value.splice(index, 1)
      return true
    }
    return false
  }

  function updateInventory(productId: string, warehouseId: string, quantity: number) {
    const index = inventory.value.findIndex(i => i.product_id === productId && i.warehouse_id === warehouseId)
    if (index !== -1) {
      inventory.value[index].quantity += quantity
      inventory.value[index].updated_at = new Date().toISOString()
      return inventory.value[index]
    } else {
      const newItem: InventoryItem = {
        id: 'i' + Date.now(),
        product_id: productId,
        warehouse_id: warehouseId,
        quantity,
        updated_at: new Date().toISOString(),
      }
      inventory.value.push(newItem)
      return newItem
    }
  }

  function getLowStockProducts() {
    return productsWithInventory.value.filter(p => p.low_stock)
  }

  return {
    products,
    categories,
    warehouses,
    inventory,
    totalProducts,
    totalWarehouses,
    productsWithInventory,
    getProductById,
    getWarehouseById,
    getInventoryByProductAndWarehouse,
    getInventoryByWarehouse,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    updateInventory,
    getLowStockProducts,
  }
})