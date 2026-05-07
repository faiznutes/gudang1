<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementsStore } from '@/stores/entitlements'
import { usePlansStore, PLANS, type Plan } from '@/stores/plans'
import { Check, Sparkles, Building2, Rocket, Crown, Clock } from 'lucide-vue-next'
import SubscriptionCountdownCard from '@/components/SubscriptionCountdownCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const entitlementsStore = useEntitlementsStore()
const plansStore = usePlansStore()

const currentPlan = computed(() => entitlementsStore.currentPlan || authStore.workspace?.plan || 'free')

const featureNames: Record<string, string> = {
  stockInOut: 'Stock Masuk/Keluar',
  multiWarehouse: 'Multi Gudang',
  analytics: 'Analytics',
  exportPDF: 'Export PDF',
  batchImport: 'Import CSV',
  reports: 'Laporan',
}

const featureColumns = ['stockInOut', 'multiWarehouse', 'analytics', 'exportPDF', 'batchImport', 'reports']

function isActive(planId: string) {
  return currentPlan.value === planId
}

async function selectPlan(planId: string) {
  if (planId === 'free') return
  await authStore.upgradePlan(planId as any)
}

function goToTrial() {
  router.push('/trial-signup')
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return 'Gratis'
  return 'Rp ' + price.toLocaleString('id-ID')
}

function hasPromo(plan: Plan): boolean {
  return !!plan.originalPrice && !!plan.price && plan.originalPrice > plan.price
}

function getFeatureValue(plan: Plan, feature: string): boolean {
  return (plan.features as any)[feature] || false
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">Billing & Paket</h1>
      <p class="text-neutral-600">Pilih paket yang sesuai dengan kebutuhan bisnismu</p>
    </div>

    <!-- Current Plan Banner -->
    <div class="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p class="text-primary-200 text-sm">Paket Saat Ini</p>
          <h2 class="text-2xl font-bold">{{ plansStore.getPlanById(currentPlan)?.name }}</h2>
          <p v-if="currentPlan !== 'custom'" class="text-primary-200">
            {{ currentPlan === 'free' ? 'Gratis selamanya' : `${formatPrice(plansStore.getPlanById(currentPlan)?.price || 0)}/bulan` }}
          </p>
        </div>
        <div v-if="currentPlan !== 'custom'" class="flex items-center gap-2">
          <span class="bg-white/20 px-3 py-1 rounded-full text-sm">Aktif</span>
        </div>
      </div>
    </div>

    <SubscriptionCountdownCard />

    <!-- Plans Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="plan in PLANS"
        :key="plan.id"
        :class="[
          'card p-6 relative',
          plan.id === 'growth' ? 'ring-2 ring-primary-500' : '',
          isActive(plan.id) ? 'bg-primary-50 border-primary-200' : ''
        ]"
      >
        <div v-if="plan.id === 'growth'" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
          Promo
        </div>

        <div v-if="isActive(plan.id)" class="absolute top-4 right-4">
          <Check class="w-5 h-5 text-primary-600" />
        </div>

        <div :class="['w-12 h-12 rounded-xl flex items-center justify-center mb-4', isActive(plan.id) ? 'bg-primary-200' : 'bg-neutral-100']">
          <component :is="plan.id === 'free' ? Sparkles : plan.id === 'starter' ? Building2 : plan.id === 'growth' ? Rocket : Crown" :class="['w-6 h-6', isActive(plan.id) ? 'text-primary-700' : 'text-neutral-600']" />
        </div>

        <h3 class="text-lg font-semibold text-neutral-900">{{ plan.name }}</h3>
        <div class="mt-2 mb-4">
          <div v-if="hasPromo(plan)" class="text-sm font-medium text-neutral-400 line-through">
            {{ formatPrice(plan.originalPrice || 0) }}
          </div>
          <span class="text-3xl font-bold text-neutral-900">{{ formatPrice(plan.price) }}</span>
          <span v-if="plan.period" class="text-neutral-500">/{{ plan.period }}</span>
          <p v-if="hasPromo(plan)" class="mt-1 text-xs font-medium text-success-700">
            Diskon dari {{ formatPrice(plan.originalPrice || 0) }}/bulan
          </p>
        </div>
        <p class="text-sm text-neutral-600 mb-6">{{ plan.description }}</p>

        <div class="mb-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div class="rounded-lg bg-neutral-50 p-2">
            <p class="font-bold text-neutral-900">{{ plan.warehouses >= 999 ? 'Unlimited' : plan.warehouses }}</p>
            <p class="text-neutral-500">Gudang</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-2">
            <p class="font-bold text-neutral-900">{{ plan.products >= 99999 ? 'Unlimited' : plan.products.toLocaleString('id-ID') }}</p>
            <p class="text-neutral-500">Produk</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-2">
            <p class="font-bold text-neutral-900">{{ plan.users >= 999 ? 'Unlimited' : plan.users }}</p>
            <p class="text-neutral-500">User</p>
          </div>
        </div>

        <ul class="space-y-3 mb-6">
          <li
            v-for="feature in Object.entries(plan.features).filter(([_, v]) => v)"
            :key="feature[0]"
            class="flex items-start gap-2 text-sm"
          >
            <Check class="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <span class="text-neutral-700">{{ featureNames[feature[0]] || feature[0] }}</span>
          </li>
        </ul>

        <button
          v-if="plan.id === 'free'"
          class="btn-secondary w-full"
          disabled
        >
          Current Plan
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
          @click="selectPlan(plan.id)"
          class="btn-primary w-full"
        >
          Upgrade
        </button>
      </div>
    </div>

    <!-- Feature Comparison Table -->
    <div class="card overflow-hidden">
      <div class="p-4 border-b border-neutral-100">
        <h2 class="font-semibold text-neutral-900">Perbandingan Fitur</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="table-header text-left">Fitur</th>
              <th v-for="plan in PLANS" :key="plan.id" class="table-header text-center">{{ plan.name }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="feature in featureColumns"
              :key="feature"
              class="hover:bg-neutral-50"
            >
              <td class="table-cell font-medium">{{ featureNames[feature] }}</td>
              <td v-for="plan in PLANS" :key="plan.id" class="table-cell text-center">
                <div v-if="getFeatureValue(plan, feature)" class="flex justify-center">
                  <Check class="w-5 h-5 text-success-600" />
                </div>
                <span v-else class="text-neutral-300">×</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Trial CTA -->
    <div class="card p-6 bg-primary-50 border-primary-200">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <h3 class="font-semibold text-primary-900 flex items-center gap-2">
            <Clock class="w-5 h-5" />
            Belum yakin dengan paket?
          </h3>
          <p class="text-sm text-primary-700 mt-1">
            Kirim request trial lewat WhatsApp agar super admin bisa menyiapkan paket dan durasi yang sesuai.
          </p>
        </div>
        <button @click="goToTrial" class="btn-primary">
          Request Trial
        </button>
      </div>
    </div>

    <!-- FAQ -->
    <div class="card p-6">
      <h2 class="font-semibold text-neutral-900 mb-4">Pertanyaan Umum</h2>
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
