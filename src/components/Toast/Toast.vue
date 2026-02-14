<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`, { 'toast-loading': toast.type === 'loading' }]"
      >
        <span class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">✕</span>
          <span v-else-if="toast.type === 'warning'">⚠</span>
          <span v-else-if="toast.type === 'loading'" class="loading-spinner" />
          <span v-else>ℹ</span>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button v-if="toast.showClose" class="toast-close" @click="removeToast(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration?: number
  showClose?: boolean
}

const { t } = useI18n()

const toasts = ref<ToastItem[]>([])
let toastId = 0

function addToast(options: Omit<ToastItem, 'id'>) {
  const id = ++toastId
  const toast: ToastItem = {
    id,
    message: options.message,
    type: options.type || 'info',
    duration: options.duration ?? 3000,
    showClose: options.showClose ?? false
  }
  toasts.value.push(toast)

  if (toast.duration && toast.duration > 0) {
    setTimeout(() => removeToast(id), toast.duration)
  }

  return id
}

function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function success(message: string, duration?: number) {
  return addToast({ message, type: 'success', duration })
}

function error(message: string, duration?: number) {
  return addToast({ message, type: 'error', duration: duration ?? 5000 })
}

function warning(message: string, duration?: number) {
  return addToast({ message, type: 'warning', duration })
}

function info(message: string, duration?: number) {
  return addToast({ message, type: 'info', duration })
}

function loading(message?: string) {
  return addToast({
    message: message || t('common.loading'),
    type: 'loading',
    duration: 0,
    showClose: true
  })
}

function hide(id: number) {
  removeToast(id)
}

defineExpose({
  success,
  error,
  warning,
  info,
  loading,
  hide,
  remove: removeToast
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  min-width: 200px;
  max-width: 400px;
}

.toast-success {
  border-left: 4px solid #27ae60;
}

.toast-error {
  border-left: 4px solid #e74c3c;
}

.toast-warning {
  border-left: 4px solid #f39c12;
}

.toast-info {
  border-left: 4px solid #3498db;
}

.toast-loading {
  border-left: 4px solid #3498db;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}

.toast-success .toast-icon {
  color: #27ae60;
}

.toast-error .toast-icon {
  color: #e74c3c;
}

.toast-warning .toast-icon {
  color: #f39c12;
}

.toast-info .toast-icon {
  color: #3498db;
}

.toast-loading .toast-icon {
  color: #3498db;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #2d3748;
}

.toast-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.toast-close:hover {
  color: #64748b;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
