<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Download, X } from 'lucide-vue-next'
import {
  dismissPwaPopupToday,
  wasPwaPopupDismissedToday,
} from '@/services/offlineQueue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const show = ref(false)
const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)

const canInstall = computed(() => Boolean(installPrompt.value) && !installed.value)

const shouldShowPopup = computed(() => {
  return show.value && canInstall.value
})

function evaluateVisibility() {
  if (wasPwaPopupDismissedToday() || !canInstall.value) {
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

function dismiss() {
  dismissPwaPopupToday()
  show.value = false
}

onMounted(() => {
  installed.value = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  evaluateVisibility()
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
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
            <Download class="h-5 w-5" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-neutral-900">Install StockPilot</h2>
                <p class="mt-1 text-sm leading-5 text-neutral-600">
                  Buka lebih cepat dari layar utama dan tetap nyaman dipakai seperti aplikasi.
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

            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="btn-primary btn-sm" @click="installApp">
                <Download class="h-4 w-4" />
                Install
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
