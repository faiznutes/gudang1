import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PLATFORM_WORKSPACE_ID = 'platform-admin-workspace'
const SUPER_ADMIN_EMAIL = 'admin@example.com'
const SUPER_ADMIN_PASSWORD = 'password123'
const TENANT_CLEANUP_MARKER_KEY = 'seed_cleanup_super_admin_only_completed'

async function hasCompletedTenantCleanup() {
  const marker = await prisma.systemSetting.findUnique({
    where: {
      workspaceId_key: {
        workspaceId: PLATFORM_WORKSPACE_ID,
        key: TENANT_CLEANUP_MARKER_KEY,
      },
    },
  })
  return marker?.value === 'true'
}

async function markTenantCleanupCompleted() {
  await prisma.systemSetting.upsert({
    where: {
      workspaceId_key: {
        workspaceId: PLATFORM_WORKSPACE_ID,
        key: TENANT_CLEANUP_MARKER_KEY,
      },
    },
    update: {
      value: 'true',
      description: 'Menandai cleanup awal tenant contoh sudah selesai agar deploy berikutnya tidak menghapus tenant baru',
    },
    create: {
      workspaceId: PLATFORM_WORKSPACE_ID,
      key: TENANT_CLEANUP_MARKER_KEY,
      value: 'true',
      description: 'Menandai cleanup awal tenant contoh sudah selesai agar deploy berikutnya tidak menghapus tenant baru',
    },
  })
}

async function removeTenantSeedDataOnce() {
  if (await hasCompletedTenantCleanup()) return

  await prisma.workspace.deleteMany({
    where: { id: { not: PLATFORM_WORKSPACE_ID } },
  })

  const nonSuperAdminUsers = await prisma.user.findMany({
    where: { role: { not: 'super_admin' } },
    select: { id: true },
  })
  const nonSuperAdminUserIds = nonSuperAdminUsers.map(user => user.id)

  if (nonSuperAdminUserIds.length === 0) {
    await markTenantCleanupCompleted()
    return
  }

  await prisma.syncOperation.deleteMany({
    where: { userId: { in: nonSuperAdminUserIds } },
  })
  await prisma.stockMovement.deleteMany({
    where: { userId: { in: nonSuperAdminUserIds } },
  })
  await prisma.scheduledActivity.updateMany({
    where: { createdById: { in: nonSuperAdminUserIds } },
    data: { createdById: null },
  })
  await prisma.auditLog.updateMany({
    where: { userId: { in: nonSuperAdminUserIds } },
    data: { userId: null },
  })
  await prisma.workspaceMember.deleteMany({
    where: { userId: { in: nonSuperAdminUserIds } },
  })
  await prisma.user.deleteMany({
    where: { id: { in: nonSuperAdminUserIds } },
  })

  await markTenantCleanupCompleted()
}

async function main() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      name: 'Admin User',
      role: 'super_admin',
      passwordHash,
      disabledAt: null,
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      name: 'Admin User',
      role: 'super_admin',
      passwordHash,
    },
  })

  const platformWorkspace = await prisma.workspace.upsert({
    where: { id: PLATFORM_WORKSPACE_ID },
    update: {
      name: 'StockPilot Platform',
      plan: 'custom',
      status: 'active',
      trialEndsAt: null,
    },
    create: {
      id: PLATFORM_WORKSPACE_ID,
      name: 'StockPilot Platform',
      plan: 'custom',
      status: 'active',
    },
  })

  await removeTenantSeedDataOnce()

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: superAdmin.id, workspaceId: platformWorkspace.id } },
    update: { role: 'super_admin' },
    create: { userId: superAdmin.id, workspaceId: platformWorkspace.id, role: 'super_admin' },
  })

  const platformSettings = [
    {
      key: 'support_name',
      value: 'faiznute',
      description: 'Nama kontak aktivasi platform',
    },
    {
      key: 'support_email',
      value: 'faiznute07@gmail.com',
      description: 'Email bantuan platform',
    },
    {
      key: 'support_whatsapp',
      value: '085155043133',
      description: 'Nomor WhatsApp aktivasi platform',
    },
    {
      key: 'session_timeout_minutes',
      value: '30',
      description: 'Batas waktu sesi aktivitas sebelum aksi ubah data dikunci',
    },
    {
      key: 'lock_actions_after_session_expiry',
      value: 'true',
      description: 'Kunci aksi ubah data saat sesi aktivitas berakhir',
    },
    {
      key: 'low_stock_alerts_enabled',
      value: 'true',
      description: 'Aktifkan notifikasi stok menipis',
    },
    {
      key: 'subscription_reminders_enabled',
      value: 'true',
      description: 'Aktifkan pengingat langganan akan berakhir',
    },
    {
      key: 'subscription_reminder_days',
      value: '7',
      description: 'Jumlah hari sebelum langganan berakhir untuk mulai mengirim pengingat harian',
    },
  ]

  for (const setting of platformSettings) {
    await prisma.systemSetting.upsert({
      where: { workspaceId_key: { workspaceId: platformWorkspace.id, key: setting.key } },
      update: { value: setting.value, description: setting.description },
      create: {
        workspaceId: platformWorkspace.id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    })
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
