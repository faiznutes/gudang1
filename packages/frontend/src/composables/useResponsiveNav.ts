import { ref, computed, onMounted, onUnmounted } from 'vue'

export type NavMode = 'desktop' | 'tablet' | 'mobile'

export function useResponsiveNav() {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const navMode = computed<NavMode>(() => {
    if (windowWidth.value >= 1024) return 'desktop'
    if (windowWidth.value >= 768) return 'tablet'
    return 'mobile'
  })

  const isDesktop = computed(() => navMode.value === 'desktop')
  const isTablet = computed(() => navMode.value === 'tablet')
  const isMobile = computed(() => navMode.value === 'mobile')

  const showSidebar = computed(() => isDesktop.value)
  const showBottomNav = computed(() => isMobile.value || isTablet.value)

  function handleResize() {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
    handleResize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    windowWidth,
    navMode,
    isDesktop,
    isTablet,
    isMobile,
    showSidebar,
    showBottomNav,
  }
}