<template>
  <slot v-if="!hasError" />
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

const { t } = useI18n()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')

onErrorCaptured((error: Error, instance, info) => {
  hasError.value = true
  errorMessage.value = error.message || t('common.error')
  errorDetails.value = import.meta.env.DEV ? `${error.stack || ''}\n\nComponent: ${info}` : ''

  logger.error('[ErrorBoundary] Caught error:', error, info)

  return false
})

function resetError() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
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
