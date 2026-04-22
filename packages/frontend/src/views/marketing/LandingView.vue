<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { 
  Package, Warehouse, BarChart3, ArrowRight, Check, Star, Mail, Phone, 
  MessageCircle, Zap, Shield, ScanBarcode, Bell, FileText, Truck, Menu, X
} from 'lucide-vue-next'

const router = useRouter()
const mobileMenuOpen = ref(false)

const features = [
  {
    icon: Warehouse,
    title: 'Multi Gudang',
    description: 'Kelola beberapa gudang dalam satu dashboard. Transfer stok antar gudang jadi lebih mudah.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Cerdas',
    description: 'Lihat tren stok, produk terlaris, dan insight bisnis dalam satu layar.',
  },
  {
    icon: Zap,
    title: 'Cepat & Ringan',
    description: 'Aplikasi cepat dan responsive. Kerja di mana saja, kapan saja.',
  },
  {
    icon: Shield,
    title: 'Aman Terjamin',
    description: 'Data tersimpan dengan enkripsi tingkat bank. Backup harian otomatis.',
  },
  {
    icon: ScanBarcode,
    title: 'Scan Barcode',
    description: 'Scan barcode produk langsung dari HP untuk cek stok dan mutasi.',
  },
  {
    icon: Bell,
    title: 'Notifikasi Otomatis',
    description: 'Dapat notifikasi WhatsApp saat stok menipis atau ada transaksi baru.',
  },
  {
    icon: FileText,
    title: 'Export Laporan',
    description: 'Export laporan stok ke PDF atau Excel untukArsip atau pajak.',
  },
  {
    icon: Truck,
    title: 'Kontrol Pengiriman',
    description: 'Lacak status pengiriman dan update stok secara real-time.',
  },
]

const benefits = [
  'Tidak perlu instal aplikasi - akses dari browser',
  'Gratis update fitur baru selamanya',
  'Support via WhatsApp responsif',
  'Tanpa biaya maintenance server',
  'Data aman dengan backup cloud',
  'Mudah digunakan - tidak perlu jadi ahli IT',
  'Cukup dengan HP/Smartphone',
  'Akses unlimited - tidak ada batasan pengguna',
]

const testimonials = [
  {
    name: 'Budi Santoso',
    role: 'Pemilik Toko配件 Jakarta',
    text: 'StockPilot sangat membantu saya kelola stok toko配件. Sekarang tidak ada lagi barang hilang dan saya tahu pasti masih ada berapa stok!',
    avatar: 'B',
    rating: 5,
  },
  {
    name: 'Siti Aminah',
    role: 'Admin Distributor Bandung',
    text: 'Sebelum pakai StockPilot, saya sering lupa stok di gudang mana. Sekarang semuanya terkordinasi. Transfer antar gudang juga mudah.',
    avatar: 'S',
    rating: 5,
  },
  {
    name: 'Joko Wijaya',
    role: 'Owner Online Shop Surabaya',
    text: 'Saya berjualan di 3 marketplace berbeda. Dengan StockPilot, saya bisa tracking stokreal waktu terima order. Trial 7 hari sangat membantu untuk coba dulu.',
    avatar: 'J',
    rating: 5,
  },
  {
    name: 'Ahmad Rizal',
    role: 'Manager Toko Elektronik',
    text: 'Fitur notifikasi WhatsApp-nya非常好. Saya dapat notifikasi kalau stok hampir habis, jadi tidak kehabisan produk favorit customer.',
    avatar: 'A',
    rating: 5,
  },
]

