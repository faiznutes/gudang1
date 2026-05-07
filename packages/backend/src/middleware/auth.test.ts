import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors.js'
import { requireActiveSession, requireAuth, requirePlatformRole, requireRole, requireTenantRole, resolveTenantWorkspaceId, type AuthContext } from './auth.js'

function context(role: AuthContext['role'], platformRole: AuthContext['platformRole'] = role): AuthContext {
  return {
    userId: 'user-test',
    workspaceId: 'workspace-test',
    tokenWorkspaceId: 'workspace-test',
    tenantSource: 'token',
    role,
    platformRole,
    sessionExpiresAt: new Date(Date.now() + 60_000),
  }
}

describe('resolveTenantWorkspaceId', () => {
  it('uses token workspace when no tenant header is sent', () => {
    expect(resolveTenantWorkspaceId({}, 'workspace-token')).toEqual({
      workspaceId: 'workspace-token',
      source: 'token',
    })
  })

  it('uses X-Workspace-Id as the active tenant context', () => {
    expect(resolveTenantWorkspaceId({ 'x-workspace-id': 'workspace-active' }, 'workspace-token')).toEqual({
      workspaceId: 'workspace-active',
      source: 'header',
    })
  })

  it('accepts X-Tenant-Id as an alias for path/subdomain integrations', () => {
    expect(resolveTenantWorkspaceId({ 'x-tenant-id': 'workspace-tenant' }, 'workspace-token')).toEqual({
      workspaceId: 'workspace-tenant',
      source: 'header',
    })
  })

  it('rejects conflicting tenant headers', () => {
    expect(() => resolveTenantWorkspaceId({
      'x-workspace-id': 'workspace-a',
      'x-tenant-id': 'workspace-b',
    }, 'workspace-token')).toThrow(AppError)
  })
})

describe('requireAuth tenant context', () => {
  const membership = {
    userId: 'user-test',
    workspaceId: 'workspace-active',
    role: 'admin',
    user: { role: 'admin', disabledAt: null },
    workspace: { status: 'active' },
  }

  function appFor(payload: { sub?: string; workspaceId?: string; sessionExpiresAt?: string }, resolvedMembership: unknown = membership) {
    return {
      jwt: { verify: vi.fn(() => payload) },
      prisma: {
        workspaceMember: {
          findUnique: vi.fn().mockResolvedValue(resolvedMembership),
        },
      },
    } as any
  }

  it('scopes the request to the explicit active tenant header after membership validation', async () => {
    const app = appFor({ sub: 'user-test', workspaceId: 'workspace-token' })
    const ctx = await requireAuth(app, {
      headers: {
        authorization: 'Bearer test-token',
        'x-workspace-id': 'workspace-active',
      },
    } as any)

    expect(app.prisma.workspaceMember.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_workspaceId: {
          userId: 'user-test',
          workspaceId: 'workspace-active',
        },
      },
    }))
    expect(ctx.workspaceId).toBe('workspace-active')
    expect(ctx.tokenWorkspaceId).toBe('workspace-token')
    expect(ctx.tenantSource).toBe('header')
  })

  it('rejects an active tenant header that is not accessible to the user', async () => {
    const app = appFor({ sub: 'user-test', workspaceId: 'workspace-token' }, null)
    await expect(requireAuth(app, {
      headers: {
        authorization: 'Bearer test-token',
        'x-workspace-id': 'workspace-other',
      },
    } as any)).rejects.toThrow(AppError)
  })

  it('can ignore tenant headers for platform path-based admin routing', async () => {
    const app = appFor(
      { sub: 'user-test', workspaceId: 'workspace-token' },
      { ...membership, workspaceId: 'workspace-token' },
    )
    const ctx = await requireAuth(app, {
      headers: {
        authorization: 'Bearer test-token',
        'x-workspace-id': 'workspace-active',
      },
    } as any, { tenantHeaderMode: 'ignore' })

    expect(app.prisma.workspaceMember.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_workspaceId: {
          userId: 'user-test',
          workspaceId: 'workspace-token',
        },
      },
    }))
    expect(ctx.workspaceId).toBe('workspace-token')
    expect(ctx.tenantSource).toBe('token')
  })
})

describe('requireRole', () => {
  it('allows super admin to enter platform admin scope', () => {
    expect(() => requireRole(context('super_admin'), ['super_admin'])).not.toThrow()
  })

  it('denies tenant users from platform admin scope', () => {
    expect(() => requireRole(context('admin'), ['super_admin'])).toThrow(AppError)
    expect(() => requireRole(context('staff'), ['super_admin'])).toThrow(AppError)
    expect(() => requireRole(context('trial'), ['super_admin'])).toThrow(AppError)
  })
})

describe('requirePlatformRole', () => {
  it('allows platform super admin even when the workspace role is tenant admin', () => {
    expect(() => requirePlatformRole(context('admin', 'super_admin'), ['super_admin'])).not.toThrow()
  })

  it('denies client admin from platform admin scope', () => {
    expect(() => requirePlatformRole(context('admin', 'admin'), ['super_admin'])).toThrow(AppError)
  })
})

describe('requireTenantRole', () => {
  it('allows tenant operators for warehouse mutations', () => {
    expect(() => requireTenantRole(context('admin'), ['admin', 'staff', 'trial'])).not.toThrow()
    expect(() => requireTenantRole(context('staff'), ['admin', 'staff', 'trial'])).not.toThrow()
    expect(() => requireTenantRole(context('trial'), ['admin', 'staff', 'trial'])).not.toThrow()
  })

  it('keeps supplier users read-only until a supplier workflow exists', () => {
    expect(() => requireTenantRole(context('supplier'), ['admin', 'staff', 'trial'])).toThrow(AppError)
  })
})

describe('requireActiveSession', () => {
  it('allows tenant actions before the activity session expires', () => {
    expect(() => requireActiveSession(context('admin'))).not.toThrow()
  })

  it('blocks tenant actions after the activity session expires', () => {
    const ctx = { ...context('admin'), sessionExpiresAt: new Date(Date.now() - 1000) }
    expect(() => requireActiveSession(ctx)).toThrow(AppError)
  })

  it('does not block platform super admin maintenance actions', () => {
    const ctx = { ...context('admin', 'super_admin'), sessionExpiresAt: new Date(Date.now() - 1000) }
    expect(() => requireActiveSession(ctx)).not.toThrow()
  })
})
