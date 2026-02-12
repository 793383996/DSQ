<template>
  <div v-if="visible" class="settings-overlay" @click.self="close">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>高级设置</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h4>速度、产量设置</h4>
          <div class="setting-row">
            <label>采矿作业速度：</label>
            <input type="number" v-model.number="settings.oreSpeed" min="1" max="1000" class="textbox" />
            <span class="unit">%</span>
          </div>
          <div class="setting-row">
            <label>分馏塔每分钟产量：</label>
            <input type="number" v-model.number="settings.fractionatorSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="setting-row">
            <label>大型采矿机：</label>
            <input type="number" v-model.number="settings.largeMinerSpeed" min="1" max="1000" class="textbox" />
          </div>
          <div class="setting-row">
            <label>原油速度：</label>
            <input type="number" v-model.number="settings.oilSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="setting-row">
            <label>轨道采集-重氢：</label>
            <input type="number" v-model.number="settings.orbitalDeuterium" step="0.01" min="0" max="10" class="textbox" />
          </div>
          <div class="setting-row">
            <label>轨道采集-可燃冰：</label>
            <input type="number" v-model.number="settings.orbitalFireIce" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="setting-row">
            <label>轨道采集-氢(巨冰)：</label>
            <input type="number" v-model.number="settings.orbitalHydrogenIce" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="setting-row">
            <label>轨道采集-氢(气态)：</label>
            <input type="number" v-model.number="settings.orbitalHydrogenGas" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="setting-row">
            <label>临界光子每分钟产量：</label>
            <input type="number" v-model.number="settings.criticalPhotonSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="setting-row">
            <label>小数点后保留：</label>
            <input type="number" v-model.number="settings.pointLength" min="0" max="10" class="textbox" />
            <span class="unit">位</span>
          </div>
        </div>

        <div class="settings-section">
          <h4>物流配置</h4>
          <div class="setting-row">
            <label>运输站集装物流：</label>
            <input type="number" v-model.number="settings.logisticStack" min="1" max="4" class="textbox" />
            <span class="unit">传送带堆叠层数</span>
          </div>
          <div class="setting-row">
            <label>计算传送带支持设备：</label>
            <select v-model="settings.beltType" class="textbox-select">
              <option value="传送带">传送带</option>
              <option value="高速传送带">高速传送带</option>
              <option value="极速传送带">极速传送带</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h4>蓝图配置</h4>
          <div class="setting-row">
            <label>只使用三级传送带</label>
            <input type="checkbox" v-model="settings.onlyConveyorBeltMk3" />
          </div>
          <div class="setting-row">
            <label>只使用三级分拣器</label>
            <input type="checkbox" v-model="settings.onlySorterMk3" />
          </div>
          <div class="setting-row">
            <label>只使用四级分拣器</label>
            <input type="checkbox" v-model="settings.useSorterMk4" />
          </div>
          <div class="setting-row">
            <label>自动插入电力感应塔</label>
            <input type="checkbox" v-model="settings.generateTeslaTower" />
          </div>
          <div class="setting-row" v-if="settings.generateTeslaTower">
            <label>电力感应塔间隔排数</label>
            <input type="number" v-model.number="settings.teslaTowerLineInterval" min="1" max="5" class="textbox-small" />
            <span class="unit">建议取值1或2</span>
          </div>
          <div class="setting-row">
            <label>传送带物品堆叠层数</label>
            <input type="number" v-model.number="settings.conveyorBeltStackLayer" min="1" max="4" class="textbox-small" />
          </div>
          <div class="setting-row">
            <label>研究站层数</label>
            <input type="number" v-model.number="settings.maxLabLayers" min="1" max="30" class="textbox-small" />
          </div>
          <div class="setting-row">
            <label>建筑堆叠层数</label>
            <input type="number" v-model.number="settings.stackLayers" min="1" max="4" class="textbox-small" />
            <span class="unit">1=不堆叠，2-4层垂直堆叠</span>
          </div>
          <div class="setting-row">
            <label>蓝图长宽比</label>
            <input type="number" v-model.number="settings.xyRatio" step="0.1" min="0.1" max="10" class="textbox-small" />
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn-reset" @click="resetSettings">重置默认</button>
        <button class="btn-save" @click="saveSettings">保存设置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useBlueprintStore } from '../../stores/blueprint'
