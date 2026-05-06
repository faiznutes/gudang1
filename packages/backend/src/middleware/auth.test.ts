import { describe, expect, it } from 'vitest'
import { AppError } from '../lib/errors.js'
import { requireRole, type AuthContext } from './auth.js'

function context(role: AuthContext['role']): AuthContext {
  return {
    userId: 'user-test',
    workspaceId: 'workspace-test',
    role,
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
