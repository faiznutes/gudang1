<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GitBranch,
  LineChart,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-vue-next'
import { buildWhatsAppUrl, ownerContact } from '@/lib/contact'

const router = useRouter()
const mobileMenuOpen = ref(false)

const socialProofStats = [
  { value: '500+', label: 'sesi konsultasi terstruktur' },
  { value: '30+', label: 'jenis alur operasional' },
  { value: 'Enterprise-ready', label: 'role, approval, reporting' },
]

const trustedClients = [
  'Enterprise Client',
  'Tech Company',
  'Logistics Partner',
  'Retail Group',
  'Finance Office',
  'Corporate HQ',
]

const painPoints = [
  {
    icon: Target,
    title: 'Bingung memilih paket yang tepat',
    description: 'Tim butuh arahan yang jelas antara kebutuhan gudang, jumlah user, cabang, dan fitur yang benar-benar dipakai.',
  },
  {
    icon: Users,
    title: 'Kebutuhan tiap divisi berbeda',
    description: 'Operasional, finance, procurement, dan kantor pusat sering membutuhkan level akses dan laporan yang berbeda.',
  },
  {
    icon: Building2,
    title: 'Sulit scaling untuk banyak cabang',
    description: 'Saat cabang bertambah, struktur tenant, gudang, staff, dan approval perlu tetap rapi tanpa pekerjaan manual berulang.',
  },
  {
    icon: ClipboardCheck,
    title: 'Butuh approval dan reporting rapi',
    description: 'Manajemen memerlukan monitoring, audit trail, dan ringkasan yang mudah dipakai untuk pengambilan keputusan.',
  },
]

const consultationPlans = [
  {
    name: 'Starter Consultation',
    eyebrow: 'Untuk bisnis yang mulai menata operasional',
    price: 'Rp250.000',
    period: '/bulan',
    highlight: false,
    suitedFor: 'Cocok untuk toko, gudang kecil, atau tim awal yang butuh struktur stok yang lebih disiplin.',
    benefits: ['Mapping kebutuhan gudang utama', 'Setup user dasar dan alur stok', 'Arahan laporan inventori inti'],
    outputs: ['Rekomendasi paket Starter', 'Struktur gudang awal', 'Checklist operasional harian'],
    cta: 'Konsultasikan Starter',
  },
  {
    name: 'Business Consultation',
    eyebrow: 'Untuk bisnis multi-lokasi dan tim berkembang',
    price: 'Rp300.000',
    originalPrice: 'Rp500.000',
    period: '/bulan',
    highlight: true,
    suitedFor: 'Cocok untuk bisnis dengan beberapa gudang, staff lintas role, dan kebutuhan monitoring yang mulai meningkat.',
    benefits: ['Desain struktur multi-gudang', 'Role dan permission per tim', 'Rekomendasi analytics operasional'],
    outputs: ['Rekomendasi paket Growth', 'Mapping cabang dan divisi', 'Rencana aktivasi bertahap'],
    cta: 'Lihat Rekomendasi Growth',
  },
  {
    name: 'Enterprise Consultation',
    eyebrow: 'Untuk organisasi besar dan kontrol menyeluruh',
    price: 'Rp500.000',
    period: '/bulan',
    highlight: false,
    suitedFor: 'Cocok untuk kantor pusat, banyak cabang, dan kebutuhan audit, import/export, serta governance lebih kuat.',
    benefits: ['Audit trail dan reporting lengkap', 'Batch import dan export workflow', 'Kontrol paket, durasi, dan add-on'],
    outputs: ['Rekomendasi paket Pro', 'Matrix akses enterprise', 'Roadmap governance platform'],
    cta: 'Jadwalkan Diskusi Pro',
  },
  {
    name: 'Custom Corporate Package',
    eyebrow: 'Untuk kebutuhan khusus dan rollout enterprise',
    price: 'By discussion',
    period: '',
    highlight: false,
    suitedFor: 'Cocok untuk perusahaan dengan approval khusus, integrasi, skema tenant kompleks, atau kebutuhan custom workflow.',
    benefits: ['Sesi discovery lebih dalam', 'Custom role dan approval path', 'Rencana integrasi dan rollout'],
    outputs: ['Proposal struktur corporate', 'Scope implementasi', 'Estimasi timeline dan prioritas'],
    cta: 'Konsultasikan Corporate',
  },
]

