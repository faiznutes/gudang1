import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTrialStore } from './trial'
import { authService, type EntitlementResponse, type SessionPolicy } from '@/services/api/auth'
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
  const activitySessionExpiresAt = ref<string | null>(localStorage.getItem('activity_session_expires_at'))
  const sessionPolicy = ref<SessionPolicy>({ timeout_minutes: null, lock_actions_after_expiry: true })
  const sessionTick = ref(Date.now())
  let countdownTimer: number | null = null
  const trialStore = useTrialStore()
  const entitlementsStore = useEntitlementsStore()

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isTrial = computed(() => entitlementsStore.isTrial || trialStore.isTrial)
  const homeRoute = computed(() => isSuperAdmin.value ? '/admin' : '/app')
  const activitySessionRemainingMs = computed(() => {
    if (!activitySessionExpiresAt.value) return null
    return Math.max(0, new Date(activitySessionExpiresAt.value).getTime() - sessionTick.value)
  })
  const isActivitySessionExpired = computed(() => {
    if (isSuperAdmin.value) return false
    if (!sessionPolicy.value.lock_actions_after_expiry || activitySessionRemainingMs.value === null) return false
    return activitySessionRemainingMs.value <= 0
  })
  const activitySessionCountdown = computed(() => {
    const remaining = activitySessionRemainingMs.value
    if (remaining === null) return ''
    const totalSeconds = Math.max(0, Math.floor(remaining / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}j ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}d`
    return `${seconds}d`
  })

  function startCountdown() {
    if (countdownTimer !== null) return
    countdownTimer = window.setInterval(() => {
      sessionTick.value = Date.now()
    }, 1000)
  }

  function stopCountdown() {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  function applySession(data: { token?: string; user: User; workspace: Workspace; entitlements?: EntitlementResponse; activity_session_expires_at?: string | null; session_policy?: SessionPolicy }) {
    user.value = data.user
    workspace.value = data.workspace
    if (data.token) {
      token.value = data.token
      localStorage.setItem('token', data.token)
    }
    if (data.entitlements) {
      entitlementsStore.setEntitlements(data.entitlements)
    }
    activitySessionExpiresAt.value = data.activity_session_expires_at ?? activitySessionExpiresAt.value
    sessionPolicy.value = data.session_policy ?? sessionPolicy.value
    if (activitySessionExpiresAt.value) {
      localStorage.setItem('activity_session_expires_at', activitySessionExpiresAt.value)
      startCountdown()
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
    activitySessionExpiresAt.value = null
    sessionPolicy.value = { timeout_minutes: null, lock_actions_after_expiry: true }
    stopCountdown()
    entitlementsStore.reset()
    localStorage.removeItem('token')
    localStorage.removeItem('activity_session_expires_at')
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
    homeRoute,
    activitySessionExpiresAt,
    sessionPolicy,
    activitySessionRemainingMs,
    activitySessionCountdown,
    isActivitySessionExpired,
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
