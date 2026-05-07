<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Download, RefreshCw, WifiOff, X, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import {
  dismissPwaPopupToday,
  getLastCacheRefreshAt,
  getOfflineQueueSummary,
  OFFLINE_QUEUE_CHANGED_EVENT,
  refreshDailyCache,
  shouldRefreshDailyCache,
  wasPwaPopupDismissedToday,
  type OfflineQueueSummary,
} from '@/services/offlineQueue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const show = ref(false)
const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)
const refreshing = ref(false)
const updateAvailable = ref(false)
const errorMessage = ref('')
const lastRefreshAt = ref<string | null>(null)
const queueSummary = ref<OfflineQueueSummary>({
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  needs_review: 0,
  total: 0,
})

const hasQueueAttention = computed(() => {
  return queueSummary.value.pending + queueSummary.value.failed + queueSummary.value.needs_review > 0
})

const canInstall = computed(() => Boolean(installPrompt.value) && !installed.value)
const cacheIsStale = computed(() => shouldRefreshDailyCache())

const shouldShowPopup = computed(() => {
  return show.value && (canInstall.value || cacheIsStale.value || hasQueueAttention.value || updateAvailable.value)
})

const cacheLabel = computed(() => {
  if (!lastRefreshAt.value) return 'Belum pernah diperbarui'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(lastRefreshAt.value))
})

const queueLabel = computed(() => {
  const pending = queueSummary.value.pending + queueSummary.value.syncing
  const review = queueSummary.value.needs_review
  if (review > 0) return `${review} item perlu ditinjau`
  if (queueSummary.value.failed > 0) return `${queueSummary.value.failed} item gagal sync`
  if (pending > 0) return `${pending} item menunggu sync`
  return 'Tidak ada antrean offline'
})

async function loadStatus() {
  lastRefreshAt.value = getLastCacheRefreshAt()
  queueSummary.value = await getOfflineQueueSummary().catch(() => queueSummary.value)
}

function evaluateVisibility() {
  if (wasPwaPopupDismissedToday() && !hasQueueAttention.value && !updateAvailable.value) {
    show.value = false
    return
  }
  show.value = true
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  installPrompt.value = event as BeforeInstallPromptEvent
  evaluateVisibility()
}

function handleAppInstalled() {
  installed.value = true
  installPrompt.value = null
  dismissPwaPopupToday()
  show.value = false
}

async function installApp() {
  if (!installPrompt.value) return
  const promptEvent = installPrompt.value
  installPrompt.value = null
  await promptEvent.prompt()
  const choice = await promptEvent.userChoice
  if (choice.outcome === 'accepted') {
    dismissPwaPopupToday()
    show.value = false
  }
}

async function refreshCache() {
  refreshing.value = true
  errorMessage.value = ''
  try {
    lastRefreshAt.value = await refreshDailyCache()
    await loadStatus()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Cache gagal diperbarui'
    await loadStatus()
  } finally {
    refreshing.value = false
  }
}

async function activateUpdate() {
  if (!navigator.serviceWorker?.controller) return
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
}

function dismiss() {
  dismissPwaPopupToday()
  show.value = false
}

function handleSwMessage(event: MessageEvent) {
  if (event.data?.type === 'CACHE_REFRESHED') {
    lastRefreshAt.value = event.data.refreshedAt
    loadStatus().catch(() => {})
  }
}

async function handleQueueChanged() {
  await loadStatus()
  evaluateVisibility()
}

onMounted(async () => {
  installed.value = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  window.addEventListener('online', handleQueueChanged)
  window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged)
  navigator.serviceWorker?.addEventListener('message', handleSwMessage)

  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  updateAvailable.value = Boolean(registration?.waiting)
  registration?.addEventListener('updatefound', () => {
    const installing = registration.installing
    installing?.addEventListener('statechange', () => {
      updateAvailable.value = installing.state === 'installed' && Boolean(navigator.serviceWorker.controller)
      evaluateVisibility()
    })
  })

  await loadStatus()
  evaluateVisibility()
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
  window.removeEventListener('online', handleQueueChanged)
  window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged)
  navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pwa-pop">
      <aside
        v-if="shouldShowPopup"
        class="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-4 shadow-2xl sm:left-auto sm:mx-0"
        role="status"
        aria-live="polite"
        data-testid="pwa-status-popup"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Download v-if="canInstall" class="h-5 w-5" />
            <WifiOff v-else-if="hasQueueAttention" class="h-5 w-5" />
            <RefreshCw v-else class="h-5 w-5" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-neutral-900">StockPilot siap dipakai offline</h2>
                <p class="mt-1 text-sm leading-5 text-neutral-600">
                  Cache terakhir: {{ cacheLabel }}. {{ queueLabel }}.
                </p>
              </div>
              <button
                type="button"
                class="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Tutup popup PWA"
                @click="dismiss"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <p v-if="errorMessage" class="mt-3 flex items-center gap-2 text-xs font-medium text-warning-700">
              <AlertTriangle class="h-4 w-4" />
              {{ errorMessage }}
            </p>
            <p v-else-if="!cacheIsStale" class="mt-3 flex items-center gap-2 text-xs font-medium text-success-700">
              <CheckCircle2 class="h-4 w-4" />
              Cache hari ini sudah diperbarui.
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
              <button v-if="canInstall" type="button" class="btn-primary btn-sm" @click="installApp">
                <Download class="h-4 w-4" />
                Install
              </button>
              <button type="button" class="btn-secondary btn-sm" :disabled="refreshing" @click="refreshCache">
                <RefreshCw :class="['h-4 w-4', refreshing ? 'animate-spin' : '']" />
                {{ refreshing ? 'Memperbarui' : 'Refresh cache' }}
              </button>
              <button v-if="updateAvailable" type="button" class="btn-secondary btn-sm" @click="activateUpdate">
                Pakai versi baru
              </button>
              <button type="button" class="btn-ghost btn-sm" @click="dismiss">Nanti</button>
            </div>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pwa-pop-enter-active,
.pwa-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.pwa-pop-enter-from,
.pwa-pop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