const adminRoles = [
  {
    role: 'Super Admin',
    scope: 'Platform penuh',
    badges: ['Tenant', 'Paket', 'Billing', 'Audit'],
  },
  {
    role: 'Admin Kantor Pusat',
    scope: 'Monitoring lintas cabang',
    badges: ['Dashboard', 'Approval', 'Report'],
  },
  {
    role: 'Admin Cabang',
    scope: 'Gudang dan staff cabang',
    badges: ['Stock', 'Supplier', 'User'],
  },
  {
    role: 'Admin Divisi',
    scope: 'Akses sesuai fungsi',
    badges: ['Finance', 'Procurement', 'Ops'],
  },
  {
    role: 'Viewer / Approver',
    scope: 'Lihat laporan dan persetujuan',
    badges: ['Read-only', 'Review', 'Sign-off'],
  },
]

const workflow = [
  {
    title: 'Analisis kebutuhan',
    description: 'Kami memetakan jumlah cabang, gudang, role, volume stok, dan laporan yang dibutuhkan tim.',
  },
  {
    title: 'Rekomendasi paket',
    description: 'Setiap tenant mendapat rekomendasi paket dan durasi yang sesuai, bukan pilihan fitur yang dipaksakan.',
  },
  {
    title: 'Setup struktur admin',
    description: 'Super admin, kantor pusat, cabang, divisi, staff, viewer, dan approver disusun dalam matrix akses yang jelas.',
  },
  {
    title: 'Implementasi',
    description: 'Tenant, gudang, supplier, staff, produk, dan alur stok disiapkan agar tim bisa langsung beroperasi.',
  },
  {
    title: 'Monitoring dan optimasi',
    description: 'Penggunaan fitur, laporan, subscription, dan kebutuhan upgrade dievaluasi secara berkala.',
  },
]

const enterpriseBenefits = [
  'Fleksibel untuk banyak cabang dan tenant',
  'Role dan permission management yang jelas',
  'Konsultasi paket sesuai kebutuhan bisnis',
  'Laporan dan monitoring untuk manajemen',
  'Scalable untuk tim besar dan multi-divisi',
  'Siap integrasi atau custom workflow',
]

const testimonials = [
  {
    quote: 'Tim kami akhirnya bisa memilih struktur paket yang sesuai untuk beberapa cabang tanpa proses manual yang berulang.',
    person: 'Operations Lead',
    company: 'Retail Group',
  },
  {
    quote: 'Yang paling membantu adalah mapping role. Kantor pusat tetap punya kontrol, cabang tetap bisa bergerak cepat.',
    person: 'Business Admin',
    company: 'Enterprise Client',
  },
  {
    quote: 'Konsultasinya membuat keputusan paket lebih mudah dijelaskan ke finance dan tim operasional.',
    person: 'Project Coordinator',
    company: 'Logistics Partner',
  },
]

const faqs = [
  {
    question: 'Apakah ini halaman pembelian paket otomatis?',
    answer: 'Tidak. Fokusnya konsultasi agar paket, durasi, dan akses tenant disiapkan sesuai kebutuhan bisnis sebelum aktivasi.',
  },
  {
    question: 'Apakah data antar tenant tetap terpisah?',
    answer: 'Ya. Gudang, supplier, produk, staff, aktivitas, dan laporan berada di ruang tenant masing-masing.',
  },
  {
    question: 'Bisakah struktur admin dibuat bertingkat?',
    answer: 'Bisa. Super admin dapat mengatur tenant admin, admin cabang, divisi, staff, viewer, dan approval sesuai paket aktif.',
  },
  {
    question: 'Apakah Growth tetap promo Rp300.000?',
    answer: 'Ya. Growth ditampilkan sebagai promo dari Rp500.000 menjadi Rp300.000 per bulan, dengan fitur sesuai entitlement paket Growth.',
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

function scrollToPlans() {
  document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })
  closeMobileMenu()
}

