<!--
 * ControlPanel - 控制面板组件
 *
 * 功能：
 * - 产量输入：每分钟产量设置
 * - 设备数量输入：直接设置设备数量
 * - 添加需求按钮：触发添加物品对话框
 * - 设置按钮：打开配置面板
 * - 修正计算按钮：重新计算
 *
 * 主要方法：
 * - updateProductionPerMinute(e): 更新每分钟产量
 * - updateMachineCount(e): 更新设备数量
 * - handleAdd(): 触发添加物品事件
 *
 * 上游调用：
 * - App.vue: 作为控制栏入口
 *
 * 下游依赖：
 * - stores/blueprint.ts: 状态管理
 * - core/bridge.ts: legacySetProductionSettings() 设置产量参数
 *
 * 事件：
 * - @open-settings: 打开设置面板
 * - @fix-calculation: 修正计算
 * - @add-item: 添加物品
 -->
<template>
  <div class="control-bar">
    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px">
      <div style="display: flex; align-items: center; gap: 8px">
        <span style="color: #4a5568">{{ $t('controlPanel.productionPerMinute') }}：</span>
        <input
          type="text"
          :value="productionPerMinute"
          :style="{ minWidth: '70px', width: productionWidth }"
          @input="updateProductionPerMinute"
        />
      </div>
      <div style="display: flex; align-items: center; gap: 8px">
        <span style="color: #4a5568">{{ $t('controlPanel.machineCount') }}：</span>
        <input
          type="number"
          :value="machineCount"
          min="1"
          max="1000"
          :style="{ minWidth: '70px', width: machineWidth, appearance: 'textfield' }"
          @input="updateMachineCount"
        />
      </div>
      <a
        href="javascript:void(0)"
        style="
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: linear-gradient(135deg, #ddefdd, #c3e2fb);
          border-radius: 8px;
          transition: all 0.3s ease;
        "
        :title="$t('common.add')"
        @click="handleAdd"
      >
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAZVJREFUWEftl89VwkAQh3+DBRjTgHpYrtKBdCB0gEfDRSsQK5AL8YgdiB1gB3gll1CAMRTgjm9XCZslIf7Je8khe0y+N5m3mfl2h1Dxooq/jyQB5yHothhPAJx0UhxKRj8ethfquTNZdlqkODqxko8loR9fibnmdDyeFnFJAq4fxAAOs3aEgJc3T3TVO9cPQgDHOTsXR544KuY4jLz2qeLMBHjf74g8oVnXD0rlmgRqtQO5xcWM5/eh6H3XgOqGs5x6WUWe0N1RUKwJt23DybJzQDRm4NwMrj7O4JHZhgQaEeHC5FSnfDBfm1xWPJurj4iqMmLqF+QYbiGZL9MmpCmATrExizmzC8oowsaE+K2yayWiUg+Znx5aZRfhOvKEvk/8yYQtokdbs1mGy+IAvErmgdWuO/FsrjFhyoREdE+AvnptFgMzZr5LHUZEtwTo09FYO8bMiTdn5ptNvJKLcHvXc/1gz7Hd3AmRGLMxYdmDyT9M+DWaKXPZU89KMvcsw80yuLUk9JLRTI9wlMWtJGGw4RoTfgKyI5kwSL6MMgAAAABJRU5ErkJggg=="
          style="width: 20px; height: 20px"
        />
      </a>
      <div class="custom-dropdown">
        <button id="btnSetting" @click="$emit('open-settings')">
          {{ $t('controlPanel.settings') }}
        </button>
        <button
          id="btnReset1"
          style="background: linear-gradient(135deg, #f97316, #ea580c)"
          @click="$emit('fix-calculation')"
        >
          {{ $t('controlPanel.fixCalculation') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
  background: linear-gradient(135deg, #ddefdd, #c3e2fb);
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
