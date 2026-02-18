<!--
 * ErrorBoundary - 错误边界组件
 *
 * 功能：
 * - 捕获子组件的渲染错误
 * - 显示友好的错误提示界面
 * - 支持重试和刷新页面
 * - 开发环境显示详细错误堆栈
 *
 * 主要方法：
 * - onErrorCaptured(): Vue错误捕获钩子
 * - resetError(): 重置错误状态并重新渲染
 * - refreshPage(): 刷新页面
 *
 * 上游调用：
 * - App.vue: 包裹整个应用，作为顶层错误边界
 *
 * 下游依赖：
 * - utils/logger.ts: 日志记录
 * - utils/errorReporter.ts: 错误上报
 *
 * 特性：
 * - 使用slot渲染正常内容
 * - 捕获错误后显示fallback UI
 * - retryKey用于强制重新渲染
 -->
<template>
  <slot v-if="!hasError" :key="retryKey" />
  <div v-else class="error-boundary">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">
        {{ $t('errorBoundary.title') }}
      </h2>
      <p class="error-message">
        {{ errorMessage }}
      </p>
      <div class="error-actions">
        <button class="btn-retry" @click="resetError">
          {{ $t('errorBoundary.retry') }}
        </button>
        <button class="btn-refresh" @click="refreshPage">
          {{ $t('errorBoundary.refresh') }}
        </button>
      </div>
      <details v-if="errorDetails" class="error-details">
        <summary>{{ $t('errorBoundary.details') }}</summary>
        <pre>{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useI18n } from 'vue-i18n'
import { logger } from '@/utils/logger'
import { captureError } from '@/utils/errorReporter'

const { t } = useI18n()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const retryKey = ref(0)

onErrorCaptured((error: Error, instance, info) => {
  hasError.value = true
  errorMessage.value = error.message || t('common.error')
  errorDetails.value = import.meta.env.DEV ? `${error.stack || ''}\n\nComponent: ${info}` : ''

  logger.error('[ErrorBoundary] Caught error:', error, info)
  captureError(error, {
    type: 'vue',
    context: {
      componentName: instance?.$options?.name,
      info
    }
  })

  return false
})

function resetError() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  retryKey.value++
}

function refreshPage() {
  window.location.reload()
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 20px;
}

.error-content {
  text-align: center;
  max-width: 500px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  margin: 0 0 12px;
  color: #333;
  font-size: 20px;
}

.error-message {
  margin: 0 0 24px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-actions button {
  padding: 10px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-retry {
  background: #1890ff;
  color: #fff;
}

.btn-retry:hover {
  background: #40a9ff;
}

.btn-refresh {
  background: #f5f5f5;
  color: #333;
}

.btn-refresh:hover {
  background: #e8e8e8;
}

.error-details {
  margin-top: 24px;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  color: #999;
  font-size: 12px;
}

.error-details pre {
  margin-top: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
