export const planLabels: Record<string, string> = {
  free: 'Gratis',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  custom: 'Kustom',
}

export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin Tenant',
  staff: 'Staff',
  supplier: 'Supplier',
  trial: 'Trial',
}

export const workspaceStatusLabels: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Ditangguhkan',
  trial: 'Trial',
}

export const subscriptionStatusLabels: Record<string, string> = {
  active: 'Aktif',
  cancelled: 'Dibatalkan',
  past_due: 'Tertunggak',
  expired: 'Berakhir',
  trialing: 'Trial',
}

export const queueStatusLabels: Record<string, string> = {
  pending: 'Menunggu',
  syncing: 'Sinkronisasi',
  synced: 'Selesai',
  failed: 'Gagal',
  needs_review: 'Perlu ditinjau',
}

export function labelFrom(map: Record<string, string>, value?: string | null) {
  if (!value) return '-'
  return map[value] ?? value.replace(/_/g, ' ')
}
