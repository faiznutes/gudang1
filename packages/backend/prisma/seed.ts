import { PrismaClient, type PlanType, type SubscriptionStatus, type UserRole, type WorkspaceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface TenantSeed {
  id: string
  name: string
  plan: PlanType
  status: WorkspaceStatus
  owner: {
    name: string
    email: string
    role: UserRole
  }
  staff?: {
    name: string
    email: string
    role: UserRole
  }
  subscriptionStatus: SubscriptionStatus
  trialDays?: number
}

async function upsertUser(email: string, name: string, role: UserRole, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  })
}

async function ensureSubscription(workspaceId: string, plan: PlanType, status: SubscriptionStatus) {
  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const existing = await prisma.subscription.findFirst({
    where: { workspaceId, status },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    })
  }

  return prisma.subscription.create({
    data: {
      workspaceId,
      plan,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  })
}

async function seedCatalog(workspaceId: string, userId: string, skuPrefix: string) {
  const kategoriUmum = await prisma.category.upsert({
    where: { workspaceId_name: { workspaceId, name: 'Produk Utama' } },
    update: {},
    create: { workspaceId, name: 'Produk Utama', description: 'Produk yang paling sering bergerak' },
  })

  const kategoriAksesoris = await prisma.category.upsert({
    where: { workspaceId_name: { workspaceId, name: 'Aksesoris' } },
    update: {},
    create: { workspaceId, name: 'Aksesoris', description: 'Produk pendukung dan variasi' },
  })

  const gudangUtama = await prisma.warehouse.upsert({
    where: { workspaceId_name: { workspaceId, name: 'Gudang Utama' } },
    update: { isDefault: true },
    create: {
      workspaceId,
      name: 'Gudang Utama',
      address: 'Jl. Merdeka No. 10, Jakarta',
      isDefault: true,
    },
  })

  const gudangCabang = await prisma.warehouse.upsert({
    where: { workspaceId_name: { workspaceId, name: 'Gudang Cabang' } },
    update: {},
    create: {
      workspaceId,
      name: 'Gudang Cabang',
      address: 'Jl. Asia Afrika No. 5, Bandung',
      isDefault: false,
    },
  })

  const products = [
    { sku: `${skuPrefix}-001`, name: 'Kaos Polos Premium', description: 'Kaos polos bahan cotton combed', categoryId: kategoriUmum.id, minStock: 10, price: 35000, mainQty: 50, branchQty: 15 },
    { sku: `${skuPrefix}-002`, name: 'Celana Jeans Slim', description: 'Celana jeans ukuran reguler', categoryId: kategoriUmum.id, minStock: 8, price: 165000, mainQty: 24, branchQty: 10 },
    { sku: `${skuPrefix}-003`, name: 'Tote Bag Kanvas', description: 'Tas kanvas untuk retail dan event', categoryId: kategoriAksesoris.id, minStock: 12, price: 42000, mainQty: 6, branchQty: 4 },
  ]

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { workspaceId_sku: { workspaceId, sku: productData.sku } },
      update: {
        name: productData.name,
        description: productData.description,
        categoryId: productData.categoryId,
        minStock: productData.minStock,
        price: productData.price,
      },
      create: {
        workspaceId,
        sku: productData.sku,
        name: productData.name,
        description: productData.description,
        categoryId: productData.categoryId,
        minStock: productData.minStock,
        price: productData.price,
      },
    })

    await prisma.inventoryItem.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: gudangUtama.id } },
      update: { quantity: productData.mainQty },
      create: { workspaceId, productId: product.id, warehouseId: gudangUtama.id, quantity: productData.mainQty },
    })

    await prisma.inventoryItem.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: gudangCabang.id } },
      update: { quantity: productData.branchQty },
      create: { workspaceId, productId: product.id, warehouseId: gudangCabang.id, quantity: productData.branchQty },
    })
  }

  await prisma.supplier.upsert({
    where: { id: `${workspaceId}-supplier-utama` },
    update: {
      name: 'PT Maju Jaya',
      contactPerson: 'Budi Santoso',
      phone: '0812-3456-7890',
      email: 'budi@majujaya.example',
    },
    create: {
      id: `${workspaceId}-supplier-utama`,
      workspaceId,
      name: 'PT Maju Jaya',
      contactPerson: 'Budi Santoso',
      phone: '0812-3456-7890',
      email: 'budi@majujaya.example',
      address: 'Jl. Industri Raya No. 15, Jakarta',
      notes: 'Supplier utama produk retail',
    },
  })

  const movementCount = await prisma.stockMovement.count({ where: { workspaceId } })
  if (movementCount === 0) {
    const firstProduct = await prisma.product.findFirst({ where: { workspaceId }, orderBy: { sku: 'asc' } })
    if (firstProduct) {
      await prisma.stockMovement.create({
        data: {
          workspaceId,
          productId: firstProduct.id,
          warehouseId: gudangUtama.id,
          type: 'in',
          quantity: 25,
          notes: 'Seed stok awal',
          userId,
        },
      })
    }
  }

  const auditCount = await prisma.auditLog.count({ where: { workspaceId } })
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          workspaceId,
          userId,
          action: 'workspace.seeded',
          entityType: 'workspace',
          entityId: workspaceId,
          metadata: { source: 'seed' },
        },
        {
          workspaceId,
          userId,
          action: 'subscription.seeded',
          entityType: 'subscription',
          metadata: { plan: 'demo' },
        },
        {
          workspaceId,
          userId,
          action: 'inventory.seeded',
          entityType: 'inventory',
          metadata: { products: 3 },
        },
      ],
    })
  }
}

