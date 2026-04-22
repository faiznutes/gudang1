<script setup lang="ts">
interface LabelProps {
  htmlFor?: string
  required?: boolean
  class?: string
}

withDefaults(defineProps<LabelProps>(), {
  required: false,
})
</script>

<template>
  <label :for="htmlFor" class="label">
    <slot />
    <span v-if="required" class="text-danger-600 ml-0.5">*</span>
  </label>
</template>