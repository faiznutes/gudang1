const CACHE_NAME = 'stockpilot-shell-v6'
const API_CACHE = 'stockpilot-api-v4'
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
]

const CACHEABLE_API_PATTERNS = [
  /\/api\/products/,
  /\/api\/categories/,
  /\/api\/warehouses/,
  /\/api\/inventory/,
  /\/api\/suppliers/,
  /\/api\/activities/,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(SHELL_ASSETS.map(async (asset) => {
        try {
          const response = await fetch(asset)
          if (response.ok) {
            await cache.put(asset, response.clone())
          }
        } catch {
          // Ignore individual shell asset failures so the worker still installs safely.
        }
      }))
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => ![CACHE_NAME, API_CACHE].includes(cacheName))
        .map((cacheName) => caches.delete(cacheName))
    ))
  )
  self.clients.claim()
})

function isCacheableApi(request) {
  if (request.method !== 'GET') return false
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(new URL(request.url).pathname))
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE)
  const cacheKey = cacheKeyForRequest(request)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(cacheKey, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(cacheKey)
    if (cached) return cached
    return new Response(JSON.stringify({ code: 'offline', message: 'Data belum tersedia offline' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }
}

function cacheKeyForRequest(request) {
  const url = new URL(request.url)
  const workspaceId = request.headers.get('x-workspace-id') || request.headers.get('x-tenant-id') || 'workspace'
  url.searchParams.set('__workspace_cache_key', workspaceId)
  return new Request(url.toString(), { method: 'GET' })
}

async function shellFallback(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    return await fetch(request)
  } catch {
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('/index.html')
      if (cachedIndex) return cachedIndex
      return new Response('', { status: 503, statusText: 'Network unavailable' })
    }
    return new Response('', { status: 503, statusText: 'Network unavailable' })
  }
}

async function navigationFallback(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
      cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const fallback = await caches.match('/index.html')
    if (fallback) return fallback
    return new Response('Offline', { status: 503 })
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (isCacheableApi(request)) {
    event.respondWith(networkFirst(request))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request))
    return
  }
  if (request.method === 'GET') {
    event.respondWith(shellFallback(request))
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'stockpilot-offline-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }))
      })
    )
  }
})

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  clients.forEach((client) => client.postMessage(message))
}

self.addEventListener('message', (event) => {
  const type = event.data?.type

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (type === 'REFRESH_DAILY_CACHE') {
    event.waitUntil(broadcast({
      type: 'REFRESH_DAILY_CACHE_REQUESTED',
      endpoints: Array.isArray(event.data?.endpoints) ? event.data.endpoints : [],
    }))
    return
  }

  if (type === 'CACHE_REFRESHED') {
    event.waitUntil(broadcast({
      type: 'CACHE_REFRESHED',
      refreshedAt: event.data?.refreshedAt || new Date().toISOString(),
    }))
    return
  }

  if (type === 'CLEAR_API_CACHE') {
    event.waitUntil(caches.delete(API_CACHE))
  }
})
