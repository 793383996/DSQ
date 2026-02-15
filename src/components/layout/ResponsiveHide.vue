<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoints, type Breakpoint } from '@/composables/useBreakpoints'

interface Props {
  hidden?: Breakpoint[]
  visible?: Breakpoint[]
}

const props = defineProps<Props>()

const { current } = useBreakpoints()

const isVisible = computed(() => {
  if (props.visible && props.visible.length > 0) {
    return props.visible.includes(current.value)
  }

  if (props.hidden && props.hidden.length > 0) {
    return !props.hidden.includes(current.value)
  }

  return true
})
</script>

<template>
  <template v-if="isVisible">
    <slot />
  </template>
</template>
