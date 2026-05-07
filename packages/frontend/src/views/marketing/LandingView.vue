<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ClipboardCheck,
  FileText,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Phone,
  ScanBarcode,
  Shield,
  Sparkles,
  Truck,
  UploadCloud,
  Warehouse,
  X,
  Zap,
} from 'lucide-vue-next'
import { buildWhatsAppUrl, ownerContact } from '@/lib/contact'

const router = useRouter()
const mobileMenuOpen = ref(false)

const features = [
  {
    icon: Warehouse,
    title: 'Gudang terpisah per tenant',
    description: 'Setiap tenant memiliki gudang, supplier, produk, staff, dan laporan yang tidak tercampur dengan tenant lain.',
  },
  {
    icon: ScanBarcode,
    title: 'Operasi stok harian',
    description: 'Catat stok masuk, keluar, transfer gudang, dan penyesuaian inventori dari desktop maupun perangkat mobile.',
  },
  {
    icon: Bell,
    title: 'Alert stok dan langganan',
    description: 'Notifikasi stok menipis, pengingat langganan, dan status sinkronisasi membantu admin mengambil tindakan cepat.',
  },
  {
    icon: FileText,
    title: 'Import, export, audit trail',
    description: 'Kelola CSV, template import, export laporan, dan jejak audit agar aktivitas penting tetap bisa ditelusuri.',
  },
  {
    icon: Shield,
    title: 'Kontrol akses paket',
    description: 'Fitur tenant mengikuti paket aktif, durasi langganan, add-on, dan aturan akses yang dikendalikan super admin.',
  },
  {
    icon: Zap,
    title: 'PWA siap kerja',
    description: 'Aplikasi ringan, responsif, bisa dipasang seperti app, dan memberi indikator online/offline serta sinkronisasi.',
  },
]

const workflow = [
  {
    title: 'Request trial',
    description: 'Calon tenant mengisi form singkat lalu mengirim data melalui WhatsApp ke kontak resmi.',
  },
  {
    title: 'Aktivasi super admin',
    description: 'Super admin membuat tenant, menentukan paket, durasi, gudang awal, dan akses staff sesuai kebutuhan.',
  },
  {
    title: 'Operasi gudang berjalan',
    description: 'Tenant admin dan operator mulai mengelola produk, stok, supplier, laporan, dan audit aktivitas.',
  },
]

const capabilities = [
  'Multi-tenant dengan data gudang terisolasi',
  'Role super admin, tenant admin, staff, supplier, dan trial',
  'Paket dan izin fitur dapat disesuaikan',
  'Countdown langganan di dashboard dan billing',
  'Mode PWA dengan indikator sinkronisasi',
  'Audit trail untuk perubahan penting',
]

const plans = [
  {
    name: 'Starter',
    description: 'Untuk toko kecil yang mulai merapikan stok.',
    features: ['1 gudang utama', 'Produk dan supplier dasar', 'Stock masuk dan keluar', 'Laporan inventori inti'],
  },
  {
    name: 'Growth',
    description: 'Untuk bisnis yang punya beberapa lokasi atau tim.',
    features: ['Multi gudang', 'Staff dan permission per role', 'Import/export CSV', 'Alert stok menipis'],
    popular: true,
  },
  {
    name: 'Pro',
    description: 'Untuk operasional yang butuh kontrol dan audit lebih lengkap.',
    features: ['Audit trail lengkap', 'Analytics lanjutan', 'Prioritas konfigurasi', 'Add-on sesuai kebutuhan'],
  },
]

