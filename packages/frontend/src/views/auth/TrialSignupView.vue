<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Check, Mail, MessageCircle, Package, Phone, Sparkles } from 'lucide-vue-next'
import { buildWhatsAppUrl, ownerContact } from '@/lib/contact'

const name = ref('')
const whatsapp = ref('')
const email = ref('')
const businessName = ref('')
const error = ref('')
const sent = ref(false)

const benefits = [
  'Konsultasi kebutuhan gudang sebelum akun dibuat',
  'Setup tenant dan gudang dipandu oleh super admin',
  'Akses trial dipastikan sesuai paket dan izin yang aktif',
  'Tidak ada akun otomatis yang masuk ke sistem produksi',
]

const normalizedWhatsapp = computed(() => whatsapp.value.replace(/[^\d+]/g, ''))

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildMessage() {
  return [
    'Halo faiznute, saya ingin request akun trial StockPilot.',
    '',
    `Nama: ${name.value.trim()}`,
    `WhatsApp: ${normalizedWhatsapp.value}`,
    `Email: ${email.value.trim().toLowerCase()}`,
    businessName.value.trim() ? `Nama bisnis: ${businessName.value.trim()}` : 'Nama bisnis: -',
    '',
    'Mohon dibantu aktivasi trial dan informasi paket yang sesuai.',
  ].join('\n')
}

function submitTrialRequest() {
  error.value = ''

  if (!name.value.trim() || !normalizedWhatsapp.value || !email.value.trim()) {
    error.value = 'Nama, nomor WhatsApp, dan email wajib diisi.'
    return
  }

  if (normalizedWhatsapp.value.length < 9) {
    error.value = 'Nomor WhatsApp belum valid.'
    return
  }

  if (!isValidEmail(email.value.trim())) {
    error.value = 'Format email belum valid.'
    return
  }

  sent.value = true
  window.open(buildWhatsAppUrl(buildMessage()), '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-white">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.35),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.22),transparent_30%)]"></div>

    <main class="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <router-link
        to="/"
        class="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-200 hover:bg-white/10"
      >
        <ArrowLeft class="h-4 w-4" />
        Kembali ke beranda
      </router-link>

      <div class="grid flex-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section class="space-y-8">
          <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-xl shadow-primary-900/40">
            <Package class="h-8 w-8" />
          </div>
          <div>
            <h1 class="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Request trial StockPilot lewat WhatsApp
            </h1>
            <p class="mt-5 max-w-xl text-lg leading-8 text-neutral-300">
              Isi data singkat, lalu sistem akan membuka WhatsApp dengan pesan siap kirim ke kontak resmi. Akun trial dibuat manual agar akses tetap aman dan hanya super admin yang mengaktifkan tenant.
            </p>
          </div>

          <div class="grid gap-3">
            <div
              v-for="benefit in benefits"
              :key="benefit"
              class="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200"
            >
              <Check class="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
              <span>{{ benefit }}</span>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p class="text-sm font-semibold text-white">Kontak aktivasi</p>
            <div class="mt-4 grid gap-3 text-sm text-neutral-300">
              <div class="flex items-center gap-3">
                <MessageCircle class="h-4 w-4 text-emerald-300" />
                {{ ownerContact.name }}
              </div>
              <div class="flex items-center gap-3">
                <Phone class="h-4 w-4 text-emerald-300" />
                {{ ownerContact.whatsappLocal }}
              </div>
              <div class="flex items-center gap-3">
                <Mail class="h-4 w-4 text-emerald-300" />
                {{ ownerContact.email }}
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[1.5rem] border border-white/10 bg-white p-5 text-neutral-900 shadow-2xl sm:p-8">
          <div class="mb-6 flex items-start gap-4">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Sparkles class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-2xl font-bold">Form request trial</h2>
              <p class="mt-1 text-sm text-neutral-600">Data ini akan dikirim lewat WhatsApp, bukan membuat akun otomatis.</p>
            </div>
          </div>

          <form class="space-y-5" @submit.prevent="submitTrialRequest">
            <div>
              <label class="label">Nama lengkap</label>
              <input v-model="name" type="text" class="input" placeholder="Nama Anda" autocomplete="name" />
            </div>
            <div>
              <label class="label">Nomor WhatsApp</label>
              <input v-model="whatsapp" type="tel" class="input" placeholder="08xxxxxxxxxx" autocomplete="tel" />
            </div>
            <div>
              <label class="label">Email</label>
              <input v-model="email" type="email" class="input" placeholder="nama@email.com" autocomplete="email" />
            </div>
            <div>
              <label class="label">Nama bisnis <span class="text-neutral-400">(opsional)</span></label>
              <input v-model="businessName" type="text" class="input" placeholder="Nama toko atau perusahaan" autocomplete="organization" />
            </div>

            <div v-if="error" class="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
              {{ error }}
            </div>
            <div v-if="sent" class="rounded-xl border border-success-200 bg-success-50 p-3 text-sm text-success-700">
              WhatsApp sudah dibuka. Silakan kirim pesan yang sudah disiapkan.
            </div>

            <button type="submit" class="btn-primary w-full py-3 text-base">
              <MessageCircle class="h-5 w-5" />
              Kirim request via WhatsApp
            </button>
          </form>

          <p class="mt-5 text-center text-sm text-neutral-500">
            Sudah punya akun super admin?
            <router-link to="/login" class="font-semibold text-primary-600 hover:text-primary-700">Masuk</router-link>
          </p>
        </section>
      </div>
    </main>
  </div>
</template>
