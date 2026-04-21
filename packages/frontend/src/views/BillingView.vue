<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Check, Sparkles, Building2, Rocket, Crown } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Plan {
  id: string
  name: string
  price: number | null
  period: string | null
  description: string
  icon: Component
  features: string[]
  popular?: boolean
}

const authStore = useAuthStore()

const currentPlan = ref<'starter' | 'growth' | 'pro' | 'custom'>(authStore.workspace?.plan || 'starter')

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    period: 'forever',
    description: 'Untuk bisnis kecil dengan satu lokasi',
    icon: Sparkles,
    features: [
      '1 Gudang',
      '100 Produk',
      '2 User',
      'Aktivitas stok dasar',
      'Support email',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 199000,
    period: 'bulan',
    description: 'Untuk tim yang berkembang',
    icon: Building2,
    features: [
      '5 Gudang',
      '1.000 Produk',
      '10 User',
      'Multi-warehouse transfer',
      'Laporan analytics',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499000,
    period: 'bulan',
    description: 'Untuk bisnis yang lebih besar',
    icon: Rocket,
    features: [
      '20 Gudang',
      '10.000 Produk',
      'Unlimited User',
      'Auto reorder alerts',
      'Import/Export CSV',
      'API access',
      'Priority support',
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    price: null,
    period: null,
    description: 'Untuk kebutuhan enterprise',
    icon: Crown,
    features: [
      'Unlimited gudang & produk',
      'Custom integrasi',
      'Dedicated support',
      'SLA guarantee',
      'Custom training',
    ],
  },
]

function formatPrice(price: number | null) {
  if (price === null) return 'Hubungi Kami'
  return 'Rp ' + price.toLocaleString('id-ID')
}

function isActive(planId: string) {
  return currentPlan.value === planId
}

function selectPlan(planId: 'starter' | 'growth' | 'pro' | 'custom') {
  if (planId === 'starter' || planId === 'custom') return
  currentPlan.value = planId
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">Billing & Paket</h1>
      <p class="text-neutral-600">Pilih paket yang sesuai dengan kebutuhanbisnismu</p>
    </div>

    <!-- Current Plan Banner -->
    <div class="card p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p class="text-primary-100 text-sm">Paket Saat Ini</p>
          <h2 class="text-2xl font-bold">{{ plans.find(p => p.id === currentPlan)?.name }}</h2>
          <p v-if="currentPlan !== 'custom'" class="text-primary-100">
            {{ currentPlan === 'starter' ? 'Gratis selamanya' : `${formatPrice(plans.find(p => p.id === currentPlan)?.price || 0)}/bulan` }}
          </p>
        </div>
        <div v-if="currentPlan !== 'custom'" class="badge bg-white/20 text-white">
          Aktif
        </div>
      </div>
    </div>

    <!-- Plans Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.id"
        :class="[
          'card p-6 relative',
          plan.popular ? 'ring-2 ring-primary-500' : '',
          isActive(plan.id) ? 'bg-primary-50 border-primary-200' : ''
        ]"
      >
        <!-- Popular Badge -->
        <div
          v-if="plan.popular"
          class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full"
        >
          Popular
        </div>

        <!-- Current Badge -->
        <div
          v-if="isActive(plan.id)"
          class="absolute top-4 right-4"
        >
          <Check class="w-5 h-5 text-primary-600" />
        </div>

        <!-- Icon -->
        <div
          :class="[
            'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
            isActive(plan.id) ? 'bg-primary-200' : 'bg-neutral-100'
          ]"
        >
          <component
            :is="plan.icon"
            :class="['w-6 h-6', isActive(plan.id) ? 'text-primary-700' : 'text-neutral-600']"
          />
        </div>

        <!-- Name & Price -->
        <h3 class="text-lg font-semibold text-neutral-900">{{ plan.name }}</h3>
        <div class="mt-2 mb-4">
          <span v-if="plan.price !== null" class="text-3xl font-bold text-neutral-900">
            {{ formatPrice(plan.price) }}
          </span>
          <span v-else class="text-2xl font-bold text-neutral-900">Hubungi Kami</span>
          <span v-if="plan.period" class="text-neutral-500">/{{ plan.period }}</span>
        </div>
        <p class="text-sm text-neutral-600 mb-6">{{ plan.description }}</p>

        <!-- Features -->
        <ul class="space-y-3 mb-6">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-start gap-2 text-sm"
          >
            <Check class="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <span class="text-neutral-700">{{ feature }}</span>
          </li>
        </ul>

        <!-- Action -->
        <button
          v-if="plan.id === 'starter'"
          class="btn-secondary w-full"
          disabled
        >
          Current Plan
        </button>
        <button
          v-else-if="plan.id === 'custom'"
          class="btn-primary w-full"
        >
          Hubungi Sales
        </button>
        <button
          v-else-if="isActive(plan.id)"
          class="btn-secondary w-full"
          disabled
        >
          Paket Aktif
        </button>
        <button
          v-else
          @click="selectPlan(plan.id as 'starter' | 'growth' | 'pro' | 'custom')"
          class="btn-primary w-full"
        >
          Upgrade
        </button>
      </div>
    </div>

    <!-- FAQ -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-neutral-900 mb-4">Pertanyaan Umum</h2>
      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-neutral-900">Apakah bisa downgrade paket?</h3>
          <p class="text-sm text-neutral-600 mt-1">Ya, bisa. Perubahan akan berlaku di billing cycle berikutnya.</p>
        </div>
        <div>
          <h3 class="font-medium text-neutral-900">Bagaimana jika melebihi limit?</h3>
          <p class="text-sm text-neutral-600 mt-1">Kami akan memberitahu kamu sebelum limit tercapai. Kamu bisa upgrade kapan saja.</p>
        </div>
        <div>
          <h3 class="font-medium text-neutral-900">Metode pembayaran apa saja?</h3>
          <p class="text-sm text-neutral-600 mt-1">Transfer bank, QRIS, dan kartu kredit untuk paket berbayar.</p>
        </div>
      </div>
    </div>
  </div>
</template>