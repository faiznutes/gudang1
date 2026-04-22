import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTrialStore } from './trial'

export type UserRole = 'admin' | 'staff' | 'supplier' | 'super_admin' | 'trial'
export type PlanType = 'free' | 'starter' | 'growth' | 'pro' | 'custom'

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
  plan: PlanType
  logo?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const workspace = ref<Workspace | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const trialStore = useTrialStore()

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isTrial = computed(() => trialStore.isTrial)

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
      plan: 'free',
    }
    user.value = mockUser
    workspace.value = mockWorkspace
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('token', token.value)
  }

  function trialSignup(name: string, email: string) {
    const mockUser: User = {
      id: '1',
      name,
      email,
      role: 'trial',
    }
    const mockWorkspace: Workspace = {
      id: 'ws-1',
      name: `${name}'s Workspace`,
      plan: 'pro',
    }
    user.value = mockUser
    workspace.value = mockWorkspace
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('token', token.value)
    trialStore.startTrial()
  }

  function register(name: string, email: string, _password: string, plan: PlanType = 'free') {
    const mockUser: User = {
      id: '1',
      name,
      email,
      role: 'admin',
    }
    const mockWorkspace: Workspace = {
      id: 'ws-1',
      name: `${name}'s Workspace`,
      plan,
    }
    user.value = mockUser
    workspace.value = mockWorkspace
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('token', token.value)
  }

  function upgradePlan(plan: PlanType) {
    if (workspace.value) {
      workspace.value.plan = plan
    }
    if (trialStore.isTrial) {
      trialStore.endTrial()
    }
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
        plan: 'free',
      }
      trialStore.initTrial()
    }
  }

  return {
    user,
    workspace,
    token,
    isAuthenticated,
    isAdmin,
    isStaff,
    isSuperAdmin,
    isTrial,
    login,
    register,
    trialSignup,
    upgradePlan,
    logout,
    initAuth,
  }
})