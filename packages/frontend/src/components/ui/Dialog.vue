<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface DialogProps {
  modelValue?: boolean
  title?: string
  description?: string
}

defineProps<DialogProps>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    close()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click="handleBackdropClick"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          class="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            class="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            @click="close"
          >
            <X class="w-5 h-5" />
          </button>
          
          <div v-if="title" class="mb-4">
            <h2 class="text-lg font-semibold text-neutral-900">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm text-neutral-500">{{ description }}</p>
          </div>
          
          <slot />
          
          <div v-if="$slots.footer" class="mt-4 flex justify-end gap-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from > div:last-child,
.dialog-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>