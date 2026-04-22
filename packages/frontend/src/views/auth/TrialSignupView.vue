<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Package, Sparkles, Check, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const acceptedTerms = ref(false)

const features = [
  'Akses semua fitur Pro',
  'Unlimited gudang',
  'Unlimited produk',
  'Export PDF & CSV',
  'Analytics lengkap',
  '7 hari gratis',
]

async function handleTrialSignup() {
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

  if (!acceptedTerms.value) {
    error.value = 'Anda harus menyetujui syarat & ketentuan'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await new Promise(resolve => setTimeout(resolve, 800))
    authStore.trialSignup(name.value, email.value)
    router.push('/app')
  } catch (e) {
    error.value = 'Pendaftaran gagal'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
    <div class="max-w-5xl mx-auto">
      <!-- Back -->
      <router-link
        to="/login"
        class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-8"
      >
        <ArrowLeft class="w-4 h-4" />
        Kembali ke Login
      </router-link>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Left: Benefits -->
        <div class="hidden lg:block">
          <div class="sticky top-8">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 rounded-full text-primary-700 text-sm font-medium mb-6">
              <Sparkles class="w-4 h-4" />
              Trial 7 Hari
            </div>
            <h1 class="text-4xl font-bold text-neutral-900 mb-4">
              Coba Semua Fitur Pro Gratis
            </h1>
            <p class="text-lg text-neutral-600 mb-8">
              Dapatkan akses penuh ke semua fitur StockPilot selama 7 hari. Tanpa kartu kredit, tanpa komitmen.
            </p>

            <!-- Features List -->
            <div class="space-y-4">
              <div
                v-for="feature in features"
                :key="feature"
                class="flex items-center gap-3"
              >
                <div class="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check class="w-4 h-4 text-success-600" />
                </div>
                <span class="text-neutral-700">{{ feature }}</span>
              </div>
            </div>

            <!-- Trust Badges -->
            <div class="mt-12 p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Package class="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p class="font-semibold text-neutral-900">Dipercaya 1000+ UMKM</p>
                  <p class="text-sm text-neutral-500">Bergabung dengan bisnis lain yang sudah menggunakan StockPilot</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Signup Form -->
        <div>
          <div class="bg-white rounded-2xl shadow-xl p-8">
            <h2 class="text-2xl font-bold text-neutral-900 mb-2">Buat Akun Trial</h2>
            <p class="text-neutral-600 mb-6">Isi form di bawah untuk memulai trial 7 hari</p>

            <form @submit.prevent="handleTrialSignup" class="space-y-5">
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

              <!-- Terms -->
              <div class="flex items-start gap-3">
                <input
                  v-model="acceptedTerms"
                  type="checkbox"
                  id="terms"
                  class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 mt-1"
                />
                <label for="terms" class="text-sm text-neutral-600">
                  Saya menyetujui <a href="#" class="text-primary-600 hover:underline">Syarat & Ketentuan</a> serta <a href="#" class="text-primary-600 hover:underline">Kebijakan Privasi</a>
                </label>
              </div>

              <!-- Error -->
              <div v-if="error" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p class="text-sm text-danger-700">{{ error }}</p>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="isLoading"
                class="btn-primary w-full py-3 text-base"
              >
                <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else>Mulai Trial Gratis 7 Hari</span>
              </button>
            </form>

            <!-- Login Link -->
            <p class="text-center text-sm text-neutral-600 mt-6">
              Sudah punya akun?
              <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-700">
                Masuk
              </router-link>
            </p>
          </div>

          <!-- Mobile Features -->
          <div class="lg:hidden mt-6 bg-white rounded-xl p-6 border border-neutral-100">
            <h3 class="font-semibold text-neutral-900 mb-4">Fitur Trial</h3>
            <div class="space-y-3">
              <div
                v-for="feature in features"
                :key="feature"
                class="flex items-center gap-2 text-sm"
              >
                <Check class="w-4 h-4 text-success-600" />
                <span class="text-neutral-700">{{ feature }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>