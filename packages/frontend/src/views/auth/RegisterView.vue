<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, MessageCircle, Package } from 'lucide-vue-next'

const router = useRouter()

onMounted(() => {
  router.replace({ name: 'trial-signup' })
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
      <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
        <Package class="h-8 w-8 text-white" />
      </div>
      <h1 class="text-2xl font-bold text-neutral-900">Pendaftaran melalui WhatsApp</h1>
      <p class="mt-3 text-neutral-600">
        Tenant baru dibuat oleh super admin setelah request trial dikirim.
      </p>
      <div class="mt-6 grid gap-3">
        <router-link to="/trial-signup" class="btn-primary justify-center">
          <MessageCircle class="h-5 w-5" />
          Request trial
        </router-link>
        <router-link to="/login" class="btn-secondary justify-center">
          <ArrowLeft class="h-5 w-5" />
          Kembali ke login
        </router-link>
      </div>
    </div>
  </div>
</template>
