<script setup lang="ts">
import { X, Lock, Crown, ArrowRight } from 'lucide-vue-next'

defineProps<{
  title: string
  message: string
  currentPlan: string
  requiredPlan: string
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  upgrade: []
}>()
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
        <!-- Header -->
        <div class="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6">
          <button
            @click="emit('close')"
            class="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X class="w-5 h-5 text-white" />
          </button>
          <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Lock class="w-6 h-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-white">{{ title }}</h3>
        </div>

        <!-- Body -->
        <div class="p-6">
          <p class="text-neutral-600 mb-4">{{ message }}</p>

          <div class="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg mb-6">
            <div class="flex-1">
              <p class="text-xs text-neutral-500">Paket Saat Ini</p>
              <p class="font-semibold text-neutral-900">{{ currentPlan }}</p>
            </div>
            <ArrowRight class="w-4 h-4 text-neutral-400" />
            <div class="flex-1 text-right">
              <p class="text-xs text-neutral-500">Diperlukan</p>
              <p class="font-semibold text-primary-600">{{ requiredPlan }}</p>
            </div>
          </div>

          <div class="flex gap-3">
            <button @click="emit('close')" class="btn-secondary flex-1">
              Nanti Saja
            </button>
            <button @click="emit('upgrade')" class="btn-primary flex-1">
              <Crown class="w-4 h-4" />
              Upgrade Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>