const faqs = [
  {
    question: 'Apakah akun trial dibuat otomatis?',
    answer: 'Tidak. Request trial dikirim lewat WhatsApp, lalu super admin mengaktifkan tenant agar data produksi tetap bersih dan akses awal bisa diperiksa.',
  },
  {
    question: 'Apakah data antar tenant terpisah?',
    answer: 'Ya. Gudang, supplier, produk, staff, aktivitas, dan laporan disimpan per tenant sehingga tidak saling berbagi data.',
  },
  {
    question: 'Bisakah durasi langganan diubah?',
    answer: 'Bisa. Super admin dapat menaikkan atau mengurangi durasi langganan dan fitur tenant sesuai paket yang disepakati.',
  },
  {
    question: 'Apakah mendukung import dan export CSV?',
    answer: 'Ya. Template CSV tersedia untuk produk, gudang, supplier, inventori, mutasi stok, dan audit sesuai aturan akses paket.',
  },
]

function goToTrial() {
  router.push('/trial-signup')
  closeMobileMenu()
}

function goToLogin() {
  router.push('/login')
  closeMobileMenu()
}

function openWhatsAppContact() {
  window.open(
    buildWhatsAppUrl('Halo faiznute, saya ingin konsultasi StockPilot dan request aktivasi trial.'),
    '_blank',
    'noopener,noreferrer',
  )
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-white text-neutral-900">
    <nav class="sticky top-0 z-50 border-b border-white/10 bg-primary-700/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <router-link to="/" class="flex items-center gap-3" @click="closeMobileMenu">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Package class="h-6 w-6 text-white" />
          </div>
          <span class="text-xl font-bold text-white">StockPilot</span>
        </router-link>

        <div class="hidden items-center gap-7 md:flex">
          <a href="#features" class="text-sm font-medium text-white/80 transition hover:text-white">Fitur</a>
          <a href="#workflow" class="text-sm font-medium text-white/80 transition hover:text-white">Alur</a>
          <a href="#plans" class="text-sm font-medium text-white/80 transition hover:text-white">Paket</a>
          <a href="#faq" class="text-sm font-medium text-white/80 transition hover:text-white">FAQ</a>
        </div>

        <div class="hidden items-center gap-3 md:flex">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-white/85 hover:text-white" @click="goToLogin">
            Masuk
          </button>
          <button class="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-neutral-100" @click="goToTrial">
            Request Trial
          </button>
        </div>

        <button class="rounded-xl p-2 text-white hover:bg-white/10 md:hidden" @click="toggleMobileMenu">
          <X v-if="mobileMenuOpen" class="h-6 w-6" />
          <Menu v-else class="h-6 w-6" />
        </button>
      </div>

      <div v-if="mobileMenuOpen" class="border-t border-white/10 bg-primary-700 px-4 py-4 md:hidden">
        <div class="flex flex-col gap-2">
          <a href="#features" class="rounded-xl px-3 py-2 text-white/85 hover:bg-white/10" @click="closeMobileMenu">Fitur</a>
          <a href="#workflow" class="rounded-xl px-3 py-2 text-white/85 hover:bg-white/10" @click="closeMobileMenu">Alur</a>
          <a href="#plans" class="rounded-xl px-3 py-2 text-white/85 hover:bg-white/10" @click="closeMobileMenu">Paket</a>
          <a href="#faq" class="rounded-xl px-3 py-2 text-white/85 hover:bg-white/10" @click="closeMobileMenu">FAQ</a>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <button class="rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-white" @click="goToLogin">Masuk</button>
            <button class="rounded-xl bg-white px-4 py-2.5 font-semibold text-primary-700" @click="goToTrial">Trial</button>
          </div>
        </div>
      </div>
    </nav>

    <header class="relative overflow-hidden bg-primary-700">
      <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.34),transparent_30%)]"></div>
      <div class="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section class="flex flex-col justify-center">
          <h1 class="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Kelola gudang, tenant, dan stok dalam satu platform yang rapi.
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-primary-50">
            StockPilot membantu super admin mengatur tenant, paket, dan akses, sementara tenant admin menjalankan operasional gudang harian sesuai fitur yang aktif.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <button class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-primary-700 shadow-lg shadow-primary-950/20 transition hover:bg-neutral-100" @click="goToTrial">
              Request trial via WhatsApp
              <ArrowRight class="h-5 w-5" />
            </button>
            <button class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10" @click="openWhatsAppContact">
              <MessageCircle class="h-5 w-5" />
              Konsultasi paket
            </button>
          </div>
          <div class="mt-8 grid gap-3 text-sm text-primary-50 sm:grid-cols-3">
            <div class="flex items-center gap-2">
              <Shield class="h-4 w-4 text-emerald-200" />
              Akses dikontrol
            </div>
            <div class="flex items-center gap-2">
              <UploadCloud class="h-4 w-4 text-emerald-200" />
              PWA offline sync
            </div>
            <div class="flex items-center gap-2">
              <ClipboardCheck class="h-4 w-4 text-emerald-200" />
              Audit siap telusur
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-primary-950/20 backdrop-blur">
          <div class="rounded-xl bg-white p-5">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <p class="text-sm font-medium text-neutral-500">Panel operasional</p>
                <h2 class="text-xl font-bold text-neutral-900">Ringkasan Gudang</h2>
              </div>
              <div class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Online sync
              </div>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-xl border border-neutral-100 p-4">
                <Warehouse class="mb-3 h-6 w-6 text-primary-600" />
                <p class="text-sm text-neutral-500">Gudang aktif</p>
                <p class="mt-1 text-2xl font-bold">Per tenant</p>
              </div>
              <div class="rounded-xl border border-neutral-100 p-4">
                <BarChart3 class="mb-3 h-6 w-6 text-emerald-600" />
                <p class="text-sm text-neutral-500">Laporan</p>
                <p class="mt-1 text-2xl font-bold">Realtime</p>
              </div>
            </div>
            <div class="mt-5 space-y-3">
              <div class="flex items-center justify-between rounded-xl bg-primary-50 p-4">
                <div class="flex items-center gap-3">
                  <Package class="h-5 w-5 text-primary-700" />
                  <span class="font-semibold">Produk dan supplier</span>
                </div>
                <Check class="h-5 w-5 text-emerald-600" />
              </div>
              <div class="flex items-center justify-between rounded-xl bg-neutral-50 p-4">
                <div class="flex items-center gap-3">
                  <Truck class="h-5 w-5 text-neutral-700" />
                  <span class="font-semibold">Mutasi stok</span>
                </div>
                <Check class="h-5 w-5 text-emerald-600" />
              </div>
              <div class="flex items-center justify-between rounded-xl bg-neutral-50 p-4">
                <div class="flex items-center gap-3">
                  <Sparkles class="h-5 w-5 text-neutral-700" />
                  <span class="font-semibold">Paket dan izin fitur</span>
                </div>
                <Check class="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </header>

    <main>
      <section id="features" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="max-w-3xl">
          <h2 class="text-3xl font-bold tracking-tight text-neutral-900">Fitur inti untuk operasional gudang</h2>
          <p class="mt-4 text-lg leading-8 text-neutral-600">
            Fokusnya bukan data dummy, melainkan alur produksi yang bisa dipakai tenant sungguhan setelah diaktifkan super admin.
          </p>
        </div>
        <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article v-for="feature in features" :key="feature.title" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <component :is="feature.icon" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-neutral-900">{{ feature.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-neutral-600">{{ feature.description }}</p>
          </article>
        </div>
      </section>

      <section id="workflow" class="bg-neutral-50">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <h2 class="text-3xl font-bold text-neutral-900">Alur aktivasi yang aman</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Pendaftaran publik dibuat sebagai request, sehingga tenant produksi hanya muncul setelah disetujui dan dikonfigurasi.
            </p>
            <button class="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700" @click="goToTrial">
              Kirim request trial
              <ArrowRight class="h-5 w-5" />
            </button>
          </div>
          <div class="grid gap-4">
            <article v-for="(item, index) in workflow" :key="item.title" class="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 font-bold text-white">
                {{ index + 1 }}
              </div>
              <div>
                <h3 class="font-bold text-neutral-900">{{ item.title }}</h3>
                <p class="mt-2 text-sm leading-6 text-neutral-600">{{ item.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div class="rounded-2xl bg-neutral-950 p-6 text-white sm:p-8">
          <h2 class="text-2xl font-bold">Siap untuk multi-tier admin</h2>
          <p class="mt-4 leading-7 text-neutral-300">
            Super admin mengelola platform penuh, sedangkan tenant admin hanya melihat fitur sesuai paket dan status langganannya.
          </p>
        </div>
        <div class="grid gap-3">
          <div v-for="item in capabilities" :key="item" class="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <Check class="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <span class="font-medium text-neutral-800">{{ item }}</span>
          </div>
        </div>
      </section>

      <section id="plans" class="bg-primary-50">
        <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div class="max-w-3xl">
            <h2 class="text-3xl font-bold text-neutral-900">Paket disesuaikan oleh super admin</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Durasi langganan, batas fitur, add-on, dan akses tenant bisa dinaikkan atau dikurangi sesuai kebutuhan operasional.
            </p>
          </div>
          <div class="mt-10 grid gap-5 lg:grid-cols-3">
            <article
              v-for="plan in plans"
              :key="plan.name"
              :class="[
                'rounded-xl border bg-white p-6 shadow-sm',
                plan.popular ? 'border-primary-500 ring-2 ring-primary-100' : 'border-neutral-200'
              ]"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-xl font-bold text-neutral-900">{{ plan.name }}</h3>
                  <p class="mt-2 text-sm leading-6 text-neutral-600">{{ plan.description }}</p>
                </div>
                <span v-if="plan.popular" class="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">Populer</span>
              </div>
              <ul class="mt-6 space-y-3">
                <li v-for="item in plan.features" :key="item" class="flex items-start gap-3 text-sm text-neutral-700">
                  <Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  {{ item }}
                </li>
              </ul>
              <button class="mt-6 w-full rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700" @click="openWhatsAppContact">
                Konsultasi paket
              </button>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-neutral-900">Pertanyaan umum</h2>
        <div class="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          <article v-for="item in faqs" :key="item.question" class="p-6">
            <h3 class="font-bold text-neutral-900">{{ item.question }}</h3>
            <p class="mt-2 leading-7 text-neutral-600">{{ item.answer }}</p>
          </article>
        </div>
      </section>

      <section class="bg-neutral-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div class="mx-auto flex max-w-5xl flex-col items-center text-center">
          <h2 class="max-w-3xl text-3xl font-bold">Mulai dari request trial yang rapi, lanjut ke aktivasi tenant yang terkendali.</h2>
          <p class="mt-4 max-w-2xl leading-8 text-neutral-300">
            Kirim data calon tenant ke kontak resmi, lalu super admin menyiapkan akun, paket, dan gudang awal.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <button class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-100" @click="goToTrial">
              Request trial
              <ArrowRight class="h-5 w-5" />
            </button>
            <button class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10" @click="openWhatsAppContact">
              <MessageCircle class="h-5 w-5" />
              WhatsApp
            </button>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-neutral-200 bg-white">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <Package class="h-6 w-6 text-white" />
            </div>
            <span class="text-xl font-bold text-neutral-900">StockPilot</span>
          </div>
          <p class="mt-4 max-w-md text-sm leading-6 text-neutral-600">
            Platform manajemen gudang multi-tenant untuk operasional stok, supplier, laporan, paket, dan audit.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-neutral-900">Kontak resmi</h3>
          <div class="mt-4 space-y-3 text-sm text-neutral-600">
            <div class="flex items-center gap-3">
              <MessageCircle class="h-4 w-4 text-primary-600" />
              {{ ownerContact.name }}
            </div>
            <div class="flex items-center gap-3">
              <Phone class="h-4 w-4 text-primary-600" />
              {{ ownerContact.whatsappLocal }}
            </div>
            <div class="flex items-center gap-3">
              <Mail class="h-4 w-4 text-primary-600" />
              {{ ownerContact.email }}
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-neutral-100 px-4 py-5 text-center text-sm text-neutral-500">
        StockPilot. Semua hak dilindungi.
      </div>
    </footer>
  </div>
</template>
