<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTrialStore } from '@/stores/trial'
import { X, Clock, Crown, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const trialStore = useTrialStore()

const isDismissed = ref(trialStore.isBannerDismissed())

const urgencyLevel = computed(() => {
  if (trialStore.daysRemaining <= 1) return 'critical'
  if (trialStore.daysRemaining <= 3) return 'warning'
  return 'normal'
})

const urgencyColors = {
  normal: 'bg-primary-50 border-primary-200',
  warning: 'bg-warning-50 border-warning-200',
  critical: 'bg-danger-50 border-danger-200',
}

const textColors = {
  normal: 'text-primary-900',
  warning: 'text-warning-900',
  critical: 'text-danger-900',
}

function dismiss() {
  trialStore.dismissBanner()
  isDismissed.value = true
}

function upgrade() {
  router.push({ name: 'billing' })
}
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="trialStore.isTrial && !trialStore.isExpired && !isDismissed"
      :class="['border-b px-4 lg:px-8 py-3', urgencyColors[urgencyLevel]]"
    >
      <div class="flex items-center gap-4">
        <!-- Icon -->
        <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', urgencyLevel === 'critical' ? 'bg-danger-200' : urgencyLevel === 'warning' ? 'bg-warning-200' : 'bg-primary-200']">
          <Clock v-if="urgencyLevel !== 'critical'" :class="['w-4 h-4', urgencyLevel === 'warning' ? 'text-warning-700' : 'text-primary-700']" />
          <AlertCircle v-else class="w-4 h-4 text-danger-700" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p :class="['text-sm font-medium', textColors[urgencyLevel]]">
            <span v-if="urgencyLevel === 'critical'">
              ⚠️ Trial berakhir dalam {{ trialStore.daysRemaining }} hari {{ trialStore.hoursRemaining }} jam!
            </span>
            <span v-else-if="urgencyLevel === 'warning'">
              Trial berakhir dalam {{ trialStore.daysRemaining }} hari - Upgrade sekarang untuk tetap akses semua fitur
            </span>
            <span v-else>
              Trial {{ trialStore.TRIAL_DAYS }} hari - Sisa {{ trialStore.daysRemaining }} hari {{ trialStore.hoursRemaining }} jam
            </span>
          </p>
          <div class="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-500', urgencyLevel === 'critical' ? 'bg-danger-500' : urgencyLevel === 'warning' ? 'bg-warning-500' : 'bg-primary-500']"
              :style="{ width: trialStore.progress + '%' }"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            @click="upgrade"
            :class="['btn-sm font-medium', urgencyLevel === 'critical' ? 'bg-danger-600 hover:bg-danger-700 text-white' : urgencyLevel === 'warning' ? 'bg-warning-600 hover:bg-warning-700 text-white' : 'btn-primary']"
          >
            <Crown class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Upgrade</span>
          </button>
          <button
            @click="dismiss"
            :class="['p-1.5 rounded-lg transition-colors', urgencyLevel === 'critical' ? 'hover:bg-danger-100 text-danger-600' : urgencyLevel === 'warning' ? 'hover:bg-warning-100 text-warning-600' : 'hover:bg-primary-100 text-primary-600']"
            title="Tutup banner"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>