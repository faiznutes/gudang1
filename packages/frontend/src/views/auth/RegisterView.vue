<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Package, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

async function handleRegister() {
  if (!name.value || !email.value || !password.value) {
    error.value = 'Semua field harus diisi'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Password tidak cocok'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password minimal 6 karakter'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await new Promise(resolve => setTimeout(resolve, 800))
    authStore.register(name.value, email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = 'Pendaftaran gagal'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Back -->
      <router-link
        :to="{ name: 'login' }"
        class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft class="w-4 h-4" />
        Kembali ke login
      </router-link>

      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-200 mb-4">
          <Package class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-900">StockPilot</h1>
        <p class="text-neutral-600 mt-1">Kelola gudang dengan mudah</p>
      </div>

      <!-- Register Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-xl font-semibold text-neutral-900 mb-6">Daftar akun baru</h2>

        <form @submit.prevent="handleRegister" class="space-y-5">
          <!-- Name -->
          <div>
            <label class="label">Nama Lengkap</label>
            <input
              v-model="name"
              type="text"
              class="input"
              placeholder="Budi Santoso"
              autocomplete="name"
            />
          </div>

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
                autocomplete="new-password"
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

          <!-- Confirm Password -->
          <div>
            <label class="label">Konfirmasi Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="input"
              placeholder="••••••••"
              autocomplete="new-password"
            />
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
            <span v-else>Daftar</span>
          </button>
        </form>

        <!-- Login Link -->
        <p class="text-center text-sm text-neutral-600 mt-6">
          Sudah punya akun?
          <router-link :to="{ name: 'login' }" class="font-medium text-primary-600 hover:text-primary-700">
            Masuk
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>