import { legacyUpdateConfig } from '../../core/bridge'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const store = useBlueprintStore()

const visible = ref(props.modelValue)

interface AdvancedSettings {
  oreSpeed: number
  fractionatorSpeed: number
  largeMinerSpeed: number
  oilSpeed: number
  orbitalDeuterium: number
  orbitalFireIce: number
  orbitalHydrogenIce: number
  orbitalHydrogenGas: number
  criticalPhotonSpeed: number
  pointLength: number
  logisticStack: number
  beltType: string
  onlyConveyorBeltMk3: boolean
  onlySorterMk3: boolean
  useSorterMk4: boolean
  generateTeslaTower: boolean
  teslaTowerLineInterval: number
  conveyorBeltStackLayer: number
  maxLabLayers: number
  stackLayers: number
  xyRatio: number
}

const settings = reactive<AdvancedSettings>({
  oreSpeed: 100,
  fractionatorSpeed: 18,
  largeMinerSpeed: 100,
  oilSpeed: 4,
  orbitalDeuterium: 0.02,
  orbitalFireIce: 0.5,
  orbitalHydrogenIce: 0.5,
  orbitalHydrogenGas: 1,
  criticalPhotonSpeed: 5,
  pointLength: 1,
  logisticStack: 1,
  beltType: '极速传送带',
  onlyConveyorBeltMk3: true,
  onlySorterMk3: true,
  useSorterMk4: false,
  generateTeslaTower: true,
  teslaTowerLineInterval: 1,
  conveyorBeltStackLayer: 4,
  maxLabLayers: 15,
  stackLayers: 1,
  xyRatio: 2
})

watch(() => props.modelValue, (val) => {
  visible.value = val
})

function close() {
  visible.value = false
  emit('update:modelValue', false)
}

function saveSettings() {
  legacyUpdateConfig({
    conveyorBeltStackLayer: settings.conveyorBeltStackLayer,
    onlyConveyorBeltMk3: settings.onlyConveyorBeltMk3,
    onlySorterMk3: settings.onlySorterMk3,
    useSorterMk4: settings.useSorterMk4,
    generateTeslaTower: settings.generateTeslaTower,
    teslaTowerLineInterval: settings.teslaTowerLineInterval,
    stackLayers: settings.stackLayers
  })

  if (window.pointLength) {
    window.pointLength.value = String(settings.pointLength)
  }

  close()
}

function resetSettings() {
  settings.oreSpeed = 100
  settings.fractionatorSpeed = 18
  settings.largeMinerSpeed = 100
  settings.oilSpeed = 4
  settings.orbitalDeuterium = 0.02
  settings.orbitalFireIce = 0.5
  settings.orbitalHydrogenIce = 0.5
  settings.orbitalHydrogenGas = 1
  settings.criticalPhotonSpeed = 5
  settings.pointLength = 1
  settings.logisticStack = 1
  settings.beltType = '极速传送带'
  settings.onlyConveyorBeltMk3 = true
  settings.onlySorterMk3 = true
  settings.useSorterMk4 = false
  settings.generateTeslaTower = true
  settings.teslaTowerLineInterval = 1
  settings.conveyorBeltStackLayer = 4
  settings.maxLabLayers = 15
  settings.stackLayers = 1
  settings.xyRatio = 2
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

.settings-panel {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  border-radius: 12px 12px 0 0;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.settings-content {
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.settings-section {
  flex: 1;
  min-width: 280px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  color: #3498db;
  font-size: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.setting-row label {
  flex: 0 0 160px;
  color: #4a5568;
  font-size: 13px;
}

.setting-row input[type="number"],
.setting-row input[type="text"],
.textbox {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.textbox-small {
  width: 60px !important;
}

.textbox-select {
  width: 120px !important;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
}

.setting-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.unit {
  color: #94a3b8;
  font-size: 12px;
}

.settings-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}

.btn-save,
.btn-reset {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-save {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
}

.btn-reset {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-reset:hover {
  background: #e2e8f0;
}
</style>
