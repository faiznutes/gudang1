import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const repoRoot = join(process.cwd(), '..', '..')

const backendPrefixes: Record<string, string> = {
  'health.ts': '/api',
  'auth.ts': '/api/auth',
  'entitlements.ts': '/api/me',
  'inventory.ts': '/api',
  'suppliers.ts': '/api',
  'activities.ts': '/api',
  'analytics.ts': '/api',
  'billing.ts': '/api',
  'notifications.ts': '/api',
  'importExport.ts': '/api',
  'admin.ts': '/api/admin',
  'adminManagement.ts': '/api/admin',
}

const frontendMethodMap: Record<string, string> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  postWithIdempotency: 'POST',
  download: 'GET',
}

interface ApiRoute {
  method: string
  path: string
  file: string
  line: number
}

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (['node_modules', 'dist', 'test-results'].includes(name)) return []
    return statSync(path).isDirectory() ? walkFiles(path) : [path]
  })
}

function lineOf(source: string, index: number) {
  return source.slice(0, index).split(/\r?\n/).length
}

function rel(path: string) {
  return relative(repoRoot, path).replace(/\\/g, '/')
}

function frontendCalls() {
  const serviceDir = join(repoRoot, 'packages', 'frontend', 'src', 'services', 'api')
  const callPattern = /api\.(get|post|put|delete|patch|postWithIdempotency|download)(?:<[^>]*>)?\s*\(\s*(`([^`]+)`|'([^']+)'|"([^"]+)")/g
  const calls: ApiRoute[] = []

  for (const file of walkFiles(serviceDir)) {
    if (file.endsWith('client.ts') || file.endsWith('index.ts')) continue
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(callPattern)) {
      const rawPath = match[3] ?? match[4] ?? match[5]
      if (!rawPath.startsWith('/')) continue
      calls.push({
        method: frontendMethodMap[match[1]],
        path: rawPath,
        file: rel(file),
        line: lineOf(source, match.index ?? 0),
      })
    }
  }

  return calls
}

function backendRoutes() {
  const routesDir = join(repoRoot, 'packages', 'backend', 'src', 'routes')
  const routePattern = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g
  const routes: ApiRoute[] = []

  for (const file of walkFiles(routesDir)) {
    const source = readFileSync(file, 'utf8')
    const prefix = backendPrefixes[basename(file)] ?? ''
    for (const match of source.matchAll(routePattern)) {
      routes.push({
        method: match[1].toUpperCase(),
        path: `${prefix}${match[2]}`,
        file: rel(file),
        line: lineOf(source, match.index ?? 0),
      })
    }
  }

  return routes
}

function normalize(rawPath: string) {
  let path = rawPath.replace(/^\/api/, '').replace(/\?.*$/, '')
  path = path.replace(/\$\{params}/g, '')
  path = path.replace(/\$\{[^}]+}/g, ':param')
  path = path.replace(/:[A-Za-z0-9_]+/g, ':param')
  path = path.replace(/\/+/g, '/')
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function matches(frontend: ApiRoute, backend: ApiRoute) {
  if (frontend.method !== backend.method) return false
  const frontendParts = normalize(frontend.path).split('/').filter(Boolean)
  const backendParts = normalize(backend.path).split('/').filter(Boolean)
  if (frontendParts.length !== backendParts.length) return false

  return frontendParts.every((part, index) => {
    const backendPart = backendParts[index]
    return part === ':param' || backendPart === ':param' || part === backendPart
  })
}

describe('frontend API route contract', () => {
  it('keeps every frontend service endpoint connected to a backend route', () => {
    const backend = backendRoutes()
    const unmatched = frontendCalls().filter((call) => !backend.some((route) => matches(call, route)))

    expect(unmatched.map((call) => `${call.method} ${call.path} (${call.file}:${call.line})`)).toEqual([])
  })
})
