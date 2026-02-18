<!--
 * ResponsiveContainer - 响应式容器组件
 *
 * 功能：
 * - 提供响应式最大宽度和内边距
 * - 根据断点自动调整容器尺寸
 * - 支持流式布局（100%宽度）
 *
 * Props：
 * - maxWidth: 各断点的最大宽度配置
 * - padding: 各断点的内边距配置
 * - fluid: 是否流式布局
 *
 * 上游调用：
 * - App.vue: 页面主容器
 * - 其他需要响应式容器的组件
 *
 * 下游依赖：
 * - composables/useBreakpoints.ts: 断点检测
 *
 * 断点顺序：
 * - xs < sm < md < lg < xl < 2xl
 -->
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
