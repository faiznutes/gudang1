import api from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
  workspace_name?: string
  plan?: 'free' | 'starter' | 'growth' | 'pro' | 'custom'
  trial?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'staff' | 'supplier' | 'trial'
  workspace_id?: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  plan: 'free' | 'starter' | 'growth' | 'pro' | 'custom'
  status: 'active' | 'suspended' | 'trial'
  logo?: string
  trial_ends_at?: string | null
  created_at: string
}

export interface EntitlementResponse {
  plan: 'free' | 'starter' | 'growth' | 'pro' | 'custom'
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing' | 'none'
  trialEndsAt: string | null
  subscriptionStartsAt: string | null
  subscriptionEndsAt: string | null
  features: {
    stockInOut: boolean
    multiWarehouse: boolean
    analytics: boolean
    exportPDF: boolean
    batchImport: boolean
    reports: boolean
  }
  limits: {
    warehouses: number
    products: number
    users: number
  }
  usage: {
    warehouses: number
    products: number
    users: number
  }
}

export interface SessionPolicy {
  timeout_minutes: number | null
  lock_actions_after_expiry: boolean
}

export interface AuthResponse {
  user: User
  workspace: Workspace
  token: string
  entitlements: EntitlementResponse
  activity_session_expires_at?: string | null
  session_policy?: SessionPolicy
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', credentials)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data)
  },

  async logout(): Promise<void> {
    return api.post<void>('/auth/logout', {})
  },

  async getCurrentUser(): Promise<User> {
    const session = await this.getCurrentSession()
    return session.user
  },

  async getCurrentSession(): Promise<Omit<AuthResponse, 'token'>> {
    return api.get<Omit<AuthResponse, 'token'>>('/auth/me')
  },

  setToken(token: string): void {
    localStorage.setItem('token', token)
  },

  clearToken(): void {
    localStorage.removeItem('token')
  },

  getToken(): string | null {
    return localStorage.getItem('token')
  },
}

export default authService
