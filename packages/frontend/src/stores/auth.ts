import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTrialStore } from './trial'
import { authService, type EntitlementResponse } from '@/services/api/auth'
import { billingService } from '@/services/api/billing'
import { useEntitlementsStore } from './entitlements'

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
  status?: 'active' | 'suspended' | 'trial'
  trial_ends_at?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const workspace = ref<Workspace | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const initialized = ref(false)
  const trialStore = useTrialStore()
  const entitlementsStore = useEntitlementsStore()

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isTrial = computed(() => entitlementsStore.isTrial || trialStore.isTrial)

  function applySession(data: { token?: string; user: User; workspace: Workspace; entitlements?: EntitlementResponse }) {
    user.value = data.user
    workspace.value = data.workspace
    if (data.token) {
      token.value = data.token
      localStorage.setItem('token', data.token)
    }
    if (data.entitlements) {
      entitlementsStore.setEntitlements(data.entitlements)
    }
  }

  async function login(email: string, password: string) {
    const session = await authService.login({ email, password })
    applySession(session)
  }

  async function trialSignup(name: string, email: string, password: string) {
    const session = await authService.register({
      name,
      email,
      password,
      password_confirmation: password,
      trial: true,
    })
    applySession(session)
    trialStore.startTrial()
  }

  async function register(name: string, email: string, password: string, plan: PlanType = 'free') {
    const session = await authService.register({
      name,
      email,
      password,
      password_confirmation: password,
      plan,
    })
    applySession(session)
  }

  async function upgradePlan(plan: PlanType) {
    const entitlements = await billingService.changePlan(plan)
    entitlementsStore.setEntitlements(entitlements)
    if (workspace.value) {
      workspace.value.plan = plan
      workspace.value.status = 'active'
      workspace.value.trial_ends_at = null
    }
    if (trialStore.isTrial) {
      trialStore.endTrial()
    }
  }

  async function refreshSession() {
    if (!token.value) return
    const session = await authService.getCurrentSession()
    applySession(session)
  }

  async function initAuth() {
    if (initialized.value) return
    initialized.value = true
    if (!token.value) return
    try {
      await refreshSession()
      trialStore.initTrial()
    } catch {
      logout()
    }
  }

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', token.value)
  }

  function logout() {
    authService.logout().catch(() => {})
    user.value = null
    workspace.value = null
    token.value = null
    initialized.value = false
    entitlementsStore.reset()
    localStorage.removeItem('token')
  }

  return {
    user,
    workspace,
    token,
    initialized,
    isAuthenticated,
    isAdmin,
    isStaff,
    isSuperAdmin,
    isTrial,
    login,
    register,
    trialSignup,
    upgradePlan,
    refreshSession,
    setToken,
    logout,
    initAuth,
  }
})
