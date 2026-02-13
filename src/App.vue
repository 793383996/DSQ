<template>
  <div id="app">
    <div class="page-header">
      <h1 class="page-title">戴森球计划量产量化计算器</h1>
      <p class="page-subtitle">全自动计算量产产品的具体产能需求</p>
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

    <ConfigPanel
      v-model="showSettings"
    />

    <AddItemDialog
      v-model="showAddDialog"
      @confirm="handleAddItem"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBlueprintStore } from './stores/blueprint'
import { initLegacyBridge, isLegacyDataLoaded, waitForLegacyData } from './core/bridge'
import { calculatorService } from './core/services/CalculatorService'
import ControlPanel from './components/ControlPanel/ControlPanel.vue'
import ConfigPanel from './components/ConfigPanel/ConfigPanel.vue'
import ResultTable from './components/ResultTable/ResultTable.vue'
import AddItemDialog from './components/AddItemDialog/AddItemDialog.vue'

const store = useBlueprintStore()

const showSettings = ref(false)
const showAddDialog = ref(false)
const hideSource = ref(false)
const resultItems = ref<any[]>([])
const isCalculating = ref(false)
const calculationError = ref<string | null>(null)
const isDataReady = ref(false)

onMounted(async () => {
  initLegacyBridge()

  const dataLoaded = await waitForLegacyData(10000)
  isDataReady.value = dataLoaded

  if (!dataLoaded) {
    calculationError.value = '数据加载失败，请刷新页面重试'
    return
  }

  if (window.xqs && window.xqs.length > 0) {
    window.xqs.forEach((item: any) => {
      const name = item.item?.name || item.name
      const num = item.number || item.num || 1
      store.addDemand(name, num)
    })
  }

  if (window.ig_names && window.ig_names.length > 0) {
    window.ig_names.forEach((name: string) => {
      store.addExclude(name)
    })
  }
})

onUnmounted(() => {
})

async function runCalculation() {
  if (store.demandList.length === 0) {
    calculationError.value = '请先添加需求'
    return
  }

  if (!isDataReady.value && !isLegacyDataLoaded()) {
    calculationError.value = '数据正在加载中，请稍候'
    return
  }

  isCalculating.value = true
  calculationError.value = null
  store.setCalculating(true)

  try {
    const demands = store.demandList.map(d => ({
      name: d.name,
      num: d.num || 1
    }))
    const excludes = [...store.excludeList]

    const result = await calculatorService.calculate(demands, excludes)

    if (result && result.items) {
      const allItems = [...result.items, ...(result.items2 || [])]
      resultItems.value = allItems.map((item: any, index: number) => ({
        ...item,
        id: `${item.name}-${index}`
      }))
      store.setResultItems(resultItems.value)
    }
  } catch (error: any) {
    calculationError.value = error?.message || '计算失败，请检查配置'
    store.setError(error?.message || '计算失败')
  } finally {
    isCalculating.value = false
    store.setCalculating(false)
  }
}

function fixCalculation() {
  runCalculation()
}

function handleAddDemand(item: any) {
  store.addDemand(item.name, 1)
  runCalculation()
}

function handleToggleExclude(item: any) {
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

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #f5f7fa, #e4e8ec);
  min-height: 100vh;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px 0;
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
