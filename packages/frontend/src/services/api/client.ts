const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipRefresh?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    return localStorage.getItem('token')
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) return false
      const data = await response.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    })

    if (response.status === 401 && !options.skipRefresh) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        return this.request<T>(endpoint, { ...options, skipRefresh: true })
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      const apiError = new Error(error.message || `HTTP ${response.status}`)
      ;(apiError as any).code = error.code
      ;(apiError as any).details = error.details
      throw apiError
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  async postWithIdempotency<T>(endpoint: string, body: unknown, idempotencyKey: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async download(endpoint: string): Promise<Blob> {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download gagal' }))
      const apiError = new Error(error.message || `HTTP ${response.status}`)
      ;(apiError as any).code = error.code
      throw apiError
    }

    return response.blob()
  }
}

export const api = new ApiClient(API_BASE_URL)
export default api
