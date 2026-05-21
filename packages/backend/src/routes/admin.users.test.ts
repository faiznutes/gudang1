import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: vi.fn(async () => ({
    userId: 'admin-1',
    workspaceId: 'platform-workspace',
    tokenWorkspaceId: 'platform-workspace',
    tenantSource: 'token',
    role: 'super_admin',
    platformRole: 'super_admin',
    sessionExpiresAt: new Date('2026-06-01T00:00:00.000Z'),
  })),
  requirePlatformRole: vi.fn(),
}))

import { adminRoutes } from './admin.js'
import { adminManagementRoutes } from './adminManagement.js'

describe('admin user management', () => {
  let userRecord: {
    id: string
    name: string
    email: string
    role: 'super_admin' | 'admin' | 'staff' | 'supplier' | 'trial'
    disabledAt: Date | null
    createdAt: Date
    memberships: Array<{ workspaceId: string }>
  }

  const prisma = {
    workspaceMember: {
      findMany: vi.fn(async ({ where, include }: any) => {
        if (where?.workspaceId === 'tenant-1') {
          return [
            {
              id: 'member-1',
              userId: 'user-1',
              workspaceId: 'tenant-1',
              role: 'admin',
              user: { ...userRecord },
              workspace: {
                id: 'tenant-1',
                name: 'Tenant Alpha',
                plan: 'pro',
                status: 'active',
                createdAt: new Date('2026-05-01T00:00:00.000Z'),
              },
              createdAt: new Date('2026-05-02T00:00:00.000Z'),
            },
          ]
        }
        if (include) {
          return [
            {
              id: 'member-1',
              userId: 'user-1',
              workspaceId: 'tenant-1',
              role: 'admin',
              user: { ...userRecord },
              workspace: {
                id: 'tenant-1',
                name: 'Tenant Alpha',
                plan: 'pro',
                status: 'active',
                createdAt: new Date('2026-05-01T00:00:00.000Z'),
              },
              createdAt: new Date('2026-05-02T00:00:00.000Z'),
            },
            {
              id: 'member-2',
              userId: 'user-2',
              workspaceId: 'tenant-2',
              role: 'staff',
              user: {
                id: 'user-2',
                name: 'Budi',
                email: 'budi@example.com',
                role: 'staff',
                disabledAt: null,
                createdAt: new Date('2026-05-03T00:00:00.000Z'),
              },
              workspace: {
                id: 'tenant-2',
                name: 'Tenant Beta',
                plan: 'starter',
                status: 'active',
                createdAt: new Date('2026-05-01T00:00:00.000Z'),
              },
              createdAt: new Date('2026-05-04T00:00:00.000Z'),
            },
          ]
        }
        return []
      }),
      count: vi.fn(async () => 2),
      findUnique: vi.fn(async () => ({
        userId: 'user-1',
        workspaceId: 'tenant-1',
        role: 'admin',
        user: { ...userRecord },
        workspace: {
          id: 'tenant-1',
          name: 'Tenant Alpha',
          plan: 'pro',
          status: 'active',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
      })),
      update: vi.fn(async ({ where, data }: any) => ({
        userId: where.userId,
        workspaceId: where.workspaceId,
        role: data.role ?? 'admin',
        user: {
          ...userRecord,
          ...(data.user ? data.user : {}),
        },
        workspace: {
          id: where.workspaceId,
          name: 'Tenant Alpha',
          plan: 'pro',
          status: 'active',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
      })),
    },
    workspace: {
      findUnique: vi.fn(async ({ where }: any) => ({
        id: where.id,
        name: 'Tenant Alpha',
        plan: 'pro',
        status: 'active',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      })),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email === 'budi@example.com') {
          return {
            id: 'user-2',
            name: 'Budi',
            email: 'budi@example.com',
            role: 'staff',
            disabledAt: null,
            createdAt: new Date('2026-05-03T00:00:00.000Z'),
            memberships: [{ workspaceId: 'tenant-2' }],
          }
        }
        return {
          ...userRecord,
          memberships: [{ workspaceId: 'tenant-1' }],
        }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        userRecord = {
          ...userRecord,
          ...data,
          id: where.id,
          memberships: userRecord.memberships,
        }
        return { ...userRecord }
      }),
    },
    auditLog: {
      findMany: vi.fn(async ({ where }: any) => {
        if (where?.action === 'auth.login') {
          return [
            {
              userId: 'user-1',
              workspaceId: 'tenant-1',
              createdAt: new Date('2026-05-10T08:15:00.000Z'),
            },
            {
              userId: 'user-2',
              workspaceId: 'tenant-2',
              createdAt: new Date('2026-05-12T09:00:00.000Z'),
            },
          ]
        }
        return []
      }),
      count: vi.fn(async () => 0),
      create: vi.fn(async () => undefined),
    },
    $transaction: vi.fn(async (callback: any) => callback(prisma)),
  }

  async function buildApp() {
    const app = Fastify()
    app.decorate('prisma', prisma as any)
    await app.register(adminRoutes, { prefix: '/api/admin' })
    await app.register(adminManagementRoutes, { prefix: '/api/admin' })
    return app
  }

  beforeEach(() => {
    userRecord = {
      id: 'user-1',
      name: 'Siti',
      email: 'siti@example.com',
      role: 'admin',
      disabledAt: null,
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
      memberships: [{ workspaceId: 'tenant-1' }],
    }
    vi.clearAllMocks()
  })

  it('includes last login timestamp in admin user lists', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users?page=1&per_page=20',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          user_id: 'user-1',
          last_login_at: '2026-05-10T08:15:00.000Z',
        }),
      ]))
    } finally {
      await app.close()
    }
  })

  it('updates tenant user profile and writes audit log', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/workspaces/tenant-1/users/user-1/profile',
        payload: {
          name: 'Siti Baru',
          email: 'siti.baru@example.com',
          role: 'staff',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        name: 'Siti Baru',
        email: 'siti.baru@example.com',
        role: 'admin',
      })
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          name: 'Siti Baru',
          email: 'siti.baru@example.com',
        },
      }))
      expect(prisma.workspaceMember.update).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId_workspaceId: {
            userId: 'user-1',
            workspaceId: 'tenant-1',
          },
        },
        data: {
          role: 'staff',
        },
      }))
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'admin.user.updated',
          entityType: 'user',
        }),
      }))
    } finally {
      await app.close()
    }
  })
})
