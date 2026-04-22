import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTrialStore = defineStore('trial', () => {
  const isTrial = ref(false)
  const trialStartDate = ref<string | null>(null)
  const trialEndDate = ref<string | null>(null)

  const TRIAL_DAYS = 7

  const daysRemaining = computed(() => {
    if (!trialEndDate.value) return 0
    const end = new Date(trialEndDate.value)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  const hoursRemaining = computed(() => {
    if (!trialEndDate.value) return 0
    const end = new Date(trialEndDate.value)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return hours
  })

  const isExpired = computed(() => {
    if (!trialEndDate.value) return false
    return new Date(trialEndDate.value) < new Date()
  })

  const progress = computed(() => {
    if (!trialStartDate.value || !trialEndDate.value) return 0
    const start = new Date(trialStartDate.value)
    const end = new Date(trialEndDate.value)
    const now = new Date()
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  })

  function startTrial() {
    const start = new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + TRIAL_DAYS)
    
    isTrial.value = true
    trialStartDate.value = start.toISOString()
    trialEndDate.value = end.toISOString()
    localStorage.setItem('trialStartDate', start.toISOString())
    localStorage.setItem('trialEndDate', end.toISOString())
  }

  function initTrial() {
    const storedStart = localStorage.getItem('trialStartDate')
    const storedEnd = localStorage.getItem('trialEndDate')
    
    if (storedStart && storedEnd) {
      trialStartDate.value = storedStart
      trialEndDate.value = storedEnd
      isTrial.value = true
    }
  }

  function endTrial() {
    isTrial.value = false
    trialStartDate.value = null
    trialEndDate.value = null
    localStorage.removeItem('trialStartDate')
    localStorage.removeItem('trialEndDate')
  }

  function dismissBanner() {
    localStorage.setItem('trialBannerDismissed', 'true')
  }

  function isBannerDismissed(): boolean {
    return localStorage.getItem('trialBannerDismissed') === 'true'
  }

  return {
    isTrial,
    trialStartDate,
    trialEndDate,
    daysRemaining,
    hoursRemaining,
    isExpired,
    progress,
    TRIAL_DAYS,
    startTrial,
    initTrial,
    endTrial,
    dismissBanner,
    isBannerDismissed,
  }
})