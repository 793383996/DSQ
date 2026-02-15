import { ref, onMounted, onUnmounted, computed } from 'vue'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BreakpointConfig {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

export const defaultBreakpoints: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

const currentWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const currentHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

let resizeHandler: (() => void) | null = null
let listenerCount = 0

function updateDimensions(): void {
  currentWidth.value = window.innerWidth
  currentHeight.value = window.innerHeight
}

function setupResizeListener(): void {
  if (listenerCount === 0) {
    resizeHandler = () => updateDimensions()
    window.addEventListener('resize', resizeHandler)
  }
  listenerCount++
}

function teardownResizeListener(): void {
  listenerCount--
  if (listenerCount === 0 && resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
}

export function useBreakpoints(breakpoints: BreakpointConfig = defaultBreakpoints) {
  onMounted(() => {
    setupResizeListener()
  })

  onUnmounted(() => {
    teardownResizeListener()
  })

  const current = computed<Breakpoint>(() => {
    const width = currentWidth.value
    if (width >= breakpoints['2xl']) return '2xl'
    if (width >= breakpoints.xl) return 'xl'
    if (width >= breakpoints.lg) return 'lg'
    if (width >= breakpoints.md) return 'md'
    if (width >= breakpoints.sm) return 'sm'
    return 'xs'
  })

  const isXs = computed(() => currentWidth.value < breakpoints.sm)
  const isSm = computed(
    () => currentWidth.value >= breakpoints.sm && currentWidth.value < breakpoints.md
  )
  const isMd = computed(
    () => currentWidth.value >= breakpoints.md && currentWidth.value < breakpoints.lg
  )
  const isLg = computed(
    () => currentWidth.value >= breakpoints.lg && currentWidth.value < breakpoints.xl
  )
  const isXl = computed(
    () => currentWidth.value >= breakpoints.xl && currentWidth.value < breakpoints['2xl']
  )
  const is2xl = computed(() => currentWidth.value >= breakpoints['2xl'])

  const isMobile = computed(() => currentWidth.value < breakpoints.md)
  const isTablet = computed(
    () => currentWidth.value >= breakpoints.md && currentWidth.value < breakpoints.lg
  )
  const isDesktop = computed(() => currentWidth.value >= breakpoints.lg)

  const isPortrait = computed(() => currentHeight.value > currentWidth.value)
  const isLandscape = computed(() => currentWidth.value > currentHeight.value)

  const isGreater = (bp: Breakpoint): boolean => currentWidth.value >= breakpoints[bp]
  const isLess = (bp: Breakpoint): boolean => currentWidth.value < breakpoints[bp]

  return {
    width: currentWidth,
    height: currentHeight,
    current,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isGreater,
    isLess
  }
}

export function useMediaQuery(query: string) {
  const matches = ref(false)

  onMounted(() => {
    const mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches

    const handler = (e: MediaQueryListEvent) => {
      matches.value = e.matches
    }

    mediaQuery.addEventListener('change', handler)

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handler)
    })
  })

  return matches
}

export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T) {
  const { current } = useBreakpoints()

  return computed(() => {
    const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
    const currentIndex = orderedBreakpoints.indexOf(current.value)

    for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
      const bp = orderedBreakpoints[i]
      if (values[bp] !== undefined) {
        return values[bp] as T
      }
    }

    return defaultValue
  })
}
