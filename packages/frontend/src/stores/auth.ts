import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type UserRole = 'admin' | 'staff' | 'supplier'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Workspace {
  id: string
  name: string
  plan: 'starter' | 'growth' | 'pro' | 'custom'
  logo?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const workspace = ref<Workspace | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')

  function login(email: string, _password: string) {
    const mockUser: User = {
      id: '1',
      name: 'Admin User',
      email,
      role: 'admin',
    }
    const mockWorkspace: Workspace = {
      id: 'ws-1',
      name: 'Toko Saya',
      plan: 'starter',
    }
    user.value = mockUser
    workspace.value = mockWorkspace
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('token', token.value)
  }

  function register(name: string, email: string, _password: string) {
    const mockUser: User = {
      id: '1',
      name,
      email,
      role: 'admin',
    }
    const mockWorkspace: Workspace = {
      id: 'ws-1',
      name: `${name}'s Workspace`,
      plan: 'starter',
    }
    user.value = mockUser
    workspace.value = mockWorkspace
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('token', token.value)
  }

  function logout() {
    user.value = null
    workspace.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  function initAuth() {
    if (token.value) {
      user.value = {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      }
      workspace.value = {
        id: 'ws-1',
        name: 'Toko Saya',
        plan: 'starter',
      }
    }
  }

  return {
    user,
    workspace,
    token,
    isAuthenticated,
    isAdmin,
    isStaff,
    login,
    register,
    logout,
    initAuth,
  }
})