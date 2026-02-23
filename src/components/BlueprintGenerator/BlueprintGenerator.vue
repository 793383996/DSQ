<!--
 * BlueprintGenerator - 蓝图生成器组件
 *
 * 功能：
 * - 根据计算结果生成可导入游戏的蓝图字符串
 * - 支持蓝图字符串复制到剪贴板
 * - 支持蓝图文件下载
 *
 * 主要方法：
 * - generateBlueprint(): 生成蓝图字符串
 * - copyToClipboard(text): 复制到剪贴板
 * - createDownloadUrl(text): 创建下载链接
 *
 * 上游调用：
 * - App.vue: 作为蓝图生成入口
 *
 * 下游依赖：
 * - core/bridge.ts: generateBlueprintWithAdapter() 调用蓝图生成服务
 * - stores/blueprint.ts: 获取需求列表和计算结果
 * - composables/useToast.ts: 显示操作结果提示
 *
 * 生成条件：
 * - demandList.length > 0 且 resultItems.length > 0
 -->
<template>
  <div class="blueprint-generator">
    <button class="generate-btn" :disabled="!canGenerate" @click="generateBlueprint">
      <span class="btn-icon">📋</span>
      {{ $t('blueprintGenerator.generate') }}
    </button>

    <div v-if="generatedUrl" class="blueprint-result">
      <div class="result-success">
        <span class="success-icon">✓</span>
        <span>{{ $t('blueprintGenerator.generatedAndCopied') }}</span>
      </div>
      <a :href="generatedUrl" download="blueprint.txt" class="download-link">
        {{ $t('blueprintGenerator.downloadFile') }}
      </a>
    </div>

    <div v-if="error" class="blueprint-error">
      <span class="error-icon">✕</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlueprintStore } from '../../stores/blueprint'
import { generateBlueprintFromStoreData } from '../../core/bridge'
import { useToast } from '../../composables/useToast'
import { logger } from '../../utils/logger'

const { t } = useI18n()
const store = useBlueprintStore()
const toast = useToast()

const generatedUrl = ref<string | null>(null)
const error = ref<string | null>(null)
const blueprintData = ref<string | null>(null)

const canGenerate = computed(() => {
  return store.demandList.length > 0 && store.resultItems.length > 0
})

function generateBlueprint(): void {
  error.value = null
  generatedUrl.value = null

  try {
    const result = generateBlueprintFromStoreData(store.resultItems, store.demandList)
    if (!result.success) {
      error.value = result.error || t('blueprintGenerator.generateFailed')
      toast.error(t('blueprintGenerator.generateFailed') + ': ' + error.value, 5000)
      return
    }

    toast.success(t('blueprintGenerator.generatedAndCopied'), 3000)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || t('blueprintGenerator.generateFailed')
    toast.error(t('blueprintGenerator.generateFailed') + ': ' + error.value, 5000)
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    logger.error('Failed to copy to clipboard:', e)
    return false
  }
}

function createDownloadUrl(text: string): string {
  const blob = new Blob([text], { type: 'text/plain' })
  return URL.createObjectURL(blob)
}
</script>

<style scoped>
.blueprint-generator {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

.blueprint-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.result-success {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #16a34a;
  font-size: 14px;
}

.success-icon {
  width: 20px;
  height: 20px;
  background: #16a34a;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.download-link {
  color: #8b5cf6;
  font-size: 13px;
  text-decoration: none;
}

.download-link:hover {
  text-decoration: underline;
}

.blueprint-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.error-icon {
  width: 20px;
  height: 20px;
  background: #dc2626;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
