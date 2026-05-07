<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CalendarDays, Clock3, Lock } from 'lucide-vue-next'
import { useEntitlementsStore } from '@/stores/entitlements'
import { labelFrom, planLabels, subscriptionStatusLabels } from '@/lib/labels'

const props = withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
})

const entitlementsStore = useEntitlementsStore()
const now = ref(Date.now())
let timer: number | null = null

const entitlements = computed(() => entitlementsStore.entitlements)
const subscriptionEnd = computed(() => entitlements.value.trialEndsAt || entitlements.value.subscriptionEndsAt)
const subscriptionStart = computed(() => entitlements.value.subscriptionStartsAt)
const targetEnd = computed(() => subscriptionEnd.value)
const targetStart = computed(() => subscriptionStart.value)
const remainingMs = computed(() => {
  if (!targetEnd.value) return null
  return Math.max(0, new Date(targetEnd.value).getTime() - now.value)
})
const isExpired = computed(() => remainingMs.value !== null && remainingMs.value <= 0)
const isSubscriptionTimer = computed(() => !!subscriptionEnd.value)
const countdownParts = computed(() => {
  const totalSeconds = Math.max(0, Math.floor((remainingMs.value ?? 0) / 1000))
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
})
const progress = computed(() => {
  if (!targetEnd.value || !targetStart.value) return isExpired.value ? 0 : 100
  const start = new Date(targetStart.value).getTime()
  const end = new Date(targetEnd.value).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return isExpired.value ? 0 : 100
  return Math.max(0, Math.min(100, ((end - now.value) / (end - start)) * 100))
})
const circleStyle = computed(() => ({
  background: `conic-gradient(${isExpired.value ? '#dc2626' : '#2563eb'} ${progress.value * 3.6}deg, #e5e7eb 0deg)`,
}))
const tone = computed(() => {
  if (isExpired.value) return 'border-danger-200 bg-danger-50 text-danger-800'
  if ((remainingMs.value ?? 0) <= 3 * 24 * 60 * 60 * 1000) return 'border-warning-200 bg-warning-50 text-warning-800'
  return 'border-primary-200 bg-primary-50 text-primary-900'
})
const title = computed(() => {
  return entitlements.value.subscriptionStatus === 'trialing' ? 'Masa trial tersisa' : 'Masa aktif paket'
})
const statusText = computed(() => {
  if (isSubscriptionTimer.value) {
    return `${labelFrom(planLabels, entitlements.value.plan)} - ${labelFrom(subscriptionStatusLabels, entitlements.value.subscriptionStatus)}`
  }
  return `${labelFrom(planLabels, entitlements.value.plan)} - ${labelFrom(subscriptionStatusLabels, entitlements.value.subscriptionStatus)}`
})

function formatDate(value?: string | null) {
  if (!value) return 'Tidak ada tanggal akhir'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <section v-if="targetEnd" :class="['overflow-hidden rounded-2xl border p-4 shadow-sm lg:p-6', tone]">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="relative grid h-20 w-20 flex-shrink-0 place-items-center rounded-full" :style="circleStyle">
          <div class="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
            <Clock3 v-if="!isExpired" class="h-7 w-7 text-primary-600" />
            <Lock v-else class="h-7 w-7 text-danger-600" />
          </div>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium opacity-80">{{ title }}</p>
          <h3 class="mt-1 text-xl font-bold text-neutral-950 lg:text-2xl">{{ statusText }}</h3>
          <p class="mt-2 flex items-center gap-2 text-sm opacity-80">
            <CalendarDays class="h-4 w-4" />
            Berakhir {{ formatDate(targetEnd) }}
          </p>
        </div>
      </div>

      <div v-if="remainingMs !== null" :class="['grid gap-2', props.compact ? 'grid-cols-4' : 'grid-cols-4 lg:min-w-[360px]']">
        <div v-for="part in [
          ['Hari', countdownParts.days],
          ['Jam', countdownParts.hours],
          ['Menit', countdownParts.minutes],
          ['Detik', countdownParts.seconds],
        ]" :key="part[0]" class="rounded-xl bg-white/80 p-3 text-center shadow-sm">
          <p class="text-2xl font-bold text-neutral-950">{{ String(part[1]).padStart(2, '0') }}</p>
          <p class="text-xs font-medium uppercase text-neutral-500">{{ part[0] }}</p>
        </div>
      </div>
    </div>
    <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
      <div
        :class="['h-full rounded-full transition-all duration-500', isExpired ? 'bg-danger-600' : 'bg-primary-600']"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </section>
</template>
