<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-vue-next'
import {
  getOfflineQueueSummary,
  OFFLINE_QUEUE_CHANGED_EVENT,
  OFFLINE_SYNC_COMPLETE_EVENT,
  requestOfflineSync,
  type OfflineQueueSummary,
} from '@/services/offlineQueue'

const props = withDefaults(defineProps<{
  variant?: 'light' | 'dark'
  compact?: boolean
}>(), {
  variant: 'light',
  compact: false,
})

const isOnline = ref(navigator.onLine)
const queueSummary = ref<OfflineQueueSummary>({
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  needs_review: 0,
  total: 0,
})

const pendingCount = computed(() => queueSummary.value.pending + queueSummary.value.syncing)
const attentionCount = computed(() => queueSummary.value.failed + queueSummary.value.needs_review)

const status = computed(() => {
  if (!isOnline.value) {
    return {
      key: 'offline',
      label: pendingCount.value > 0 ? 'Offline - belum sync' : 'Offline',
      shortLabel: 'Offline',
      detail: pendingCount.value > 0
        ? `${pendingCount.value} perubahan tersimpan di perangkat dan akan sync saat online.`
        : 'Aplikasi memakai data cache sampai koneksi kembali.',
      icon: WifiOff,
    }
  }

  if (attentionCount.value > 0) {
    return {
      key: 'attention',
      label: `${attentionCount.value} perlu cek`,
      shortLabel: 'Perlu cek',
      detail: 'Ada data offline yang belum berhasil disinkronkan.',
      icon: AlertTriangle,
    }
  }

  if (pendingCount.value > 0) {
    return {
      key: 'syncing',
      label: `${pendingCount.value} sedang sync`,
      shortLabel: 'Sync',
      detail: 'Perubahan offline sedang dikirim ke server.',
      icon: RefreshCw,
    }
  }

  return {
    key: 'online',
    label: 'Online & sync',
    shortLabel: 'Online',
    detail: 'Koneksi aktif dan tidak ada antrean offline.',
    icon: props.compact ? Wifi : CheckCircle2,
  }
})

const appearance = computed(() => {
  const dark = props.variant === 'dark'
  if (status.value.key === 'offline') {
    return {
      wrapper: dark
        ? 'border-amber-200/30 bg-amber-300/15 text-amber-50'
        : 'border-amber-200 bg-amber-50 text-amber-800',
      dot: 'bg-amber-400',
      icon: status.value.icon,
      iconClass: dark ? 'text-amber-100' : 'text-amber-600',
    }
  }
  if (status.value.key === 'attention') {
    return {
      wrapper: dark
        ? 'border-rose-200/30 bg-rose-300/15 text-rose-50'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      dot: 'bg-rose-400',
      icon: status.value.icon,
      iconClass: dark ? 'text-rose-100' : 'text-rose-600',
    }
  }
  if (status.value.key === 'syncing') {
    return {
      wrapper: dark
        ? 'border-sky-200/30 bg-sky-300/15 text-sky-50'
        : 'border-sky-200 bg-sky-50 text-sky-700',
      dot: 'bg-sky-400',
      icon: status.value.icon,
      iconClass: dark ? 'text-sky-100' : 'text-sky-600',
    }
  }
  return {
    wrapper: dark
      ? 'border-emerald-200/30 bg-emerald-300/15 text-emerald-50'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-400',
    icon: status.value.icon,
    iconClass: dark ? 'text-emerald-100' : 'text-emerald-600',
  }
})

const displayLabel = computed(() => props.compact ? status.value.shortLabel : status.value.label)

async function loadQueueSummary() {
  queueSummary.value = await getOfflineQueueSummary().catch(() => queueSummary.value)
}

async function handleOnline() {
  isOnline.value = true
  await loadQueueSummary()
  requestOfflineSync().catch(() => {})
}

async function handleOffline() {
  isOnline.value = false
  await loadQueueSummary()
}

async function handleQueueChange() {
  await loadQueueSummary()
}

onMounted(async () => {
  await loadQueueSummary()
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChange)
  window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleQueueChange)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChange)
  window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleQueueChange)
})
</script>

<template>
  <div
    :class="[
      'inline-flex h-9 max-w-[10.5rem] items-center gap-2 rounded-full border px-2.5 text-xs font-semibold shadow-sm transition-colors',
      appearance.wrapper,
    ]"
    :title="status.detail"
    role="status"
    aria-live="polite"
    data-testid="sync-status-indicator"
  >
    <span class="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span v-if="status.key === 'syncing'" :class="['absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', appearance.dot]"></span>
      <span :class="['relative inline-flex h-2.5 w-2.5 rounded-full', appearance.dot]"></span>
    </span>
    <component
      :is="appearance.icon"
      :class="['h-4 w-4 flex-shrink-0', status.key === 'syncing' ? 'animate-spin' : '', appearance.iconClass]"
    />
    <span class="truncate">{{ displayLabel }}</span>
  </div>
</template>
