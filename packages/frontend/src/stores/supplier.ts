import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  created_at: string
}

export const useSupplierStore = defineStore('supplier', () => {
  const suppliers = ref<Supplier[]>([
    {
      id: 's1',
      name: 'PT Maju Jaya',
      contact_person: 'Budi Santoso',
      phone: '0812-3456-7890',
      email: 'budi@majujaya.com',
      address: 'Jl. Industri Raya No. 15, Jakarta',
      notes: 'Supplier utama untuk produk pakaian',
      created_at: '2024-01-10T10:00:00Z',
    },
    {
      id: 's2',
      name: 'CV Berkah Sejahtera',
      contact_person: 'Siti Aminah',
      phone: '0813-9876-5432',
      email: 'siti@berkahsejahtera.com',
      address: 'Jl. Gatot Subroto No. 25, Bandung',
      notes: 'Supplier aksesoris',
      created_at: '2024-01-12T10:00:00Z',
    },
  ])

  function addSupplier(supplier: Omit<Supplier, 'id' | 'created_at'>) {
    const newSupplier: Supplier = {
      ...supplier,
      id: 's' + Date.now(),
      created_at: new Date().toISOString(),
    }
    suppliers.value.push(newSupplier)
    return newSupplier
  }

  function updateSupplier(id: string, updates: Partial<Supplier>) {
    const index = suppliers.value.findIndex(s => s.id === id)
    if (index !== -1) {
      suppliers.value[index] = { ...suppliers.value[index], ...updates }
      return suppliers.value[index]
    }
    return null
  }

  function deleteSupplier(id: string) {
    const index = suppliers.value.findIndex(s => s.id === id)
    if (index !== -1) {
      suppliers.value.splice(index, 1)
      return true
    }
    return false
  }

  function getSupplierById(id: string) {
    return suppliers.value.find(s => s.id === id)
  }

  return {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
  }
})