const faqs = [
  {
    question: 'Apakah data saya aman di StockPilot?',
    answer: 'Kami menggunakan enkripsi tingkat bank untuk melindungi data Anda. Semua data di-backup secara harian dan disimpan di server aman dengan ISO certification.',
  },
  {
    question: 'Bisakah saya import data dari Excel yang sudah ada?',
    answer: 'Ya! Import produk dari Excel/CSV sangat mudah. Kami juga提供模板 agar import semakin lancar.',
  },
  {
    question: 'Apa perbedaan paket Starter dan Pro?',
    answer: 'Paket Starter cocok untuk bisnis dengan 1 gudang. Paket Pro memberikan akses lengkap termasuk export PDF, batch import, dan fitur analytics lengkap.',
  },
  {
    question: 'Bagaimana jika saya ingin upgrade paket?',
    answer: 'Upgrade bisa dilakukan kapan saja dari dashboard. Perubahan akan berlaku di bulan berikutnya.',
  },
  {
    question: 'Apakah ada biaya tersembunyi?',
    answer: 'Tidak ada! Harga yang Anda lihat adalah harga final. Tidak ada biaya setup, biaya maintenance, atau biaya tersembunyi lainnya.',
  },
  {
    question: 'Bagaimana cara trial bekerja?',
    answer: 'Trial 7 hari memberikan akses ke semua fitur Pro secara gratis. Tidak perlu kartu kredit. Setelah trial selesai, Anda bisa upgrade atau menggunakan paket Free.',
  },
]

const plans = [
  { 
    name: 'Free', 
    price: 'Rp 0', 
    period: '', 
    description: 'Untuk coba-coba dan belajar',
    features: [
      'View dashboard',
      'View inventori',
      'View aktivitas',
      '1 Gudang',
      '100 Produk',
      '1 User',
      'Support email',
    ],
    notIncluded: [
      'Stock In/Out',
      'Multi Gudang',
      'Analytics',
      'Export PDF',
      'Import CSV',
    ],
    popular: false 
  },
  { 
    name: 'Starter', 
    price: 'Rp 49rb', 
    period: '/bln', 
    description: 'Untuk bisnis rumahan & toko kecil',
    features: [
      'Semua fitur Free',
      'Stock In/Out',
      '500 Produk',
      '1 Gudang',
      '2 User',
      'Support prioritas',
      'Notifikasi WhatsApp',
    ],
    notIncluded: [
      'Multi Gudang',
      'Analytics Lengkap',
      'Export PDF',
    ],
    popular: false 
  },
  { 
    name: 'Growth', 
    price: 'Rp 149rb', 
    period: '/bln', 
    description: 'Untuk bisnis yang berkembang',
    features: [
      'Semua fitur Starter',
      'Multi Gudang (5 gudang)',
      '2000 Produk',
      '10 User',
      'Analytics Lengkap',
      'Priority Support',
      'API Access',
    ],
    notIncluded: [
      'Export PDF',
      'Batch Import',
    ],
    popular: true 
  },
  { 
    name: 'Pro', 
    price: 'Rp 299rb', 
    period: '/bln', 
    description: 'Untuk bisnis skala besar',
    features: [
      'Semua fitur Growth',
      'Unlimited Gudang',
      'Unlimited Produk',
      'Unlimited User',
      'Export PDF',
      'Batch Import CSV',
      'Custom Integrasi',
      'Dedicated Support',
    ],
    notIncluded: [],
    popular: false 
  },
]

function goToTrial() {
  router.push('/trial-signup')
}

