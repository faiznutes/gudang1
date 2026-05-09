import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { FEATURE_KEYS, MODULE_CATALOG } from '../../../shared/src/index'

const repoRoot = join(process.cwd(), '..', '..')

const backendPrefixes: Record<string, string> = {
  'activities.ts': '/api',
  'admin.ts': '/api/admin',
  'adminManagement.ts': '/api/admin',
  'adminMonetization.ts': '/api/admin',
  'analytics.ts': '/api',
  'auth.ts': '/api/auth',
  'billing.ts': '/api',
  'entitlements.ts': '/api/me',
  'health.ts': '/api',
  'importExport.ts': '/api',
  'inventory.ts': '/api',
  'notifications.ts': '/api',
  'suppliers.ts': '/api',
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

function backendRoutes() {
  const routesDir = join(repoRoot, 'packages', 'backend', 'src', 'routes')
  const routePattern = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g
  const routes: ApiRoute[] = []

  for (const file of walkFiles(routesDir)) {
    if (file.endsWith('.test.ts')) continue
    const source = readFileSync(file, 'utf8')
    const prefix = backendPrefixes[basename(file)] ?? ''
    for (const match of source.matchAll(routePattern)) {
      routes.push({
        method: match[1].toUpperCase(),
        path: `${prefix}${match[2]}`.replace(/\/+/g, '/'),
        file: rel(file),
        line: lineOf(source, match.index ?? 0),
      })
    }
  }

  return routes
}

function isUnderPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function isTenantProductRoute(route: ApiRoute) {
  if (route.path.startsWith('/api/admin')) return false
  if (route.path === '/api/health') return false
  if ([
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/register',
  ].includes(route.path)) {
    return false
  }
  return true
}

describe('product module contract', () => {
  it('maps every runtime entitlement feature to a product module', () => {
    const mappedFeatures = new Set(
      Object.values(MODULE_CATALOG).flatMap(module => [...module.runtimeFeatureKeys]),
    )

    expect(FEATURE_KEYS.filter(feature => !mappedFeatures.has(feature))).toEqual([])
  })

  it('keeps active tenant routes inside core, premium, or add-on modules', () => {
    const allowedPrefixes = Object.values(MODULE_CATALOG)
      .filter(module => !['postponed', 'never'].includes(module.status))
      .flatMap(module => [...module.tenantRoutePrefixes])

    const unmapped = backendRoutes()
      .filter(isTenantProductRoute)
      .filter(route => !allowedPrefixes.some(prefix => isUnderPrefix(route.path, prefix)))

    expect(unmapped.map(route => `${route.method} ${route.path} (${route.file}:${route.line})`)).toEqual([])
  })

  it('does not expose postponed or never modules as active tenant routes', () => {
    const blockedPrefixes = Object.values(MODULE_CATALOG)
      .filter(module => ['postponed', 'never'].includes(module.status))
      .flatMap(module => [...module.tenantRoutePrefixes])

    const exposed = backendRoutes()
      .filter(isTenantProductRoute)
      .filter(route => blockedPrefixes.some(prefix => isUnderPrefix(route.path, prefix)))

    expect(exposed.map(route => `${route.method} ${route.path}`)).toEqual([])
  })
})