function openWhatsAppContact(message = 'Halo faiznute, saya ingin konsultasi paket StockPilot untuk kebutuhan bisnis.') {
  window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer')
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[#f7fbff] text-neutral-900">
    <nav class="sticky top-0 z-50 border-b border-sky-100/80 bg-white/90 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <router-link to="/" class="flex items-center gap-3" @click="closeMobileMenu">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-emerald-500 shadow-lg shadow-primary-700/20">
            <Package class="h-6 w-6 text-white" />
          </div>
          <div>
            <span class="block text-lg font-black tracking-tight text-neutral-950">StockPilot</span>
            <span class="hidden text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400 sm:block">Consulting Desk</span>
          </div>
        </router-link>

        <div class="hidden items-center gap-7 lg:flex">
          <a href="#trusted" class="text-sm font-semibold text-neutral-600 transition hover:text-primary-700">Trusted by</a>
          <a href="#problems" class="text-sm font-semibold text-neutral-600 transition hover:text-primary-700">Masalah</a>
          <a href="#plans" class="text-sm font-semibold text-neutral-600 transition hover:text-primary-700">Paket</a>
          <a href="#admin" class="text-sm font-semibold text-neutral-600 transition hover:text-primary-700">Multi-tier</a>
          <a href="#workflow" class="text-sm font-semibold text-neutral-600 transition hover:text-primary-700">Workflow</a>
        </div>

        <div class="hidden items-center gap-3 md:flex">
          <button class="rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950" @click="goToLogin">
            Masuk Admin
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-neutral-950/15 transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-primary-700/25" @click="openWhatsAppContact()">
            Konsultasikan Kebutuhan
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>

        <button class="rounded-xl p-2 text-neutral-800 transition hover:bg-neutral-100 md:hidden" aria-label="Buka menu navigasi" @click="toggleMobileMenu">
          <X v-if="mobileMenuOpen" class="h-6 w-6" />
          <Menu v-else class="h-6 w-6" />
        </button>
      </div>

      <div v-if="mobileMenuOpen" class="border-t border-neutral-100 bg-white px-4 py-4 md:hidden">
        <div class="grid gap-2">
          <a href="#trusted" class="rounded-xl px-3 py-3 font-semibold text-neutral-700 hover:bg-neutral-50" @click="closeMobileMenu">Trusted by</a>
          <a href="#problems" class="rounded-xl px-3 py-3 font-semibold text-neutral-700 hover:bg-neutral-50" @click="closeMobileMenu">Masalah</a>
          <a href="#plans" class="rounded-xl px-3 py-3 font-semibold text-neutral-700 hover:bg-neutral-50" @click="closeMobileMenu">Paket Konsultasi</a>
          <a href="#admin" class="rounded-xl px-3 py-3 font-semibold text-neutral-700 hover:bg-neutral-50" @click="closeMobileMenu">Multi-tier Admin</a>
          <button class="mt-2 rounded-xl border border-neutral-200 px-4 py-3 font-bold text-neutral-700" @click="goToLogin">Masuk Admin</button>
          <button class="rounded-xl bg-neutral-950 px-4 py-3 font-bold text-white" @click="openWhatsAppContact()">Konsultasikan Kebutuhan</button>
        </div>
      </div>
    </nav>

    <header class="relative bg-[linear-gradient(135deg,#f8fcff_0%,#eef8ff_44%,#f7fff8_100%)]">
      <div class="absolute inset-0 opacity-[0.42] [background-image:linear-gradient(rgba(2,132,199,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(2,132,199,0.12)_1px,transparent_1px)] [background-size:44px_44px]"></div>
      <div class="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-20">
        <section class="max-w-3xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-4 py-2 text-sm font-bold text-primary-800 shadow-sm backdrop-blur">
            <Sparkles class="h-4 w-4 text-emerald-600" />
            Dipercaya oleh tim operasional, HR, dan bisnis skala besar
          </div>

          <h1 class="mt-7 text-4xl font-black leading-[1.05] tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
            Solusi konsultasi paket untuk operasional bisnis yang lebih terstruktur.
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Kami membantu perusahaan memilih paket, struktur admin, cabang, approval, dan fitur StockPilot yang sesuai sebelum tenant diaktifkan.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <button class="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-700 px-6 py-4 font-bold text-white shadow-xl shadow-primary-700/20 transition hover:-translate-y-0.5 hover:bg-primary-800" @click="openWhatsAppContact('Halo faiznute, saya ingin konsultasi kebutuhan paket StockPilot.')">
              Konsultasikan Kebutuhan
              <ArrowRight class="h-5 w-5 transition group-hover:translate-x-1" />
            </button>
            <button class="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white/85 px-6 py-4 font-bold text-neutral-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-800" @click="scrollToPlans">
              Lihat Rekomendasi Paket
              <ChevronRight class="h-5 w-5" />
            </button>
          </div>

          <div class="mt-10 grid gap-3 sm:grid-cols-3">
            <div v-for="stat in socialProofStats" :key="stat.label" class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-soft">
              <p class="text-2xl font-black text-neutral-950">{{ stat.value }}</p>
              <p class="mt-1 text-sm leading-5 text-neutral-500">{{ stat.label }}</p>
            </div>
          </div>
        </section>

        <section class="relative">
          <div class="absolute -inset-4 rounded-[2rem] bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(34,197,94,0.16),rgba(245,158,11,0.10))] blur-2xl"></div>
          <div class="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-2xl shadow-sky-900/10 backdrop-blur-xl">
            <div class="rounded-[1.45rem] border border-neutral-100 bg-white">
              <div class="flex items-center justify-between border-b border-neutral-100 p-5">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.22em] text-primary-600">Consultation Preview</p>
                  <h2 class="mt-1 text-xl font-black text-neutral-950">Paket & Admin Blueprint</h2>
                </div>
                <div class="rounded-full bg-success-50 px-3 py-1 text-xs font-bold text-success-700">
                  Ready
                </div>
              </div>

              <div class="grid gap-4 p-5">
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-2xl bg-primary-50 p-4">
                    <Building2 class="h-5 w-5 text-primary-700" />
                    <p class="mt-3 text-xs font-semibold text-neutral-500">Cabang</p>
                    <p class="text-2xl font-black text-neutral-950">Multi</p>
                  </div>
                  <div class="rounded-2xl bg-emerald-50 p-4">
                    <Shield class="h-5 w-5 text-emerald-700" />
                    <p class="mt-3 text-xs font-semibold text-neutral-500">Role</p>
                    <p class="text-2xl font-black text-neutral-950">5 level</p>
                  </div>
                  <div class="rounded-2xl bg-amber-50 p-4">
                    <LineChart class="h-5 w-5 text-amber-700" />
                    <p class="mt-3 text-xs font-semibold text-neutral-500">Report</p>
                    <p class="text-2xl font-black text-neutral-950">Live</p>
                  </div>
                </div>

                <div class="rounded-2xl border border-neutral-100 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-bold text-neutral-950">Rekomendasi awal</p>
                      <p class="text-sm text-neutral-500">Business Consultation</p>
                    </div>
                    <span class="rounded-full bg-primary-100 px-3 py-1 text-xs font-black text-primary-800">Growth</span>
                  </div>
                  <div class="mt-4 space-y-3">
                    <div>
                      <div class="mb-1 flex justify-between text-xs font-bold text-neutral-500">
                        <span>Multi-gudang</span>
                        <span>85%</span>
                      </div>
                      <div class="h-2 rounded-full bg-neutral-100">
                        <div class="h-2 w-[85%] rounded-full bg-primary-600"></div>
                      </div>
                    </div>
                    <div>
                      <div class="mb-1 flex justify-between text-xs font-bold text-neutral-500">
                        <span>Permission matrix</span>
                        <span>78%</span>
                      </div>
                      <div class="h-2 rounded-full bg-neutral-100">
                        <div class="h-2 w-[78%] rounded-full bg-emerald-500"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl bg-neutral-950 p-4 text-white">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Approval flow</p>
                    <div class="mt-4 flex items-center gap-2 text-sm font-semibold">
                      <span class="rounded-full bg-white/12 px-3 py-1">Cabang</span>
                      <ArrowRight class="h-4 w-4 text-white/40" />
                      <span class="rounded-full bg-white/12 px-3 py-1">Pusat</span>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-neutral-100 p-4">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Next step</p>
                    <p class="mt-3 text-sm font-bold text-neutral-900">Jadwalkan diskusi paket dan durasi subscription.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </header>

    <main>
      <section id="trusted" class="border-y border-neutral-100 bg-white/80">
        <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="max-w-md">
              <p class="text-sm font-black uppercase tracking-[0.22em] text-neutral-400">Trusted by teams like</p>
              <p class="mt-2 text-lg font-bold text-neutral-900">Area logo placeholder untuk brand enterprise, corporate office, dan partner nasional.</p>
            </div>
            <div class="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div v-for="client in trustedClients" :key="client" class="flex min-h-20 items-center justify-center rounded-2xl border border-neutral-100 bg-neutral-50 px-4 text-center text-xs font-black uppercase tracking-[0.16em] text-neutral-400 grayscale transition hover:-translate-y-0.5 hover:bg-white hover:text-neutral-600 hover:shadow-soft">
                {{ client }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problems" class="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <div class="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Masalah yang diselesaikan</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Keputusan paket tidak boleh bergantung pada tebakan.</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Kami menyusun kebutuhan bisnis menjadi struktur paket, role, cabang, dan reporting yang bisa dijalankan tim.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <article v-for="problem in painPoints" :key="problem.title" class="group rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-100 hover:shadow-soft">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-white">
                <component :is="problem.icon" class="h-6 w-6" />
              </div>
              <h3 class="mt-5 text-lg font-black text-neutral-950">{{ problem.title }}</h3>
              <p class="mt-3 text-sm leading-6 text-neutral-600">{{ problem.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="plans" class="bg-[linear-gradient(180deg,#eef8ff_0%,#ffffff_100%)]">
        <div class="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl">
              <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Paket konsultasi</p>
              <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Pilih engagement konsultasi, bukan sekadar tabel harga.</h2>
              <p class="mt-4 text-lg leading-8 text-neutral-600">
                Setiap paket menjelaskan siapa yang cocok, benefit konsultasi, dan output yang diterima sebelum aktivasi tenant.
              </p>
            </div>
            <button class="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-white px-5 py-3 font-bold text-primary-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-700 hover:text-white" @click="goToTrial">
              Request assessment paket
              <ArrowRight class="h-5 w-5" />
            </button>
          </div>

          <div class="mt-10 grid gap-5 lg:grid-cols-4">
            <article
              v-for="plan in consultationPlans"
              :key="plan.name"
              :class="[
                'group flex min-h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl',
                plan.highlight ? 'border-primary-400 shadow-primary-900/10 ring-4 ring-primary-100/80' : 'border-neutral-100'
              ]"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">{{ plan.eyebrow }}</p>
                  <h3 class="mt-3 text-xl font-black text-neutral-950">{{ plan.name }}</h3>
                </div>
                <span v-if="plan.highlight" class="rounded-full bg-primary-700 px-3 py-1 text-xs font-black text-white">Promo</span>
              </div>

              <div class="mt-5 border-y border-neutral-100 py-5">
                <p v-if="plan.originalPrice" class="text-sm font-bold text-neutral-400 line-through">{{ plan.originalPrice }}</p>
                <p class="text-3xl font-black text-neutral-950">
                  {{ plan.price }}
                  <span class="text-sm font-bold text-neutral-500">{{ plan.period }}</span>
                </p>
                <p v-if="plan.originalPrice" class="mt-1 text-xs font-black text-success-700">Diskon dari {{ plan.originalPrice }}/bulan</p>
              </div>

              <p class="mt-5 text-sm leading-6 text-neutral-600">{{ plan.suitedFor }}</p>

              <div class="mt-6 space-y-5">
                <div>
                  <p class="text-sm font-black text-neutral-950">Benefit konsultasi</p>
                  <ul class="mt-3 space-y-2">
                    <li v-for="benefit in plan.benefits" :key="benefit" class="flex gap-2 text-sm leading-6 text-neutral-600">
                      <Check class="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      {{ benefit }}
                    </li>
                  </ul>
                </div>
                <div>
                  <p class="text-sm font-black text-neutral-950">Output yang didapat</p>
                  <ul class="mt-3 space-y-2">
                    <li v-for="output in plan.outputs" :key="output" class="flex gap-2 text-sm leading-6 text-neutral-600">
                      <FileText class="mt-1 h-4 w-4 flex-shrink-0 text-primary-600" />
                      {{ output }}
                    </li>
                  </ul>
                </div>
              </div>

              <button class="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3.5 font-bold text-white transition group-hover:bg-primary-700" @click="openWhatsAppContact(`Halo faiznute, saya ingin ${plan.cta} untuk StockPilot.`)">
                {{ plan.cta }}
                <ArrowRight class="h-4 w-4" />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section id="admin" class="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Multi-tier admin ready</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Struktur admin bertingkat untuk kantor pusat, cabang, dan divisi.</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Bukan hanya menu yang disembunyikan. Paket, role, route, dan aktivitas mengikuti permission yang dikonfigurasi super admin.
            </p>
            <div class="mt-7 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                <Settings2 class="h-5 w-5 text-primary-700" />
                <p class="mt-3 font-black text-neutral-950">Permission matrix</p>
                <p class="mt-1 text-sm text-neutral-500">Akses fitur disesuaikan role dan paket.</p>
              </div>
              <div class="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                <GitBranch class="h-5 w-5 text-emerald-700" />
                <p class="mt-3 font-black text-neutral-950">Approval flow</p>
                <p class="mt-1 text-sm text-neutral-500">Viewer, approver, cabang, dan pusat bisa dipisah.</p>
              </div>
            </div>
          </div>

          <div class="rounded-[2rem] border border-neutral-100 bg-white p-5 shadow-2xl shadow-sky-900/10">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.22em] text-neutral-400">Role hierarchy</p>
                <h3 class="mt-1 text-xl font-black text-neutral-950">Enterprise access map</h3>
              </div>
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Synced</span>
            </div>

            <div class="mt-5 space-y-3">
              <article v-for="(role, index) in adminRoles" :key="role.role" class="grid gap-3 rounded-2xl border border-neutral-100 bg-[linear-gradient(90deg,#ffffff,#f8fbff)] p-4 transition hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-soft sm:grid-cols-[44px_1fr]">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-sm font-black text-white">
                  {{ index + 1 }}
                </div>
                <div>
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 class="font-black text-neutral-950">{{ role.role }}</h4>
                      <p class="text-sm text-neutral-500">{{ role.scope }}</p>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="badge in role.badges" :key="badge" class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-800">
                        {{ badge }}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" class="bg-white">
        <div class="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
          <div class="max-w-3xl">
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Workflow konsultasi</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Dari kebutuhan mentah menjadi setup yang siap dipakai.</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Proses konsultasi dibuat ringkas, namun cukup detail untuk kebutuhan kantor besar dan rollout multi-cabang.
            </p>
          </div>

          <div class="mt-10 grid gap-4 lg:grid-cols-5">
            <article v-for="(step, index) in workflow" :key="step.title" class="relative rounded-2xl border border-neutral-100 bg-[#fbfdff] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-700 text-sm font-black text-white">
                {{ index + 1 }}
              </div>
              <h3 class="mt-5 text-lg font-black text-neutral-950">{{ step.title }}</h3>
              <p class="mt-3 text-sm leading-6 text-neutral-600">{{ step.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="bg-[linear-gradient(135deg,#f5fbff_0%,#ffffff_48%,#f3fff8_100%)]">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-18 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Enterprise benefits</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Dibangun untuk keputusan paket yang bisa dipertanggungjawabkan.</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Cocok untuk organisasi yang perlu menyelaraskan operasional, finance, cabang, dan manajemen dalam satu struktur.
            </p>
            <button class="mt-7 inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-6 py-4 font-bold text-white shadow-lg shadow-neutral-950/15 transition hover:-translate-y-0.5 hover:bg-primary-700" @click="openWhatsAppContact('Halo faiznute, saya ingin menjadwalkan diskusi enterprise untuk StockPilot.')">
              Jadwalkan Diskusi
              <ArrowRight class="h-5 w-5" />
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="benefit in enterpriseBenefits" :key="benefit" class="flex items-start gap-3 rounded-2xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-soft">
              <div class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Check class="h-4 w-4 text-emerald-700" />
              </div>
              <p class="font-bold leading-6 text-neutral-800">{{ benefit }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Case-style feedback</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Testimonial placeholder yang bisa diganti dengan studi kasus resmi.</h2>
            <p class="mt-4 text-lg leading-8 text-neutral-600">
              Copy dibuat netral dan tidak menggunakan brand asli tanpa izin, tapi tetap terasa seperti konteks perusahaan nyata.
            </p>
          </div>
          <div class="grid gap-4">
            <article v-for="item in testimonials" :key="item.quote" class="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
              <p class="text-lg font-semibold leading-8 text-neutral-800">"{{ item.quote }}"</p>
              <div class="mt-5 flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 font-black text-primary-700">
                  {{ item.person.charAt(0) }}
                </div>
                <div>
                  <p class="font-black text-neutral-950">{{ item.person }}</p>
                  <p class="text-sm text-neutral-500">{{ item.company }}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" class="bg-white">
        <div class="mx-auto max-w-5xl px-4 py-18 sm:px-6 lg:px-8">
          <div class="text-center">
            <p class="text-sm font-black uppercase tracking-[0.22em] text-primary-700">FAQ</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Pertanyaan sebelum konsultasi.</h2>
          </div>
          <div class="mt-10 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-[#fbfdff] shadow-sm">
            <article v-for="item in faqs" :key="item.question" class="p-6">
              <h3 class="text-lg font-black text-neutral-950">{{ item.question }}</h3>
              <p class="mt-2 leading-7 text-neutral-600">{{ item.answer }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="px-4 py-18 sm:px-6 lg:px-8">
        <div class="mx-auto overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0c4a6e_0%,#0369a1_50%,#047857_100%)] shadow-2xl shadow-primary-900/20">
          <div class="grid gap-8 px-6 py-12 text-white sm:px-10 lg:grid-cols-[1fr_0.75fr] lg:items-center lg:px-14">
            <div>
              <p class="text-sm font-black uppercase tracking-[0.22em] text-white/60">Final CTA</p>
              <h2 class="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Siap menemukan paket yang paling sesuai untuk kebutuhan bisnis Anda?</h2>
              <p class="mt-4 max-w-2xl text-lg leading-8 text-white/80">
                Mulai dari konsultasi singkat, lalu lanjutkan ke rekomendasi paket, struktur admin, dan aktivasi tenant yang rapi.
              </p>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-primary-800 shadow-lg shadow-primary-950/20 transition hover:-translate-y-0.5 hover:bg-primary-50" @click="openWhatsAppContact('Halo faiznute, saya siap konsultasi paket StockPilot sekarang.')">
                Konsultasikan Sekarang
                <ArrowRight class="h-5 w-5" />
              </button>
              <button class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-4 font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20" @click="scrollToPlans">
                Lihat Simulasi Paket
                <BarChart3 class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-neutral-100 bg-white">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-700">
              <Package class="h-6 w-6 text-white" />
            </div>
            <div>
              <span class="block text-xl font-black text-neutral-950">StockPilot</span>
              <span class="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Consulting Desk</span>
            </div>
          </div>
          <p class="mt-4 max-w-md text-sm leading-6 text-neutral-600">
            Halaman konsultasi paket untuk platform manajemen gudang multi-tenant, subscription, role, audit, dan operasional stok.
          </p>
        </div>
        <div>
          <h3 class="font-black text-neutral-950">Kontak resmi</h3>
          <div class="mt-4 space-y-3 text-sm text-neutral-600">
            <div class="flex items-center gap-3">
              <MessageCircle class="h-4 w-4 text-primary-700" />
              {{ ownerContact.name }}
            </div>
            <div class="flex items-center gap-3">
              <Phone class="h-4 w-4 text-primary-700" />
              {{ ownerContact.whatsappLocal }}
            </div>
            <div class="flex items-center gap-3">
              <Mail class="h-4 w-4 text-primary-700" />
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
