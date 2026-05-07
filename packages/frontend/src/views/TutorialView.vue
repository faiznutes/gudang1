<script setup lang="ts">
import { ref } from 'vue'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Mail,
  MessageCircle,
  Users,
} from 'lucide-vue-next'

const activeSection = ref<string | null>('getting-started')

const sections = [
  {
    id: 'getting-started',
    title: 'Memulai',
    icon: BookOpen,
    articles: [
      { title: 'Cara request akun baru', content: 'Buka halaman request trial, isi nama, WhatsApp, dan email. Super admin akan menyiapkan tenant, paket, dan durasi langganan yang sesuai.' },
      { title: 'Setup gudang pertama', content: 'Pergi ke menu Gudang > Tambah Gudang. Isi nama dan alamat gudang. Gudang pertama akan otomatis menjadi gudang utama.' },
      { title: 'Tambah produk pertama', content: 'Pergi ke Inventori > Tambah Produk. Isi nama, SKU, kategori, harga, dan stok minimum. Produk siap digunakan.' },
    ],
  },
  {
    id: 'stock-in',
    title: 'Stock Masuk',
    icon: ArrowDownToLine,
    articles: [
      { title: 'Cara mencatat stock masuk', content: '1. Klik tombol Stock Masuk di dashboard atau menu.\n2. Pilih produk yang masuk.\n3. Pilih gudang tujuan.\n4. Masukkan jumlah.\n5. Tambahkan catatan bila perlu.\n6. Klik Simpan.' },
      { title: 'Apa itu stock masuk?', content: 'Stock masuk adalah pencatatan barang yang masuk ke gudang, baik dari pembelian supplier, return customer, atau transfer dari gudang lain.' },
    ],
  },
  {
    id: 'stock-out',
    title: 'Stock Keluar',
    icon: ArrowUpFromLine,
    articles: [
      { title: 'Cara mencatat stock keluar', content: '1. Klik tombol Stock Keluar di dashboard atau menu.\n2. Pilih produk yang keluar.\n3. Pilih gudang asal.\n4. Masukkan jumlah. Sistem akan mencegah transaksi jika stok tidak cukup.\n5. Tambahkan catatan bila perlu.\n6. Klik Simpan.' },
      { title: 'Apa itu low stock alert?', content: 'Low stock alert adalah notifikasi yang muncul ketika stok suatu produk mencapai atau di bawah batas minimum yang kamu tentukan.' },
    ],
  },
  {
    id: 'transfer',
    title: 'Transfer Antar Gudang',
    icon: ArrowLeftRight,
    articles: [
      { title: 'Cara transfer stok', content: 'Transfer antar gudang tersedia mulai paket Growth. Gunakan menu Mutasi untuk memindahkan stok dari satu gudang ke gudang lain.' },
      { title: 'Kapan harus menggunakan transfer?', content: 'Gunakan transfer ketika kamu perlu menyeimbangkan stok antar lokasi atau mengirim pesanan dari gudang berbeda.' },
    ],
  },
  {
    id: 'user-roles',
    title: 'Peran Pengguna',
    icon: Users,
    articles: [
      { title: 'Apa itu peran pengguna?', content: 'Peran pengguna menentukan tingkat akses di StockPilot. Admin mengelola tenant, staff mengelola operasional gudang, dan supplier hanya melihat area yang relevan.' },
      { title: 'Cara menambah user', content: 'Jumlah user mengikuti batas paket aktif. Starter mendukung 2 user, Growth mendukung 10 user, dan Pro mendukung kebutuhan tim besar.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    articles: [
      { title: 'Apakah data antar tenant terpisah?', content: 'Ya. Produk, gudang, supplier, staff, dan aktivitas setiap tenant terisolasi dari tenant lain.' },
      { title: 'Bisakah saya import data dari Excel?', content: 'Fitur batch import CSV tersedia di paket Pro. Export laporan juga mengikuti izin paket yang aktif.' },
      { title: 'Bagaimana cara mengubah langganan?', content: 'Perubahan paket dan masa aktif dikelola oleh super admin agar hak akses tenant tetap sesuai paket yang aktif.' },
    ],
  },
]

function toggleSection(id: string) {
  activeSection.value = activeSection.value === id ? null : id
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">Pusat Bantuan</h1>
      <p class="text-neutral-600">Temukan jawaban untuk pertanyaanmu</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <a href="#getting-started" class="card-hover p-4 flex items-center gap-4 group">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
          <BookOpen class="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <p class="font-medium text-neutral-900">Memulai</p>
          <p class="text-sm text-neutral-500">Panduan untuk pemula</p>
        </div>
      </a>
      <a href="#stock-in" class="card-hover p-4 flex items-center gap-4 group">
        <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center group-hover:bg-success-200 transition-colors">
          <ArrowDownToLine class="w-6 h-6 text-success-600" />
        </div>
        <div>
          <p class="font-medium text-neutral-900">Stock Masuk</p>
          <p class="text-sm text-neutral-500">Cara mencatat barang masuk</p>
        </div>
      </a>
      <a href="#stock-out" class="card-hover p-4 flex items-center gap-4 group">
        <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center group-hover:bg-danger-200 transition-colors">
          <ArrowUpFromLine class="w-6 h-6 text-danger-600" />
        </div>
        <div>
          <p class="font-medium text-neutral-900">Stock Keluar</p>
          <p class="text-sm text-neutral-500">Cara mencatat barang keluar</p>
        </div>
      </a>
    </div>

    <div class="space-y-4">
      <div
        v-for="section in sections"
        :id="section.id"
        :key="section.id"
        class="card overflow-hidden"
      >
        <button
          class="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
          @click="toggleSection(section.id)"
        >
          <div class="flex items-center gap-3">
            <component :is="section.icon" class="w-5 h-5 text-neutral-500" />
            <span class="font-medium text-neutral-900">{{ section.title }}</span>
          </div>
          <ChevronDown
            :class="['w-5 h-5 text-neutral-400 transition-transform', activeSection === section.id ? 'rotate-180' : '']"
          />
        </button>

        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="activeSection === section.id" class="border-t border-neutral-100">
            <div
              v-for="article in section.articles"
              :key="article.title"
              class="p-4 border-b border-neutral-50 last:border-0"
            >
              <h3 class="font-medium text-neutral-900 mb-2">{{ article.title }}</h3>
              <p class="text-sm text-neutral-600 whitespace-pre-line">{{ article.content }}</p>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="card p-6 bg-neutral-50">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <h3 class="font-semibold text-neutral-900">Masih butuh bantuan?</h3>
          <p class="text-sm text-neutral-600">Hubungi tim support untuk bantuan operasional.</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary btn-sm">
            <MessageCircle class="w-4 h-4" />
            WhatsApp
          </button>
          <button class="btn-primary btn-sm">
            <Mail class="w-4 h-4" />
            Email Kami
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
