<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Eye, EyeOff, Package, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Email dan password harus diisi'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login(email.value, password.value)
    router.push(authStore.homeRoute)
  } catch (e) {
    error.value = 'Email atau password salah'
  } finally {
    isLoading.value = false
  }
}

function goToTrial() {
  router.push({ name: 'trial-signup' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-200">
          <Package class="h-10 w-10 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-900">StockPilot</h1>
        <p class="mt-1 text-neutral-600">Kelola gudang dengan mudah</p>
      </div>

      <div class="rounded-2xl bg-white p-8 shadow-xl">
        <h2 class="mb-6 text-xl font-semibold text-neutral-900">Masuk</h2>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <div>
            <label class="label">Email</label>
            <input
              v-model="email"
              type="email"
              class="input"
              placeholder="nama@email.com"
              autocomplete="email"
            />
          </div>

          <div>
            <label class="label">Password</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="input pr-10"
                placeholder="Password"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div v-if="error" class="rounded-lg border border-danger-200 bg-danger-50 p-3">
            <p class="text-sm text-danger-700">{{ error }}</p>
          </div>

          <button type="submit" :disabled="isLoading" class="btn-primary w-full py-2.5">
            <span v-if="isLoading" class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span v-else>Masuk</span>
          </button>
        </form>
      </div>

      <div class="mt-6 rounded-xl border border-primary-100 bg-white p-6 shadow-lg">
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Sparkles class="h-5 w-5 text-primary-600" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-neutral-900">Request trial resmi</h3>
            <p class="mt-1 text-sm text-neutral-600">
              Kirim data lewat WhatsApp. Tenant dan paket akan diaktifkan oleh super admin.
            </p>
          </div>
        </div>
        <button class="btn-primary mt-4 w-full" @click="goToTrial">
          Request Trial via WhatsApp
        </button>
      </div>
    </div>
  </div>
</template>
