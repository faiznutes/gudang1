import type { Prisma } from '@prisma/client'

export function userDto(user: { id: string; name: string; email: string; role: string; avatar?: string | null; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? undefined,
    created_at: user.createdAt.toISOString(),
  }
}

export function workspaceDto(workspace: { id: string; name: string; plan: string; status: string; logo?: string | null; trialEndsAt?: Date | null; createdAt: Date }) {
  return {
    id: workspace.id,
    name: workspace.name,
    plan: workspace.plan,
    status: workspace.status,
    logo: workspace.logo ?? undefined,
    trial_ends_at: workspace.trialEndsAt?.toISOString() ?? null,
    created_at: workspace.createdAt.toISOString(),
  }
}

export function categoryDto(category: { id: string; name: string; description?: string | null; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    created_at: category.createdAt?.toISOString(),
    updated_at: category.updatedAt?.toISOString(),
  }
}

export function productDto(product: Prisma.ProductGetPayload<{ include: { category: true } }>) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description ?? undefined,
    category_id: product.categoryId,
    category: product.category ? categoryDto(product.category) : undefined,
    min_stock: product.minStock,
    price: product.price,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  }
}

export function warehouseDto(warehouse: { id: string; name: string; address?: string | null; isDefault: boolean; createdAt: Date; updatedAt?: Date }) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address ?? undefined,
    is_default: warehouse.isDefault,
    created_at: warehouse.createdAt.toISOString(),
    updated_at: warehouse.updatedAt?.toISOString(),
  }
}

export function inventoryDto(item: Prisma.InventoryItemGetPayload<{ include: { product: { include: { category: true } }; warehouse: true } }>) {
  return {
    id: item.id,
    product_id: item.productId,
    product: productDto(item.product),
    warehouse_id: item.warehouseId,
    warehouse: warehouseDto(item.warehouse),
    quantity: item.quantity,
    updated_at: item.updatedAt.toISOString(),
  }
}

export function stockMovementDto(move: Prisma.StockMovementGetPayload<{ include: { product: true; warehouse: true; toWarehouse: true; user: true } }>) {
  return {
    id: move.id,
    product_id: move.productId,
    product_name: move.product.name,
    product_sku: move.product.sku,
    warehouse_id: move.warehouseId,
    warehouse_name: move.warehouse.name,
    to_warehouse_id: move.toWarehouseId ?? undefined,
    to_warehouse_name: move.toWarehouse?.name ?? undefined,
    type: move.type,
    quantity: move.quantity,
    notes: move.notes ?? undefined,
    user_id: move.userId,
    user_name: move.user.name,
    created_at: move.createdAt.toISOString(),
  }
}

export function supplierDto(supplier: { id: string; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; createdAt: Date; updatedAt?: Date }) {
  return {
    id: supplier.id,
    name: supplier.name,
    contact_person: supplier.contactPerson ?? undefined,
    phone: supplier.phone ?? undefined,
    email: supplier.email ?? undefined,
    address: supplier.address ?? undefined,
    notes: supplier.notes ?? undefined,
    created_at: supplier.createdAt.toISOString(),
    updated_at: supplier.updatedAt?.toISOString(),
  }
}
