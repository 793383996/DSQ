<!--
 * PWAUpdateBanner - PWA更新提示横幅组件
 *
 * 功能：
 * - 检测Service Worker更新并提示用户
 * - 支持稍后更新和立即刷新
 * - 支持离线就绪提示
 *
 * 主要方法：
 * - dismiss(): 关闭更新提示
 * - refresh(): 执行Service Worker更新并刷新页面
 *
 * 上游调用：
 * - App.vue: 作为PWA更新提示入口
 *
 * 下游依赖：
 * - virtual:pwa-register: registerSW() 注册Service Worker
 * - utils/logger.ts: 日志记录
 *
 * 生命周期：
 * - onMounted: 注册SW回调
 * - onUnmounted: 清理回调引用
 -->
<template>
  <Teleport to="body">
    <Transition name="pwa-update">
      <div v-if="visible" class="pwa-update-banner">
        <div class="pwa-content">
          <span class="pwa-icon">🔄</span>
          <span class="pwa-message">{{ message }}</span>
        </div>
        <div class="pwa-actions">
          <button class="pwa-btn pwa-btn-later" @click="dismiss">
            {{ laterText }}
          </button>
          <button class="pwa-btn pwa-btn-refresh" @click="refresh">
            {{ refreshText }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerSW } from 'virtual:pwa-register'
import { logger } from '../../utils/logger'

const { t } = useI18n()

const visible = ref(false)
const updateSW = ref<((reloadPage?: boolean) => Promise<void>) | null>(null)
let needRefreshHandler: (() => void) | null = null
let offlineReadyHandler: (() => void) | null = null
let registerErrorHandler: ((error: Error) => void) | null = null

const message = computed(() => t('pwa.updateAvailable'))
const laterText = computed(() => t('common.later') || '稍后')
const refreshText = computed(() => t('common.refresh') || '刷新')

onMounted(() => {
  needRefreshHandler = () => {
    visible.value = true
  }

  offlineReadyHandler = () => {
    logger.info(`[PWA] ${t('pwa.offlineReady')}`)
  }

  registerErrorHandler = (error: Error) => {
    logger.error(`[PWA] ${t('pwa.registerFailed')}:`, error)
  }

  updateSW.value = registerSW({
    onNeedRefresh: needRefreshHandler,
    onOfflineReady: offlineReadyHandler,
    onRegisterError: registerErrorHandler
  })
})

onUnmounted(() => {
  needRefreshHandler = null
  offlineReadyHandler = null
  registerErrorHandler = null
  updateSW.value = null
  visible.value = false
})

function dismiss() {
  visible.value = false
}

async function refresh() {
  if (!updateSW.value) {
    logger.warn('[PWA] updateSW not available')
    visible.value = false
    return
  }

  try {
    await updateSW.value(true)
  } catch (e) {
    logger.error('[PWA] Failed to update service worker:', e)
  } finally {
    visible.value = false
  }
}
</script>

<style scoped>
.pwa-update-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 9999;
  max-width: 90vw;
}

.pwa-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pwa-icon {
  font-size: 20px;
}

.pwa-message {
  font-size: 14px;
  white-space: nowrap;
}

.pwa-actions {
  display: flex;
  gap: 8px;
}

.pwa-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.pwa-btn-later {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.pwa-btn-later:hover {
  background: rgba(255, 255, 255, 0.3);
}

.pwa-btn-refresh {
  background: white;
  color: #2980b9;
  font-weight: 500;
}

.pwa-btn-refresh:hover {
  background: #f0f7ff;
  transform: translateY(-1px);
}

.pwa-update-enter-active,
.pwa-update-leave-active {
  transition: all 0.3s ease;
}

.pwa-update-enter-from,
.pwa-update-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 480px) {
  .pwa-update-banner {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 16px;
  }

  .pwa-message {
    white-space: normal;
  }
}
</style>
