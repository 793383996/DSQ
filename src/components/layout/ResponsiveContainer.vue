<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoints, type Breakpoint } from '@/composables/useBreakpoints'

interface Props {
  maxWidth?: Partial<Record<Breakpoint, string>>
  padding?: Partial<Record<Breakpoint, string>>
  fluid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: () => ({ sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' }),
  padding: () => ({ xs: '16px', sm: '24px', md: '32px' }),
  fluid: false
})

const { current } = useBreakpoints()

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

const containerStyle = computed(() => ({
  maxWidth: props.fluid ? '100%' : getResponsiveValue(props.maxWidth, '100%'),
  padding: getResponsiveValue(props.padding, '16px'),
  margin: '0 auto',
  width: '100%'
}))
</script>

<template>
  <div class="responsive-container" :style="containerStyle">
    <slot />
  </div>
</template>

<style scoped>
.responsive-container {
  box-sizing: border-box;
}
</style>
