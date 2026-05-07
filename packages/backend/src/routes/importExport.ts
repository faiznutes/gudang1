import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { requireActiveSession, requireAuth, requireFeature } from '../middleware/auth.js'
import { writeAuditLog } from '../lib/audit.js'

const DATA_TYPES = ['products', 'warehouses', 'suppliers', 'inventory', 'stock_movements', 'audit_logs'] as const
type DataType = (typeof DATA_TYPES)[number]

const importBodySchema = z.object({
  content: z.string().min(1),
})

const csvTemplates: Record<DataType, string[]> = {
  products: ['sku', 'name', 'description', 'category', 'min_stock', 'price'],
  warehouses: ['name', 'address', 'is_default'],
  suppliers: ['name', 'contact_person', 'phone', 'email', 'address', 'notes'],
  inventory: ['sku', 'warehouse', 'quantity'],
  stock_movements: ['type', 'sku', 'warehouse', 'to_warehouse', 'quantity', 'notes'],
  audit_logs: ['action', 'entity_type', 'entity_id', 'metadata'],
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(',')),
  ].join('\n')
}

function parseCsv(content: string) {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(Boolean)) rows.push(row)
  if (rows.length === 0) return []

  const headers = rows[0].map(header => header.trim().toLowerCase())
  return rows.slice(1).map(values => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() ?? ''
    })
    return record
  })
}

