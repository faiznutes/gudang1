export const planLabels: Record<string, string> = {
  free: 'Gratis',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  custom: 'Kustom',
}

export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin Klien',
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

export const billingRequestTypeLabels: Record<string, string> = {
  plan_change: 'Perubahan Paket',
  addon_activation: 'Aktivasi Add-on',
  limit_increase: 'Tambah Limit',
  subscription_extension: 'Perpanjangan',
  custom_feature: 'Fitur Kustom',
  manual_adjustment: 'Penyesuaian Manual',
  enterprise_customization: 'Kustom Enterprise',
}

export const billingRequestStatusLabels: Record<string, string> = {
  pending: 'Menunggu Review',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}

export const customizationClassificationLabels: Record<string, string> = {
  rejected: 'Ditolak',
  future_roadmap: 'Roadmap',
  enterprise_only: 'Enterprise Only',
  billable_customization: 'Kustom Berbayar',
  global_feature_candidate: 'Kandidat Fitur Global',
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
