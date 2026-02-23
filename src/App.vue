<!--
 * App - 应用主组件
 *
 * 功能：
 * - 应用入口组件，协调所有子组件
 * - 管理计算流程和状态同步
 * - 处理用户交互事件
 * - 初始化遗留数据加载
 *
 * 主要方法：
 * - runCalculation(retryCount): 执行计算逻辑
 * - fixCalculation(): 修正计算
 * - handleAddDemand(item): 添加需求
 * - handleToggleExclude(item): 切换排除状态
 * - handleAddItem(item): 添加物品
 *
 * 上游调用：
 * - main.ts: 应用入口
 *
 * 下游依赖：
 * - stores/blueprint.ts: 状态管理
 * - core/bridge.ts: 遗留代码桥接
 * - core/services/CalculatorService.ts: 计算服务
 * - components/*: 所有UI组件
 *
 * 子组件：
 * - ControlPanel: 控制面板
 * - DemandList: 需求列表
 * - ResultTable: 结果表格
 * - ConfigPanel: 配置面板
 * - AddItemDialog: 添加物品对话框
 * - ErrorBoundary: 错误边界
 * - LocaleSwitcher: 语言切换
 * - PWAUpdateBanner: PWA更新提示
 -->
<template>
  <ErrorBoundary>
    <div id="app">
      <div class="page-header">
        <div class="header-row">
          <div class="header-text">
            <h1 class="page-title">
              {{ $t('app.title') }}
            </h1>
            <p class="page-subtitle">
              {{ $t('app.subtitle') }}
            </p>
          </div>
          <LocaleSwitcher />
        </div>
      </div>

      <ControlPanel
        @open-settings="showSettings = true"
        @fix-calculation="fixCalculation"
        @add-item="showAddDialog = true"
      />

      <DemandList @demand-changed="runCalculation" />

      <ResultTable
        :items="store.resultItems"
        :is-loading="isCalculating"
        :error="calculationError"
        :hide-source="hideSource"
        @add-demand="handleAddDemand"
        @toggle-exclude="handleToggleExclude"
        @retry="runCalculation"
      />

      <ConfigPanel v-model="showSettings" />

      <AddItemDialog v-model="showAddDialog" @confirm="handleAddItem" />

      <PWAUpdateBanner />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlueprintStore } from './stores/blueprint'
import { isLegacyDataLoaded, waitForLegacyData } from './core/bridge'
import { iconService } from './core/services/IconService'
import type { LegacyWindow } from './core/types/legacy'
import {
  calculatorService,
  StateChangedDuringCalculationError
} from './core/services/CalculatorService'
import { logger } from './utils/logger'
import { useMeta } from './composables/useMeta'
import ControlPanel from './components/ControlPanel/ControlPanel.vue'
import ConfigPanel from './components/ConfigPanel/ConfigPanel.vue'
import ResultTable from './components/ResultTable/ResultTable.vue'
import AddItemDialog from './components/AddItemDialog/AddItemDialog.vue'
import DemandList from './components/DemandList/DemandList.vue'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.vue'
import LocaleSwitcher from './components/LocaleSwitcher/LocaleSwitcher.vue'
import PWAUpdateBanner from './components/PWAUpdateBanner/PWAUpdateBanner.vue'

const { t, locale } = useI18n()
const store = useBlueprintStore()

const siteUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return import.meta.env.VITE_SITE_URL || 'https://dsq-calculator.example.com'
})

const ogImage = computed(() => `${siteUrl.value}/og-image.svg`)

const metaTitle = computed(() => t('meta.title'))
const metaDescription = computed(() => t('meta.description'))
const metaKeywords = computed(() =>
  t('meta.keywords')
    .split(',')
    .map((k: string) => k.trim())
)

useMeta({
  title: metaTitle,
  description: metaDescription,
  keywords: metaKeywords,
  ogImage,
  ogUrl: siteUrl,
  canonical: siteUrl
})

const showSettings = ref(false)
const showAddDialog = ref(false)
const hideSource = ref(false)
const isCalculating = ref(false)
const calculationError = ref<string | null>(null)
const isDataReady = ref(false)
let removeSettingsListener: (() => void) | null = null

function getWin(): LegacyWindow {
  return window as unknown as LegacyWindow
}

onMounted(async () => {
  // P0-3修复：启用store到legacy的自动同步
  store.enableSync()

  // P1-2修复：监听设置变更，自动触发计算
  removeSettingsListener = store.onSettingsChange(() => {
    if (store.demandList.length > 0) {
      runCalculation()
    }
  })

  const loadResult = await waitForLegacyData(10000, 2)
  isDataReady.value = loadResult.success

  if (!loadResult.success) {
    calculationError.value = t('errors.dataLoadFailed')
    logger.error(`[App] Data load failed after ${loadResult.retries} retries`)
    return
  }

  if (loadResult.retries > 0) {
    logger.log(`[App] Data loaded after ${loadResult.retries} retries`)
  }

  const win = getWin()
  if (win.xqs && win.xqs.length > 0) {
    win.xqs.forEach(item => {
      const name = item.item?.name || item.name
      const num = item.number || item.num || 1
      store.addDemand(name, num)
    })
  }

  if (win.ig_names && win.ig_names.length > 0) {
    win.ig_names.forEach((name: string) => {
      store.addExclude(name)
    })
  }

  if (iconService.isLoaded()) {
    store.checkIconsLoaded()
    logger.log('[App] Game icons already loaded')
  } else {
    const handleGameDataLoaded = () => {
      store.checkIconsLoaded()
      window.removeEventListener('gameDataLoaded', handleGameDataLoaded)
      if (loadTimeoutId !== null) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      logger.log('[App] Game icons loaded via event')
    }
    window.addEventListener('gameDataLoaded', handleGameDataLoaded)

    let loadTimeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      window.removeEventListener('gameDataLoaded', handleGameDataLoaded)
      loadTimeoutId = null
      if (!store.isIconsLoaded) {
        logger.warn('[App] Game icons load timeout')
      }
    }, 30000)

    iconService
      .loadIconData()
      .then(() => {
        store.checkIconsLoaded()
        logger.log('[App] IconService loaded successfully')
      })
      .catch(e => {
        logger.error('[App] IconService load failed:', e)
      })
  }

  if (win.settings || win.settings_time || win.settings_pf) {
    store.syncAllSettings(win.settings || {}, win.settings_time || {}, win.settings_pf || {})
    logger.log('[App] Settings synced to store')
  }
})

onUnmounted(() => {
  // P1-2修复：清理设置变更监听器
  if (removeSettingsListener) {
    removeSettingsListener()
    removeSettingsListener = null
  }
})

async function runCalculation(retryCount: number = 0) {
  if (store.demandList.length === 0) {
    calculationError.value = t('errors.noDemand')
    return
  }

  if (!isDataReady.value && !isLegacyDataLoaded()) {
    calculationError.value = t('errors.dataLoading')
    return
  }

  if (isCalculating.value) {
    logger.log('[App] Calculation already in progress, skipping')
    return
  }

  isCalculating.value = true
  calculationError.value = null
  store.setCalculating(true)

  try {
    await nextTick()
    store.forceSyncToLegacy()

    const snapshot = store.createSnapshot()
    const demands = snapshot.demandList.map(d => ({
      name: d.name,
      num: d.num || 1
    }))
    const excludes = [...snapshot.excludeList]

    const result = await calculatorService.calculateWithOptions(demands, {
      excludes,
      onStateSnapshot: () => snapshot,
      validateState: s => store.validateSnapshot(s),
      throwOnStateChange: true,
      selfAcc: store.machineSettings.selfAcc ?? false,
      isAddSelfAccP: store.machineSettings.isAddSelfAccP ?? false,
      machineSettings: {
        modeIn: store.machineSettings.modeIn,
        furnace: store.machineSettings.furnace,
        chemical: store.machineSettings.chemical,
        research: store.machineSettings.research,
        accType: store.machineSettings.accType,
        accValue: store.machineSettings.accValue,
        hideSource: store.machineSettings.hideSource,
        selfAcc: store.machineSettings.selfAcc,
        isAddSelfAccP: store.machineSettings.isAddSelfAccP
      }
    })

    if (result && result.items) {
      const allItems = [...result.items, ...(result.items2 || [])]
      store.setResultItems(
        allItems.map((item, index) => ({
          ...item,
          id: `${item.name}-${index}`
        }))
      )
    }
  } catch (error: unknown) {
    if (error instanceof StateChangedDuringCalculationError && retryCount < 3) {
      const adaptiveDelay = Math.min(100, 10 * Math.pow(2, retryCount))
      logger.warn(
        `[App] State changed during calculation (version ${error.version}), retrying (${retryCount + 1}/3) with ${adaptiveDelay}ms delay`
      )
      isCalculating.value = false
      store.setCalculating(false)
      await new Promise(resolve => setTimeout(resolve, adaptiveDelay))
      return runCalculation(retryCount + 1)
    }
    const err = error as Error
    calculationError.value = err?.message || t('errors.calculationFailed')
    store.setError(err?.message || t('errors.calculationFailed'))
  } finally {
    isCalculating.value = false
    store.setCalculating(false)
  }
}

function fixCalculation() {
  runCalculation()
}

function handleAddDemand(item: { name: string }) {
  store.addDemand(item.name, 1)
  runCalculation()
}

// P2-1修复：支持明确的action参数，避免状态不一致
function handleToggleExclude(item: { name: string; action?: 'exclude' | 'include' }) {
  if (item.action === 'exclude') {
    store.addExclude(item.name)
  } else if (item.action === 'include') {
    store.removeExclude(item.name)
  } else {
    // 兼容旧的调用方式
    if (store.excludeList.includes(item.name)) {
      store.removeExclude(item.name)
    } else {
      store.addExclude(item.name)
    }
  }
  runCalculation()
}

function handleAddItem(item: { name: string; num: number }) {
  store.addDemand(item.name, item.num)
  runCalculation()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #f5f7fa, #e4e8ec);
  min-height: 100vh;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
  padding: 20px 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  text-align: left;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #2980b9, #3498db, #1abc9c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.page-subtitle {
  color: #6b7280;
  font-size: 14px;
}
</style>