function goToLogin() {
  router.push('/login')
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section with Gradient -->
    <section class="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <!-- Navigation -->
      <nav class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
                <Package class="w-6 h-6 text-white" />
              </div>
              <span class="text-xl font-bold text-white">StockPilot</span>
            </div>
            
            <!-- Desktop Nav -->
            <div class="hidden md:flex items-center gap-6">
              <a href="#features" class="text-white/80 hover:text-white transition">Fitur</a>
              <a href="#pricing" class="text-white/80 hover:text-white transition">Harga</a>
              <a href="#testimonials" class="text-white/80 hover:text-white transition">Testimoni</a>
              <a href="#faq" class="text-white/80 hover:text-white transition">FAQ</a>
            </div>
            
            <!-- Desktop Buttons -->
            <div class="hidden md:flex items-center gap-3">
              <button @click="goToLogin" class="text-white/80 hover:text-white font-medium">Masuk</button>
              <button @click="goToTrial" class="bg-white text-primary-600 hover:bg-neutral-100 px-5 py-2.5 rounded-xl font-medium transition">
                Coba Gratis
              </button>
            </div>
            
            <!-- Mobile Menu Button -->
            <button @click="toggleMobileMenu" class="md:hidden text-white p-2 -mr-2">
              <Menu v-if="!mobileMenuOpen" class="w-6 h-6" />
              <X v-else class="w-6 h-6" />
            </button>
          </div>
          
          <!-- Mobile Menu Dropdown -->
          <div v-if="mobileMenuOpen" class="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 border-t border-white/10 py-4">
            <div class="flex flex-col gap-3">
              <a href="#features" @click="closeMobileMenu" class="text-white/80 hover:text-white px-4 py-2">Fitur</a>
              <a href="#pricing" @click="closeMobileMenu" class="text-white/80 hover:text-white px-4 py-2">Harga</a>
              <a href="#testimonials" @click="closeMobileMenu" class="text-white/80 hover:text-white px-4 py-2">Testimoni</a>
              <a href="#faq" @click="closeMobileMenu" class="text-white/80 hover:text-white px-4 py-2">FAQ</a>
              <hr class="border-white/20 my-2" />
              <button @click="goToLogin(); closeMobileMenu()" class="text-white/80 hover:text-white px-4 py-2 text-left">Masuk</button>
              <button @click="goToTrial(); closeMobileMenu()" class="bg-white text-primary-600 mx-4 py-2.5 rounded-xl font-medium text-center">
                Coba Gratis
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Content -->
      <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-16">
        <div class="text-center">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-sm font-medium mb-8">
            <Sparkle class="w-4 h-4" />
            Gratis 7 hari tanpa kartu kredit
          </div>
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Kelola Gudang
            <br class="hidden md:block" />
            Jadi <span class="text-yellow-400">Lebih Mudah</span>
          </h1>
          <p class="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            StockPilot membantu UMKM dan bisnis yang berkembang kelola inventori, lacak stock masuk/keluar, dan analisis bisnis dalam satu aplikasi yang mudah digunakan.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button @click="goToTrial" class="bg-white text-primary-600 hover:bg-neutral-100 px-8 py-4 rounded-2xl font-semibold text-lg transition flex items-center justify-center gap-2">
              Mulai Trial Gratis
              <ArrowRight class="w-5 h-5" />
            </button>
            <a href="#features" class="text-white border border-white/30 hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold text-lg transition">
              Pelajari Lebih Lanjut
            </a>
          </div>
          
          <!-- Stats -->
          <div class="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div class="text-center">
              <p class="text-3xl md:text-4xl font-bold text-white">5000+</p>
              <p class="text-primary-200 text-sm">UMKM Bergabung</p>
            </div>
            <div class="text-center">
              <p class="text-3xl md:text-4xl font-bold text-white">15000+</p>
              <p class="text-primary-200 text-sm">Produk Dikelola</p>
            </div>
            <div class="text-center">
              <p class="text-3xl md:text-4xl font-bold text-white">99.9%</p>
              <p class="text-primary-200 text-sm">Uptime Server</p>
            </div>
            <div class="text-center">
              <p class="text-3xl md:text-4xl font-bold text-white">4.9/5</p>
              <p class="text-primary-200 text-sm">Rating User</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Logo cloud -->
    <section class="py-12 bg-neutral-50 border-y border-neutral-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-center text-neutral-500 text-sm mb-8">Dipercaya oleh bisnis dari berbagai industria</p>
        <div class="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
          <div class="text-xl font-bold text-neutral-400">Tokopedia</div>
          <div class="text-xl font-bold text-neutral-400">Shopee</div>
          <div class="text-xl font-bold text-neutral-400">Bukalapak</div>
          <div class="text-xl font-bold text-neutral-400"> Lazada</div>
          <div class="text-xl font-bold text-neutral-400">Grab</div>
          <div class="text-xl font-bold text-neutral-400">Gojek</div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="py-20 md:py-28 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-5xl font-bold text-neutral-900 mb-4">
            Semua yang Kamu Butuhkan
          </h2>
          <p class="text-xl text-neutral-600 max-w-2xl mx-auto">
            Dilengkapi dengan fitur lengkap untuk kelola gudang dengan mudah. Tidak perlu jadi ahli IT untuk pakai StockPilot.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white rounded-2xl p-6 shadow-card border border-neutral-100 hover:shadow-soft hover:-translate-y-1 transition-all duration-300"
          >
            <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
              <component :is="feature.icon" class="w-6 h-6 text-primary-600" />
            </div>
            <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ feature.title }}</h3>
            <p class="text-neutral-600 text-sm leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="py-20 md:py-28 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="bg-primary-600 rounded-3xl p-8 md:p-16 text-center">
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
            Mengapa Pilih StockPilot?
          </h2>
          <p class="text-lg text-primary-100 mb-12 max-w-xl mx-auto">
            Semua yang kamu butuhkan untuk kelola gudang dengan lebih efektif dan efisien
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div
              v-for="(benefit, index) in benefits"
              :key="index"
              class="flex items-start gap-3 text-white"
            >
              <Check class="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span class="text-primary-50">{{ benefit }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20 md:py-28 px-4 bg-neutral-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Mulai Dalam 3 Menit
          </h2>
          <p class="text-lg text-neutral-600">
            Tidak perlu belajar lama. Cukup 3 langkah saja langsung bisa pakai
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl font-bold text-primary-600">1</span>
            </div>
            <h3 class="font-semibold text-neutral-900 mb-2">Daftar Gratis</h3>
            <p class="text-neutral-600">Isi nama dan email untuk mulai trial 7 hari</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl font-bold text-primary-600">2</span>
            </div>
            <h3 class="font-semibold text-neutral-900 mb-2">Tambah Produk</h3>
            <p class="text-neutral-600">Input produk satu per satu atau import dari Excel</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl font-bold text-primary-600">3</span>
            </div>
            <h3 class="font-semibold text-neutral-900 mb-2">Mulai Kelola</h3>
            <p class="text-neutral-600">Langsung catat stock masuk/keluar dengan mudah</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-20 md:py-28 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-5xl font-bold text-neutral-900 mb-4">
            Harga Terjangkau untuk UMKM
          </h2>
          <p class="text-xl text-neutral-600 max-w-2xl mx-auto">
            Pilih paket yang sesuai dengan kebutuhan bisnismu. Semua paket dengan harga transparan tanpa biaya tersembunyi.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="plan in plans"
            :key="plan.name"
            :class="[
              'bg-white rounded-2xl p-6 shadow-card border-2 transition-all duration-300',
              plan.popular ? 'border-primary-500 ring-4 ring-primary-100' : 'border-neutral-100'
            ]"
          >
            <div
              v-if="plan.popular"
              class="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3"
            >
              PALING POPULER
            </div>
            <h3 class="text-xl font-bold text-neutral-900">{{ plan.name }}</h3>
            <div class="mt-2 mb-1">
              <span class="text-4xl font-bold text-neutral-900">{{ plan.price }}</span>
              <span v-if="plan.period" class="text-neutral-500 text-sm">{{ plan.period }}</span>
            </div>
            <p class="text-neutral-600 text-sm mb-4">{{ plan.description }}</p>
            
            <ul class="space-y-2 mb-6">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-2 text-sm text-neutral-700"
              >
                <Check class="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                {{ feature }}
              </li>
              <li
                v-for="feature in plan.notIncluded"
                :key="feature"
                class="flex items-start gap-2 text-sm text-neutral-400 line-through"
              >
                <span class="w-4 h-4 flex-shrink-0 mt-0.5">×</span>
                {{ feature }}
              </li>
            </ul>
            
            <button
              @click="plan.name === 'Free' ? goToLogin() : goToTrial()"
              :class="[
                'w-full py-3 rounded-xl font-medium transition',
                plan.popular 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              ]"
            >
              {{ plan.name === 'Free' ? 'Gunakan Gratis' : 'Coba Gratis' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="py-20 md:py-28 px-4 bg-neutral-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Dipercayaan Ribuan Bisnis
          </h2>
          <p class="text-lg text-neutral-600">
            Bergabung dengan bisnis lain yang sudah merasakan manfaat StockPilot
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="testimonial in testimonials"
            :key="testimonial.name"
            class="bg-white rounded-2xl p-6 shadow-card"
          >
            <div class="flex items-center gap-1 mb-4">
              <Star v-for="i in testimonial.rating" :key="i" class="w-4 h-4 text-yellow-500" fill="currentColor" />
            </div>
            <p class="text-neutral-700 mb-4 leading-relaxed">"{{ testimonial.text }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-semibold text-primary-700">
                {{ testimonial.avatar }}
              </div>
              <div>
                <p class="font-medium text-neutral-900">{{ testimonial.name }}</p>
                <p class="text-sm text-neutral-500">{{ testimonial.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="py-20 md:py-28 px-4">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Pertanyaan Umum
          </h2>
          <p class="text-lg text-neutral-600">
            Ada pertanyaan? Kami siap membantu
          </p>
        </div>

        <div class="space-y-4">
          <div
            v-for="faq in faqs"
            :key="faq.question"
            class="bg-neutral-50 rounded-xl p-6"
          >
            <h3 class="font-semibold text-neutral-900 mb-2">{{ faq.question }}</h3>
            <p class="text-neutral-600">{{ faq.answer }}</p>
          </div>
        </div>

        <div class="mt-12 text-center">
          <p class="text-neutral-600 mb-4">Masih ada pertanyaan?</p>
          <button class="btn-primary px-8 py-3">
            Hubungi Kami
          </button>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 md:py-28 px-4">
      <div class="max-w-7xl mx-auto bg-primary-600 rounded-3xl p-8 md:p-16 text-center">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">
          Siap Coba Gratis?
        </h2>
        <p class="text-lg text-primary-100 mb-8 max-w-xl mx-auto">
          Mulai 7 hari trial gratis sekarang. Tanpa kartu kredit, tanpa komitmen. Semua fitur Pro bisa dicoba!
        </p>
        <button @click="goToTrial" class="bg-white text-primary-600 hover:bg-neutral-100 px-10 py-4 rounded-2xl font-bold text-lg transition flex items-center justify-center gap-2 mx-auto">
          <Sparkle class="w-5 h-5" />
          Mulai Trial Gratis 7 Hari
        </button>
        <p class="text-primary-200 text-sm mt-4">
          Tidak perlu kartu kredit • Cancel kapan saja • Semua fitur Pro
        </p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-neutral-900 py-16 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Package class="w-6 h-6 text-white" />
              </div>
              <span class="text-xl font-bold text-white">StockPilot</span>
            </div>
            <p class="text-neutral-400">Solusi pengelolaan gudang yang mudah untuk bisnis Indonesia.</p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Produk</h4>
            <ul class="space-y-2 text-neutral-400">
              <li><a href="#" class="hover:text-white">Fitur</a></li>
              <li><a href="#pricing" class="hover:text-white">Harga</a></li>
              <li><a href="#" class="hover:text-white">Demo</a></li>
              <li><a href="#" class="hover:text-white">Integrasi</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Perusahaan</h4>
            <ul class="space-y-2 text-neutral-400">
              <li><a href="#" class="hover:text-white">Tentang Kami</a></li>
              <li><a href="#" class="hover:text-white">Blog</a></li>
              <li><a href="#" class="hover:text-white">Karir</a></li>
              <li><a href="#" class="hover:text-white">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Hubungi</h4>
            <ul class="space-y-3 text-neutral-400">
              <li class="flex items-center gap-2">
                <Mail class="w-4 h-4" />
                hello@stockpilot.id
              </li>
              <li class="flex items-center gap-2">
                <Phone class="w-4 h-4" />
                +62 812 3456 7890
              </li>
              <li class="flex items-center gap-2">
                <MessageCircle class="w-4 h-4" />
                @stockpilot_id
              </li>
            </ul>
          </div>
        </div>
        <div class="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-neutral-500 text-sm">© 2024 StockPilot. All rights reserved.</p>
          <div class="flex gap-6 text-neutral-500 text-sm">
            <a href="#" class="hover:text-white">Privacy Policy</a>
            <a href="#" class="hover:text-white">Terms of Service</a>
            <a href="#" class="hover:text-white">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>