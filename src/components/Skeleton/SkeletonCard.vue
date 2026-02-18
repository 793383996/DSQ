<!--
 * SkeletonCard - 卡片骨架屏组件
 *
 * 功能：
 * - 显示卡片加载前的占位骨架
 * - 支持头部/头像/图片/内容/底部区域
 * - 可配置显示行数
 *
 * Props：
 * - showHeader: 是否显示头部
 * - showAvatar: 是否显示头像
 * - showImage: 是否显示图片区域
 * - lines: 内容行数
 * - showFooter: 是否显示底部
 *
 * 上游调用：
 * - App.vue: 数据加载时显示
 * - 其他需要卡片占位的组件
 *
 * 下游依赖：
 * - Skeleton.vue: 基础骨架组件
 -->
<script setup lang="ts">
import Skeleton from './Skeleton.vue'

interface Props {
  showHeader?: boolean
  showAvatar?: boolean
  showImage?: boolean
  lines?: number
  showFooter?: boolean
}

withDefaults(defineProps<Props>(), {
  showHeader: true,
  showAvatar: false,
  showImage: false,
  lines: 3,
  showFooter: false
})
</script>

<template>
  <div class="skeleton-card">
    <div v-if="showHeader" class="skeleton-card-header">
      <Skeleton v-if="showAvatar" variant="circular" width="40" height="40" />
      <div class="skeleton-card-header-content">
        <Skeleton width="60%" height="16" />
        <Skeleton width="40%" height="12" />
      </div>
    </div>

    <div v-if="showImage" class="skeleton-card-image">
      <Skeleton variant="rectangular" height="200" />
    </div>

    <div class="skeleton-card-content">
      <Skeleton v-for="i in lines" :key="i" :width="i === lines ? '70%' : '100%'" height="14" />
    </div>

    <div v-if="showFooter" class="skeleton-card-footer">
      <Skeleton width="80" height="32" />
      <Skeleton width="80" height="32" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-card-header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-card-image {
  margin-bottom: 16px;
  border-radius: 4px;
  overflow: hidden;
}

.skeleton-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
