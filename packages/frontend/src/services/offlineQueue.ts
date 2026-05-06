type OfflineStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'needs_review'
type OfflineOperationType = 'stock-in' | 'stock-out' | 'stock-transfer' | 'product.create' | 'supplier.create'

export interface OfflineQueueSummary {
  pending: number
  syncing: number
  synced: number
  failed: number
  needs_review: number
  total: number
}

export interface OfflineOperation {
  id: string
  type: OfflineOperationType
  endpoint: string
  method: 'POST'
  payload: unknown
  idempotencyKey: string
  status: OfflineStatus
  error?: string
  createdAt: string
  updatedAt: string
}

const DB_NAME = 'stockpilot-offline'
const DB_VERSION = 1
const STORE_NAME = 'queue'
const POPUP_DISMISSED_KEY = 'stockpilot:pwa-popup-dismissed-date'
const LAST_CACHE_REFRESH_KEY = 'stockpilot:last-cache-refresh-at'
const DAILY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

export const CACHE_REFRESH_ENDPOINTS = [
  '/me/entitlements',
  '/products',
  '/categories',
  '/warehouses',
  '/inventory',
  '/suppliers',
  '/activities',
  '/admin/dashboard/stats',
]

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function openDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await openDb()
  return new Promise<T | void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = callback(store)
    if (request) {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } else {
      transaction.oncomplete = () => resolve(undefined)
    }
    transaction.onerror = () => reject(transaction.error)
  }).finally(() => db.close())
}

export function isOfflineError(error: unknown) {
  return !navigator.onLine || error instanceof TypeError
}

export async function enqueueOfflineOperation(input: Omit<OfflineOperation, 'id' | 'idempotencyKey' | 'status' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const operation: OfflineOperation = {
    ...input,
    id: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  await withStore('readwrite', store => store.add(operation))
  return operation
}

export async function getOfflineQueue(): Promise<OfflineOperation[]> {
  const result = await withStore<OfflineOperation[]>('readonly', store => store.getAll())
  return ((result as OfflineOperation[] | undefined) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getOfflineQueueSummary(): Promise<OfflineQueueSummary> {
  const queue = await getOfflineQueue()
  const summary: OfflineQueueSummary = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    needs_review: 0,
    total: queue.length,
  }
  for (const operation of queue) {
    summary[operation.status] += 1
  }
  return summary
}

export function getLastCacheRefreshAt() {
  return localStorage.getItem(LAST_CACHE_REFRESH_KEY)
}

export function shouldRefreshDailyCache() {
  const lastRefresh = getLastCacheRefreshAt()
  if (!lastRefresh) return true
  return Date.now() - new Date(lastRefresh).getTime() >= DAILY_CACHE_MAX_AGE_MS
}

export function markCacheRefreshNow() {
  const now = new Date().toISOString()
  localStorage.setItem(LAST_CACHE_REFRESH_KEY, now)
  return now
}

export function wasPwaPopupDismissedToday() {
  return localStorage.getItem(POPUP_DISMISSED_KEY) === todayKey()
}

export function dismissPwaPopupToday() {
  localStorage.setItem(POPUP_DISMISSED_KEY, todayKey())
}

function postServiceWorkerMessage(message: Record<string, unknown>) {
  const controller = navigator.serviceWorker?.controller
  if (controller) controller.postMessage(message)
}

export async function refreshDailyCache(endpoints = CACHE_REFRESH_ENDPOINTS) {
  if (!navigator.onLine) {
    throw new Error('Cache belum bisa diperbarui saat offline')
  }

  postServiceWorkerMessage({ type: 'REFRESH_DAILY_CACHE', endpoints: endpoints.map(endpoint => `/api${endpoint}`) })

  const token = localStorage.getItem('token')
  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const response = await fetch(`/api${endpoint}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
        cache: 'reload',
      })
      if (!response.ok && ![401, 402, 403, 404].includes(response.status)) {
        throw new Error(`Gagal refresh ${endpoint}`)
      }
      return response.status
    })
  )

  const hasUnexpectedFailure = results.some(result => result.status === 'rejected')
  const refreshedAt = markCacheRefreshNow()
  postServiceWorkerMessage({ type: 'CACHE_REFRESHED', refreshedAt })

  if (hasUnexpectedFailure) {
    throw new Error('Sebagian cache gagal diperbarui')
  }

  return refreshedAt
}

async function updateOperation(operation: OfflineOperation) {
  operation.updatedAt = new Date().toISOString()
  await withStore('readwrite', store => store.put(operation))
}

async function sendOperation(operation: OfflineOperation) {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api${operation.endpoint}`, {
    method: operation.method,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': operation.idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(operation.payload),
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Sinkronisasi gagal' }))
    const apiError = new Error(error.message || 'Sinkronisasi gagal')
    ;(apiError as any).code = error.code
    throw apiError
  }
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) return
  const queue = await getOfflineQueue()
  for (const operation of queue.filter(item => item.status === 'pending' || item.status === 'failed')) {
    operation.status = 'syncing'
    operation.error = undefined
    await updateOperation(operation)
    try {
      await sendOperation(operation)
      operation.status = 'synced'
      await updateOperation(operation)
    } catch (error) {
      const code = (error as any)?.code
      operation.status = code === 'conflict' || code === 'feature_locked' ? 'needs_review' : 'failed'
      operation.error = error instanceof Error ? error.message : 'Sinkronisasi gagal'
      await updateOperation(operation)
    }
  }
}

export function installOfflineSync() {
  window.addEventListener('online', () => {
    syncOfflineQueue().catch(() => {})
  })

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        syncOfflineQueue().catch(() => {})
      }
    })
  }

  if (navigator.onLine) {
    syncOfflineQueue().catch(() => {})
  }
}
