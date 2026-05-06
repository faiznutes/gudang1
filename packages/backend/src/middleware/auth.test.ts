import { describe, expect, it } from 'vitest'
import { AppError } from '../lib/errors.js'
import { requireActiveSession, requirePlatformRole, requireRole, type AuthContext } from './auth.js'

function context(role: AuthContext['role'], platformRole: AuthContext['platformRole'] = role): AuthContext {
  return {
    userId: 'user-test',
    workspaceId: 'workspace-test',
    role,
    platformRole,
    sessionExpiresAt: new Date(Date.now() + 60_000),
  }
}

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
