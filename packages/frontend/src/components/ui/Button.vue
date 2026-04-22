<script setup lang="ts">
import { computed } from 'vue'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",
        destructive: "bg-danger-600 text-white hover:bg-danger-700",
        outline: "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
        secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        ghost: "hover:bg-neutral-100 text-neutral-700",
        link: "text-primary-600 underline-offset-4 hover:underline",
        success: "bg-success-600 text-white hover:bg-success-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  class?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'default',
})

const classes = computed(() => {
  return buttonVariants({ variant: props.variant, size: props.size })
})
</script>

<template>
  <button :class="classes" :disabled="props.disabled" :type="props.type || 'button'">
    <slot />
  </button>
</template>