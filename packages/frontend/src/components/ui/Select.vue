<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

interface SelectProps {
  modelValue?: string | number
  disabled?: boolean
  error?: boolean
  placeholder?: string
  class?: string
}

const props = withDefaults(defineProps<SelectProps>(), {
  placeholder: 'Pilih...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectValue = computed({
  get: () => props.modelValue ?? '',
  set: (val) => emit('update:modelValue', val),
})

const selectClasses = computed(() => {
  return [
    'w-full px-3 py-2 text-sm border rounded-lg shadow-sm bg-white appearance-none cursor-pointer pr-10',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    props.error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-neutral-300',
    props.class,
  ].filter(Boolean).join(' ')
})
</script>

<template>
  <div class="relative">
    <select
      v-model="selectValue"
      :disabled="disabled"
      :class="selectClasses"
      class="appearance-none"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <slot />
    </select>
    <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
  </div>
</template>