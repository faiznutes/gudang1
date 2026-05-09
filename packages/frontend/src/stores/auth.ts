import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTrialStore } from './trial'
import { authService, type EntitlementResponse, type SessionPolicy } from '@/services/api/auth'
import { billingService } from '@/services/api/billing'
import { useEntitlementsStore } from './entitlements'
import { clearApiCache } from '@/services/offlineQueue'

export type UserRole = 'admin' | 'staff' | 'supplier' | 'super_admin' | 'trial'
export type PlanType = 'free' | 'starter' | 'growth' | 'pro' | 'custom'
const OFFLINE_SESSION_KEY = 'stockpilot:last-session'
const ACTIVE_WORKSPACE_KEY = 'active_workspace_id'

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
  const platformRole = ref<UserRole | null>((localStorage.getItem('platform_role') as UserRole | null) ?? null)
  const workspaceRole = ref<UserRole | null>((localStorage.getItem('workspace_role') as UserRole | null) ?? null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const initialized = ref(false)
  const activitySessionExpiresAt = ref<string | null>(localStorage.getItem('activity_session_expires_at'))
  const sessionPolicy = ref<SessionPolicy>({ timeout_minutes: null, lock_actions_after_expiry: false })
  const sessionTick = ref(Date.now())
  let countdownTimer: number | null = null
  const trialStore = useTrialStore()
  const entitlementsStore = useEntitlementsStore()

  type SessionSnapshot = {
    user: User
    platform_role?: UserRole
    workspace_role?: UserRole
    workspace: Workspace
    entitlements?: EntitlementResponse
    activity_session_expires_at?: string | null
    session_policy?: SessionPolicy
  }

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => (workspaceRole.value ?? user.value?.role) === 'admin')
  const isStaff = computed(() => (workspaceRole.value ?? user.value?.role) === 'staff')
  const isSuperAdmin = computed(() => (platformRole.value ?? user.value?.role) === 'super_admin')
  const isTrial = computed(() => entitlementsStore.isTrial)
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

  function cacheSession(data: SessionSnapshot) {
    localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify({
      user: data.user,
      platform_role: data.platform_role,
      workspace_role: data.workspace_role,
      workspace: data.workspace,
      entitlements: data.entitlements,
      activity_session_expires_at: data.activity_session_expires_at,
      session_policy: data.session_policy,
    }))
  }

  function getCachedSession(): SessionSnapshot | null {
    const cached = localStorage.getItem(OFFLINE_SESSION_KEY)
    if (!cached) return null
    try {
      return JSON.parse(cached) as SessionSnapshot
    } catch {
      localStorage.removeItem(OFFLINE_SESSION_KEY)
      return null
    }
  }

  function canUseOfflineSessionFallback(error: unknown) {
    if (!token.value) return false
    if (!navigator.onLine) return true
    return error instanceof TypeError
  }

  function applySession(data: { token?: string; user: User; platform_role?: UserRole; workspace_role?: UserRole; workspace: Workspace; entitlements?: EntitlementResponse; activity_session_expires_at?: string | null; session_policy?: SessionPolicy }) {
    user.value = data.user
    workspace.value = data.workspace
    platformRole.value = data.platform_role ?? data.user.role
    workspaceRole.value = data.workspace_role ?? data.user.role
    if (data.token) {
      token.value = data.token
      localStorage.setItem('token', data.token)
    }
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, data.workspace.id)
    if (platformRole.value) localStorage.setItem('platform_role', platformRole.value)
    if (workspaceRole.value) localStorage.setItem('workspace_role', workspaceRole.value)
    if (data.entitlements) {
      entitlementsStore.setEntitlements(data.entitlements)
      if (data.entitlements.subscriptionStatus === 'trialing') {
        trialStore.syncTrialWindow(data.entitlements.subscriptionStartsAt, data.entitlements.trialEndsAt)
      } else {
        trialStore.endTrial()
      }
    }
    const nextPolicy = data.session_policy ?? sessionPolicy.value
    activitySessionExpiresAt.value = nextPolicy.lock_actions_after_expiry
      ? data.activity_session_expires_at ?? activitySessionExpiresAt.value
      : null
    sessionPolicy.value = nextPolicy
    if (activitySessionExpiresAt.value) {
      localStorage.setItem('activity_session_expires_at', activitySessionExpiresAt.value)
      startCountdown()
    } else {
      localStorage.removeItem('activity_session_expires_at')
      stopCountdown()
    }
    cacheSession(data)
  }

  async function login(email: string, password: string) {
    const session = await authService.login({ email, password })
    await clearApiCache().catch(() => {})
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
    await clearApiCache().catch(() => {})
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
    await clearApiCache().catch(() => {})
    applySession(session)
  }

  async function upgradePlan(plan: string) {
    return billingService.changePlan(plan)
  }

  async function refreshSession() {
    if (!token.value) return
    try {
      const session = await authService.getCurrentSession()
      applySession(session)
    } catch (error) {
      const cachedSession = getCachedSession()
      if (cachedSession && canUseOfflineSessionFallback(error)) {
        applySession(cachedSession)
        return
      }
      throw error
    }
  }

  async function switchWorkspace(workspaceId: string) {
    const session = await authService.switchWorkspace(workspaceId)
    await clearApiCache().catch(() => {})
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
    platformRole.value = null
    workspaceRole.value = null
    token.value = null
    initialized.value = false
    activitySessionExpiresAt.value = null
    sessionPolicy.value = { timeout_minutes: null, lock_actions_after_expiry: false }
    stopCountdown()
    entitlementsStore.reset()
    localStorage.removeItem('token')
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
    localStorage.removeItem('platform_role')
    localStorage.removeItem('workspace_role')
    localStorage.removeItem('activity_session_expires_at')
    localStorage.removeItem(OFFLINE_SESSION_KEY)
    clearApiCache().catch(() => {})
  }

  return {
    user,
    workspace,
    platformRole,
    workspaceRole,
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
    switchWorkspace,
    setToken,
    logout,
    initAuth,
  }
})
