<!--
 * ResponsiveHide - 响应式隐藏组件
 *
 * 功能：
 * - 根据断点显示/隐藏内容
 * - 支持hidden属性指定隐藏的断点
 * - 支持visible属性指定显示的断点
 *
 * Props：
 * - hidden: 隐藏的断点列表
 * - visible: 显示的断点列表
 *
 * 上游调用：
 * - App.vue: 移动端隐藏某些元素
 * - 其他需要响应式隐藏的组件
 *
 * 下游依赖：
 * - composables/useBreakpoints.ts: 断点检测
 *
 * 使用示例：
 * - <ResponsiveHide :hidden="['xs', 'sm']">大屏显示</ResponsiveHide>
 * - <ResponsiveHide :visible="['lg', 'xl']">仅大屏显示</ResponsiveHide>
 -->
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
