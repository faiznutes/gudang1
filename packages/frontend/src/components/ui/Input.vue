<script setup lang="ts">
import { computed } from 'vue'

interface InputProps {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search' | 'url'
  placeholder?: string
  disabled?: boolean
  error?: boolean
  class?: string
  id?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputValue = computed({
  get: () => props.modelValue ?? '',
  set: (val) => emit('update:modelValue', val),
})

const inputClasses = computed(() => {
  return [
    'input',
    props.error && 'input-error',
    props.disabled && 'opacity-50 cursor-not-allowed',
    props.class,
  ].filter(Boolean).join(' ')
})
</script>

<template>
  <input
    v-model="inputValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="inputClasses"
    :id="id"
  />
</template>