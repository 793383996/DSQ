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
import { initLegacyBridge, syncStateToLegacy, runCalculation } from './core/bridge'
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

onMounted(() => {
  initLegacyBridge()

  if (window.settings) {
    store.loadMachineSettings(window.settings as any)
  }

  if (window.xqs && window.xqs.length > 0) {
    store.demandList = window.xqs
  }

  if (window.ig_names && window.ig_names.length > 0) {
    store.excludeList = window.ig_names
  }

  syncStateToLegacy({
    demandList: store.demandList,
    excludeList: store.excludeList,
    machineSettings: store.machineSettings
  })
})

onUnmounted(() => {
})

async function runCalculation() {
  if (store.demandList.length === 0) {
    calculationError.value = '请先添加需求'
    return
  }

  isCalculating.value = true
  calculationError.value = null
  store.setCalculating(true)

  try {
    syncStateToLegacy({
      demandList: store.demandList,
      excludeList: store.excludeList,
      machineSettings: store.machineSettings
    })

    const result = await runCalculation()

    if (result && result.out_list) {
      resultItems.value = result.out_list.map((item: any, index: number) => ({
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