function sendCsv(reply: FastifyReply, filename: string, content: string) {
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="${filename}"`)
    .send(`\uFEFF${content}`)
}

function boolFromCsv(value: string | undefined) {
  return value === 'true' || value === '1' || value?.toLowerCase() === 'ya'
}

function intFromCsv(value: string | undefined, field: string, min = 0) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new AppError('validation_error', `${field} harus angka minimal ${min}`)
  }
  return parsed
}

async function ensureCategory(app: FastifyInstance, workspaceId: string, name: string) {
  const categoryName = name || 'Umum'
  return app.prisma.category.upsert({
    where: { workspaceId_name: { workspaceId, name: categoryName } },
    update: {},
    create: { workspaceId, name: categoryName },
  })
}

async function ensureWarehouse(app: FastifyInstance, workspaceId: string, name: string) {
  const warehouse = await app.prisma.warehouse.findFirst({ where: { workspaceId, name } })
  if (!warehouse) throw new AppError('not_found', `Gudang "${name}" tidak ditemukan`)
  return warehouse
}

async function ensureProduct(app: FastifyInstance, workspaceId: string, sku: string) {
  const product = await app.prisma.product.findFirst({ where: { workspaceId, sku } })
  if (!product) throw new AppError('not_found', `Produk SKU "${sku}" tidak ditemukan`)
  return product
}

async function exportData(app: FastifyInstance, workspaceId: string, type: DataType) {
  if (type === 'products') {
    const rows = await app.prisma.product.findMany({
      where: { workspaceId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    return toCsv(csvTemplates.products, rows.map(row => ({
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: row.category.name,
      min_stock: row.minStock,
      price: row.price,
    })))
  }

  if (type === 'warehouses') {
    const rows = await app.prisma.warehouse.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } })
    return toCsv(csvTemplates.warehouses, rows.map(row => ({
      name: row.name,
      address: row.address,
      is_default: row.isDefault,
    })))
  }

  if (type === 'suppliers') {
    const rows = await app.prisma.supplier.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } })
    return toCsv(csvTemplates.suppliers, rows.map(row => ({
      name: row.name,
      contact_person: row.contactPerson,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
    })))
  }

  if (type === 'inventory') {
    const rows = await app.prisma.inventoryItem.findMany({
      where: { workspaceId },
      include: { product: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    })
    return toCsv(csvTemplates.inventory, rows.map(row => ({
      sku: row.product.sku,
      warehouse: row.warehouse.name,
      quantity: row.quantity,
    })))
  }

  if (type === 'stock_movements') {
    const rows = await app.prisma.stockMovement.findMany({
      where: { workspaceId },
      include: { product: true, warehouse: true, toWarehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })
    return toCsv(csvTemplates.stock_movements, rows.map(row => ({
      type: row.type,
      sku: row.product.sku,
      warehouse: row.warehouse.name,
      to_warehouse: row.toWarehouse?.name,
      quantity: row.quantity,
      notes: row.notes,
    })))
  }

  const rows = await app.prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })
  return toCsv(csvTemplates.audit_logs, rows.map(row => ({
    action: row.action,
    entity_type: row.entityType,
    entity_id: row.entityId,
    metadata: row.metadata ? JSON.stringify(row.metadata) : '',
  })))
}

export async function importExportRoutes(app: FastifyInstance) {
  app.get('/import/templates/:type', async (request, reply) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ type: z.enum(DATA_TYPES) }).parse(request.params)
    const headers = csvTemplates[params.type]
    const exampleRow: Record<DataType, Record<string, unknown>> = {
      products: { sku: 'PRODUCT-001', name: 'Nama Produk', description: 'Deskripsi produk', category: 'Kategori', min_stock: 10, price: 100000 },
      warehouses: { name: 'Nama Gudang', address: 'Alamat gudang', is_default: true },
      suppliers: { name: 'Nama Supplier', contact_person: 'Nama Kontak', phone: '08xxxxxxxxxx', email: 'supplier@example.com', address: 'Alamat supplier', notes: 'Catatan supplier' },
      inventory: { sku: 'PRODUCT-001', warehouse: 'Nama Gudang', quantity: 50 },
      stock_movements: { type: 'in', sku: 'PRODUCT-001', warehouse: 'Nama Gudang', to_warehouse: '', quantity: 10, notes: 'Catatan mutasi' },
      audit_logs: { action: 'audit.note', entity_type: 'system', entity_id: '', metadata: '{"note":"catatan"}' },
    }
    await writeAuditLog(app, ctx, request, {
      action: 'data.template_downloaded',
      entityType: 'import_template',
      entityId: params.type,
      metadata: { type: params.type },
    })
    return sendCsv(reply, `${params.type}-template.csv`, toCsv(headers, [exampleRow[params.type]]))
  })

  app.get('/export/:type', async (request, reply) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ type: z.enum(DATA_TYPES) }).parse(request.params)
    if (params.type !== 'audit_logs') {
      await requireFeature(app, ctx, 'exportPDF')
    }
    const csv = await exportData(app, ctx.workspaceId, params.type)
    await writeAuditLog(app, ctx, request, {
      action: 'data.exported',
      entityType: params.type,
      metadata: { type: params.type },
    })
    return sendCsv(reply, `${params.type}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  })

  app.post('/import/:type', async (request) => {
    const ctx = await requireAuth(app, request)
    requireActiveSession(ctx)
    await requireFeature(app, ctx, 'batchImport')
    const params = z.object({ type: z.enum(DATA_TYPES) }).parse(request.params)
    const body = importBodySchema.parse(request.body)
    const rows = parseCsv(body.content)
    let imported = 0

    await app.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (params.type === 'products') {
          const category = await ensureCategory(app, ctx.workspaceId, row.category)
          await tx.product.upsert({
            where: { workspaceId_sku: { workspaceId: ctx.workspaceId, sku: row.sku } },
            update: {
              name: row.name,
              description: row.description || null,
              categoryId: category.id,
              minStock: intFromCsv(row.min_stock, 'min_stock'),
              price: intFromCsv(row.price, 'price'),
            },
            create: {
              workspaceId: ctx.workspaceId,
              sku: row.sku,
              name: row.name,
              description: row.description || null,
              categoryId: category.id,
              minStock: intFromCsv(row.min_stock, 'min_stock'),
              price: intFromCsv(row.price, 'price'),
            },
          })
        } else if (params.type === 'warehouses') {
          await tx.warehouse.upsert({
            where: { workspaceId_name: { workspaceId: ctx.workspaceId, name: row.name } },
            update: { address: row.address || null, isDefault: boolFromCsv(row.is_default) },
            create: { workspaceId: ctx.workspaceId, name: row.name, address: row.address || null, isDefault: boolFromCsv(row.is_default) },
          })
        } else if (params.type === 'suppliers') {
          await tx.supplier.create({
            data: {
              workspaceId: ctx.workspaceId,
              name: row.name,
              contactPerson: row.contact_person || null,
              phone: row.phone || null,
              email: row.email || null,
              address: row.address || null,
              notes: row.notes || null,
            },
          })
        } else if (params.type === 'inventory') {
          const product = await ensureProduct(app, ctx.workspaceId, row.sku)
          const warehouse = await ensureWarehouse(app, ctx.workspaceId, row.warehouse)
          await tx.inventoryItem.upsert({
            where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
            update: { quantity: intFromCsv(row.quantity, 'quantity') },
            create: { workspaceId: ctx.workspaceId, productId: product.id, warehouseId: warehouse.id, quantity: intFromCsv(row.quantity, 'quantity') },
          })
        } else if (params.type === 'stock_movements') {
          const type = z.enum(['in', 'out', 'transfer']).parse(row.type)
          const product = await ensureProduct(app, ctx.workspaceId, row.sku)
          const warehouse = await ensureWarehouse(app, ctx.workspaceId, row.warehouse)
          const quantity = intFromCsv(row.quantity, 'quantity', 1)
          if (type === 'out' || type === 'transfer') {
            const decremented = await tx.inventoryItem.updateMany({
              where: { workspaceId: ctx.workspaceId, productId: product.id, warehouseId: warehouse.id, quantity: { gte: quantity } },
              data: { quantity: { decrement: quantity } },
            })
            if (decremented.count === 0) throw new AppError('conflict', `Stok ${row.sku} di ${row.warehouse} tidak cukup`)
          } else {
            await tx.inventoryItem.upsert({
              where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
              update: { quantity: { increment: quantity } },
              create: { workspaceId: ctx.workspaceId, productId: product.id, warehouseId: warehouse.id, quantity },
            })
          }
          let toWarehouseId: string | undefined
          if (type === 'transfer') {
            const toWarehouse = await ensureWarehouse(app, ctx.workspaceId, row.to_warehouse)
            toWarehouseId = toWarehouse.id
            await tx.inventoryItem.upsert({
              where: { productId_warehouseId: { productId: product.id, warehouseId: toWarehouse.id } },
              update: { quantity: { increment: quantity } },
              create: { workspaceId: ctx.workspaceId, productId: product.id, warehouseId: toWarehouse.id, quantity },
            })
          }
          await tx.stockMovement.create({
            data: {
              workspaceId: ctx.workspaceId,
              productId: product.id,
              warehouseId: warehouse.id,
              toWarehouseId,
              type,
              quantity,
              notes: row.notes || 'Import CSV',
              userId: ctx.userId,
            },
          })
        } else {
          await tx.auditLog.create({
            data: {
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              action: row.action || 'audit.imported',
              entityType: row.entity_type || 'system',
              entityId: row.entity_id || null,
              metadata: row.metadata ? JSON.parse(row.metadata) : { source: 'csv_import' },
            },
          })
        }
        imported += 1
      }

      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: 'data.imported',
          entityType: params.type,
          metadata: { type: params.type, rows: imported },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })
    })

    return { ok: true, imported }
  })
}
