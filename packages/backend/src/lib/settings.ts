import type { FastifyInstance } from 'fastify'

export interface PlatformSettings {
  sessionTimeoutMinutes: number
  lockActionsAfterSessionExpiry: boolean
  lowStockAlertsEnabled: boolean
  subscriptionRemindersEnabled: boolean
  subscriptionReminderDays: number
}

const DEFAULT_SETTINGS: PlatformSettings = {
  sessionTimeoutMinutes: 30,
  lockActionsAfterSessionExpiry: true,
  lowStockAlertsEnabled: true,
  subscriptionRemindersEnabled: true,
  subscriptionReminderDays: 7,
}

function boolValue(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback
  return value === 'true' || value === '1' || value === 'yes'
}

function intValue(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function getPlatformWorkspaceId(app: FastifyInstance) {
  const platformWorkspace = await app.prisma.workspace.findUnique({
    where: { id: 'platform-admin-workspace' },
    select: { id: true },
  })
  if (platformWorkspace) return platformWorkspace.id

  const membership = await app.prisma.workspaceMember.findFirst({
    where: { user: { role: 'super_admin' } },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true },
  })
  return membership?.workspaceId ?? null
}

export async function getPlatformSettings(app: FastifyInstance): Promise<PlatformSettings> {
  const workspaceId = await getPlatformWorkspaceId(app)
  if (!workspaceId) return DEFAULT_SETTINGS

  const rows = await app.prisma.systemSetting.findMany({ where: { workspaceId } })
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]))

  return {
    sessionTimeoutMinutes: intValue(values.session_timeout_minutes, DEFAULT_SETTINGS.sessionTimeoutMinutes, 5, 480),
    lockActionsAfterSessionExpiry: boolValue(values.lock_actions_after_session_expiry, DEFAULT_SETTINGS.lockActionsAfterSessionExpiry),
    lowStockAlertsEnabled: boolValue(values.low_stock_alerts_enabled, DEFAULT_SETTINGS.lowStockAlertsEnabled),
    subscriptionRemindersEnabled: boolValue(values.subscription_reminders_enabled, DEFAULT_SETTINGS.subscriptionRemindersEnabled),
    subscriptionReminderDays: intValue(values.subscription_reminder_days, DEFAULT_SETTINGS.subscriptionReminderDays, 1, 30),
  }
}

export async function getSessionPolicy(app: FastifyInstance) {
  const settings = await getPlatformSettings(app)
  const expiresAt = new Date(Date.now() + settings.sessionTimeoutMinutes * 60 * 1000)
  return {
    expiresAt,
    timeoutMinutes: settings.sessionTimeoutMinutes,
    lockActionsAfterExpiry: settings.lockActionsAfterSessionExpiry,
  }
}

export async function upsertPlatformSetting(app: FastifyInstance, key: string, value: string, description?: string) {
  const workspaceId = await getPlatformWorkspaceId(app)
  if (!workspaceId) throw new Error('Platform workspace tidak ditemukan')

  return app.prisma.systemSetting.upsert({
    where: { workspaceId_key: { workspaceId, key } },
    update: { value, description },
    create: { workspaceId, key, value, description },
  })
}