async function seedTenant(seed: TenantSeed, passwordHash: string) {
  const trialEndsAt = seed.trialDays ? new Date(Date.now() + seed.trialDays * 24 * 60 * 60 * 1000) : null
  const workspace = await prisma.workspace.upsert({
    where: { id: seed.id },
    update: {
      name: seed.name,
      plan: seed.plan,
      status: seed.status,
      trialEndsAt,
    },
    create: {
      id: seed.id,
      name: seed.name,
      plan: seed.plan,
      status: seed.status,
      trialEndsAt,
    },
  })

  const owner = await upsertUser(seed.owner.email, seed.owner.name, seed.owner.role, passwordHash)
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: owner.id, workspaceId: workspace.id } },
    update: { role: seed.owner.role },
    create: { userId: owner.id, workspaceId: workspace.id, role: seed.owner.role },
  })

  if (seed.staff) {
    const staff = await upsertUser(seed.staff.email, seed.staff.name, seed.staff.role, passwordHash)
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: staff.id, workspaceId: workspace.id } },
      update: { role: seed.staff.role },
      create: { userId: staff.id, workspaceId: workspace.id, role: seed.staff.role },
    })
  }

  await ensureSubscription(workspace.id, seed.plan, seed.subscriptionStatus)
  await seedCatalog(workspace.id, owner.id, seed.id === 'trial-workspace' ? 'TRIAL' : 'SKU')
  return workspace
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const superAdmin = await upsertUser('admin@example.com', 'Admin User', 'super_admin', passwordHash)

  const superWorkspace = await prisma.workspace.upsert({
    where: { id: 'platform-admin-workspace' },
    update: {
      name: 'StockPilot Platform',
      plan: 'custom',
      status: 'active',
      trialEndsAt: null,
    },
    create: {
      id: 'platform-admin-workspace',
      name: 'StockPilot Platform',
      plan: 'custom',
      status: 'active',
    },
  })

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: superAdmin.id, workspaceId: superWorkspace.id } },
    update: { role: 'super_admin' },
    create: { userId: superAdmin.id, workspaceId: superWorkspace.id, role: 'super_admin' },
  })

  await prisma.systemSetting.upsert({
    where: { workspaceId_key: { workspaceId: superWorkspace.id, key: 'support_email' } },
    update: { value: 'support@stockpilot.example', description: 'Email bantuan platform' },
    create: {
      workspaceId: superWorkspace.id,
      key: 'support_email',
      value: 'support@stockpilot.example',
      description: 'Email bantuan platform',
    },
  })

  const platformSettings = [
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
      where: { workspaceId_key: { workspaceId: superWorkspace.id, key: setting.key } },
      update: { value: setting.value, description: setting.description },
      create: {
        workspaceId: superWorkspace.id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    })
  }

  await seedTenant({
    id: 'demo-workspace',
    name: 'Toko Saya',
    plan: 'pro',
    status: 'active',
    owner: { name: 'Owner Toko Saya', email: 'owner@example.com', role: 'admin' },
    staff: { name: 'Staff Toko Saya', email: 'staff@example.com', role: 'staff' },
    subscriptionStatus: 'active',
  }, passwordHash)

  await seedTenant({
    id: 'paid-tenant-workspace',
    name: 'Gudang Maju Bersama',
    plan: 'growth',
    status: 'active',
    owner: { name: 'Siti Rahma', email: 'siti.rahma@example.com', role: 'admin' },
    staff: { name: 'Dimas Pratama', email: 'dimas.pratama@example.com', role: 'staff' },
    subscriptionStatus: 'active',
  }, passwordHash)

  await seedTenant({
    id: 'trial-workspace',
    name: 'Retail Trial Nusantara',
    plan: 'free',
    status: 'trial',
    owner: { name: 'Andi Trial', email: 'trial@example.com', role: 'trial' },
    staff: { name: 'Supplier Trial', email: 'supplier.trial@example.com', role: 'supplier' },
    subscriptionStatus: 'trialing',
    trialDays: 14,
  }, passwordHash)
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
