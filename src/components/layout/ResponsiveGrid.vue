<script setup lang="ts">
import { computed, provide, inject, type InjectionKey } from 'vue'
import { useBreakpoints, type Breakpoint } from '@/composables/useBreakpoints'

interface Props {
  columns?: Partial<Record<Breakpoint, number>>
  gap?: Partial<Record<Breakpoint, string | number>>
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => ({ xs: 1, sm: 2, md: 3, lg: 4 }),
  gap: () => ({ xs: '8px', sm: '12px', md: '16px' }),
  maxWidth: '100%'
})

const { current, isGreater } = useBreakpoints()

function getResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = orderedBreakpoints.indexOf(current.value)

  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i]
    if (values[bp] !== undefined) {
      return values[bp] as T
    }
  }

  return defaultValue
}

const gridColumns = computed(() => {
  return getResponsiveValue(props.columns, 1)
})

const gridGap = computed(() => {
  const gap = getResponsiveValue(props.gap, '16px')
  return typeof gap === 'number' ? `${gap}px` : gap
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
  gap: gridGap.value,
  maxWidth: props.maxWidth,
  margin: '0 auto'
}))
</script>

<template>
  <div class="responsive-grid" :style="gridStyle">
    <slot />
  </div>
</template>

<style scoped>
.responsive-grid {
  width: 100%;
}
</style>
