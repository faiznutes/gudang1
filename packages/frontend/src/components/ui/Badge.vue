<script setup lang="ts">
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-600 text-white",
        secondary: "border-transparent bg-neutral-100 text-neutral-900",
        success: "border-transparent bg-success-600 text-white",
        warning: "border-transparent bg-warning-600 text-white",
        danger: "border-transparent bg-danger-600 text-white",
        outline: "text-neutral-900 border-neutral-300",
        primary: "border-transparent bg-primary-100 text-primary-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'primary'
  class?: string
}

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: 'default',
})

const classes = computed(() => {
  return badgeVariants({ variant: props.variant })
})
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>