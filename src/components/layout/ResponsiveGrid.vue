<!--
 * ResponsiveGrid - 响应式网格布局组件
 *
 * 功能：
 * - 提供响应式网格布局
 * - 根据断点自动调整列数和间距
 * - 支持自定义最大宽度
 *
 * Props：
 * - columns: 各断点的列数配置
 * - gap: 各断点的间距配置
 * - maxWidth: 最大宽度
 *
 * 上游调用：
 * - App.vue: 结果表格网格布局
 * - 其他需要网格布局的组件
 *
 * 下游依赖：
 * - composables/useBreakpoints.ts: 断点检测
 -->
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
