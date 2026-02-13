<template>
  <div class="control-bar">
    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #4a5568;">每分钟产量：</span>
        <input
          type="text"
          :value="productionPerMinute"
          @input="updateProductionPerMinute"
          :style="{ minWidth: '70px', width: productionWidth }"
        />
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #4a5568;">或生产设备数：</span>
        <input
          type="number"
          :value="machineCount"
          @input="updateMachineCount"
          min="1"
          max="1000"
          :style="{ minWidth: '70px', width: machineWidth, appearance: 'textfield' }"
        />
      </div>
      <a href="javascript:void(0)" @click="handleAdd" style="display: flex; align-items: center; padding: 6px 12px; background: linear-gradient(135deg, #DDEFDD, #C3E2FB); border-radius: 8px; transition: all 0.3s ease;" title="添加">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAZVJREFUWEftl89VwkAQh3+DBRjTgHpYrtKBdCB0gEfDRSsQK5AL8YgdiB1gB3gll1CAMRTgjm9XCZslIf7Je8khe0y+N5m3mfl2h1Dxooq/jyQB5yHothhPAJx0UhxKRj8ethfquTNZdlqkODqxko8loR9fibnmdDyeFnFJAq4fxAAOs3aEgJc3T3TVO9cPQgDHOTsXR544KuY4jLz2qeLMBHjf74g8oVnXD0rlmgRqtQO5xcWM5/eh6H3XgOqGs5x6WUWe0N1RUKwJt23DybJzQDRm4NwMrj7O4JHZhgQaEeHC5FSnfDBfm1xWPJurj4iqMmLqF+QYbiGZL9MmpCmATrExizmzC8oowsaE+K2yayWiUg+Znx5aZRfhOvKEvk/8yYQtokdbs1mGy+IAvErmgdWuO/FsrjFhyoREdE+AvnptFgMzZr5LHUZEtwTo09FYO8bMiTdn5ptNvJKLcHvXc/1gz7Hd3AmRGLMxYdmDyT9M+DWaKXPZU89KMvcsw80yuLUk9JLRTI9wlMWtJGGw4RoTfgKyI5kwSL6MMgAAAABJRU5ErkJggg==" style="width: 20px; height: 20px;" />
      </a>
      <div class="custom-dropdown">
        <button id="btnSetting" @click="$emit('open-settings')">参数设置</button>
        <button id="btnReset1" style="background: linear-gradient(135deg, #f97316, #ea580c);" @click="$emit('fix-calculation')">修复计算空白</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBlueprintStore } from '../../stores/blueprint'
import { legacySetProductionSettings } from '../../core/bridge'

const emit = defineEmits<{
  (e: 'open-settings'): void
  (e: 'fix-calculation'): void
  (e: 'add-item'): void
}>()

const store = useBlueprintStore()

const productionPerMinute = ref(60)
const machineCount = ref(1)

const productionWidth = computed(() => {
  return (parseFloat(productionPerMinute.value?.toString() || '60') >= 999 ? 150 : 70) + 'px'
})

const machineWidth = computed(() => {
  return (parseFloat(machineCount.value?.toString() || '1') >= 999 ? 150 : 70) + 'px'
})

function updateProductionPerMinute(e: Event) {
  const value = (e.target as HTMLInputElement).value
  productionPerMinute.value = parseFloat(value) || 1
  legacySetProductionSettings(productionPerMinute.value, machineCount.value)
}

function updateMachineCount(e: Event) {
  const value = (e.target as HTMLInputElement).value
  machineCount.value = parseInt(value) || 1
  legacySetProductionSettings(productionPerMinute.value, machineCount.value)
}

function handleAdd() {
  emit('add-item')
}
</script>

<style scoped>
.control-bar {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.custom-dropdown {
  display: flex;
  gap: 8px;
}

.custom-dropdown button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #DDEFDD, #C3E2FB);
  color: #1e40af;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.custom-dropdown button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
