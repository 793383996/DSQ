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

      <ResultTable
        :items="resultItems"
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlueprintStore } from './stores/blueprint'
import { isLegacyDataLoaded, waitForLegacyData, isGameDataLoaded } from './core/bridge'
import type { LegacyWindow } from './core/types/legacy'
import {
  calculatorService,
  StateChangedDuringCalculationError
} from './core/services/CalculatorService'
import type { ResultItem } from './stores/blueprint'
import { logger } from './utils/logger'
import ControlPanel from './components/ControlPanel/ControlPanel.vue'
import ConfigPanel from './components/ConfigPanel/ConfigPanel.vue'
import ResultTable from './components/ResultTable/ResultTable.vue'
import AddItemDialog from './components/AddItemDialog/AddItemDialog.vue'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.vue'
import LocaleSwitcher from './components/LocaleSwitcher/LocaleSwitcher.vue'
import PWAUpdateBanner from './components/PWAUpdateBanner/PWAUpdateBanner.vue'

const { t } = useI18n()
const store = useBlueprintStore()

const showSettings = ref(false)
const showAddDialog = ref(false)
const hideSource = ref(false)
const resultItems = ref<ResultItem[]>([])
const isCalculating = ref(false)
const calculationError = ref<string | null>(null)
const isDataReady = ref(false)

function getWin(): LegacyWindow {
  return window as unknown as LegacyWindow
}

onMounted(async () => {
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

  const iconCheckInterval = setInterval(() => {
    if (isGameDataLoaded()) {
      store.checkIconsLoaded()
      clearInterval(iconCheckInterval)
      logger.log('[App] Game icons loaded')
    }
  }, 500)

  setTimeout(() => clearInterval(iconCheckInterval), 30000)

  if (win.settings || win.settings_time || win.settings_pf) {
    store.syncAllSettings(win.settings || {}, win.settings_time || {}, win.settings_pf || {})
    logger.log('[App] Settings synced to store')
  }
})

onUnmounted(() => {})

async function runCalculation(retryCount: number = 0) {
  if (store.demandList.length === 0) {
    calculationError.value = t('errors.noDemand')
    return
  }

  if (!isDataReady.value && !isLegacyDataLoaded()) {
    calculationError.value = t('errors.dataLoading')
    return
  }

  isCalculating.value = true
  calculationError.value = null
  store.setCalculating(true)

  try {
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
      throwOnStateChange: true
    })

    if (result && result.items) {
      const allItems = [...result.items, ...(result.items2 || [])]
      resultItems.value = allItems.map((item, index) => ({
        ...item,
        id: `${item.name}-${index}`
      }))
      store.setResultItems(resultItems.value)
    }
  } catch (error: unknown) {
    if (error instanceof StateChangedDuringCalculationError && retryCount < 3) {
      logger.log(`[App] State changed, retrying calculation (${retryCount + 1}/3)`)
      isCalculating.value = false
      store.setCalculating(false)
      await new Promise(resolve => setTimeout(resolve, 10))
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

function handleToggleExclude(item: { name: string }) {
  if (store.excludeList.includes(item.name)) {
    store.removeExclude(item.name)
  } else {
    store.addExclude(item.name)
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
