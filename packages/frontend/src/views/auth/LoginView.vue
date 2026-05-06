<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Package, Eye, EyeOff, Sparkles } from 'lucide-vue-next'

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
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-200 mb-4">
          <Package class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-900">StockPilot</h1>
        <p class="text-neutral-600 mt-1">Kelola gudang dengan mudah</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-xl font-semibold text-neutral-900 mb-6">Masuk</h2>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Email -->
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

          <!-- Password -->
          <div>
            <label class="label">Password</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="input pr-10"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p class="text-sm text-danger-700">{{ error }}</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary w-full py-2.5"
          >
            <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Masuk</span>
          </button>
        </form>
      </div>

      <!-- Trial CTA -->
      <div class="mt-6 bg-white rounded-xl shadow-lg p-6 border border-primary-100">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles class="w-5 h-5 text-primary-600" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-neutral-900">Coba Gratis 7 Hari</h3>
            <p class="text-sm text-neutral-600 mt-1">
              Akses semua fitur Pro gratis selama 7 hari. Tanpa kartu kredit.
            </p>
          </div>
        </div>
        <button
          @click="goToTrial"
          class="btn-primary w-full mt-4"
        >
          Mulai Trial Gratis
        </button>
      </div>

      <!-- Demo Hint -->
      <p class="text-center text-sm text-neutral-500 mt-6">
        Demo: admin@example.com / password123
      </p>
    </div>
  </div>
</template>
