import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supplierService, type Supplier, type SupplierPayload } from '@/services/api/suppliers'
import { enqueueOfflineOperation, isOfflineError } from '@/services/offlineQueue'

export type { Supplier }

export const useSupplierStore = defineStore('supplier', () => {
  const suppliers = ref<Supplier[]>([])
  const isLoading = ref(false)

  async function loadSuppliers() {
    isLoading.value = true
    try {
      suppliers.value = await supplierService.getSuppliers()
    } finally {
      isLoading.value = false
    }
  }

  async function addSupplier(supplier: SupplierPayload) {
    let created: Supplier
    try {
      created = await supplierService.createSupplier(supplier, crypto.randomUUID())
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOfflineOperation({ type: 'supplier.create', endpoint: '/suppliers', method: 'POST', payload: supplier })
        throw new Error('Supplier disimpan sebagai draft offline dan akan disinkronkan saat online')
      }
      throw error
    }
    suppliers.value.push(created)
    return created
  }

  async function updateSupplier(id: string, updates: Partial<SupplierPayload>) {
    const updated = await supplierService.updateSupplier(id, updates)
    const index = suppliers.value.findIndex(s => s.id === id)
    if (index !== -1) suppliers.value[index] = updated
    return updated
  }

  async function deleteSupplier(id: string) {
    await supplierService.deleteSupplier(id)
    suppliers.value = suppliers.value.filter(s => s.id !== id)
    return true
  }

  async function archiveSupplier(id: string) {
    const archived = await supplierService.archiveSupplier(id)
    const index = suppliers.value.findIndex(supplier => supplier.id === id)
    if (index !== -1) suppliers.value[index] = archived
    return archived
  }

  async function restoreSupplier(id: string) {
    const restored = await supplierService.restoreSupplier(id)
    const index = suppliers.value.findIndex(supplier => supplier.id === id)
    if (index !== -1) suppliers.value[index] = restored
    return restored
  }

  async function bulkArchiveSuppliers(ids: string[]) {
    const result = await supplierService.bulkArchiveSuppliers(ids)
    suppliers.value = suppliers.value.filter(supplier => !ids.includes(supplier.id))
    return result
  }

  async function bulkRestoreSuppliers(ids: string[]) {
    const result = await supplierService.bulkRestoreSuppliers(ids)
    await loadSuppliers()
    return result
  }

  function getSupplierById(id: string) {
    return suppliers.value.find(s => s.id === id)
  }

  function reset() {
    suppliers.value = []
  }

  return {
    suppliers,
    isLoading,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    archiveSupplier,
    restoreSupplier,
    bulkArchiveSuppliers,
    bulkRestoreSuppliers,
    getSupplierById,
    reset,
  }
})
