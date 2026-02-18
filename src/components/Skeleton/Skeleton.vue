<!--
 * Skeleton - 骨架屏基础组件
 *
 * 功能：
 * - 显示内容加载前的占位骨架
 * - 支持多种变体：文本/圆形/矩形
 * - 支持多种动画：脉冲/波浪/无动画
 * - 支持多行显示
 *
 * Props：
 * - width: 宽度（字符串或数字）
 * - height: 高度（字符串或数字）
 * - variant: 变体类型 text/circular/rectangular
 * - animation: 动画类型 pulse/wave/none
 * - rows: 行数
 *
 * 上游调用：
 * - SkeletonCard.vue: 卡片骨架
 * - SkeletonTable.vue: 表格骨架
 * - 其他需要加载占位的组件
 -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1em',
  variant: 'text',
  animation: 'pulse',
  rows: 1
})

const style = computed(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height

  return {
    width,
    height: props.variant === 'circular' ? width : height,
    borderRadius:
      props.variant === 'circular' ? '50%' : props.variant === 'rectangular' ? '4px' : '4px'
  }
})

const animationClass = computed(() => {
  if (props.animation === 'none') return ''
  return `skeleton-${props.animation}`
})
</script>

<template>
  <div class="skeleton-wrapper">
    <div v-for="i in rows" :key="i" class="skeleton" :class="animationClass" :style="style" />
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.skeleton {
  display: block;
  background-color: rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out 0.5s infinite;
}

.skeleton-wave {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

@keyframes skeleton-wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
