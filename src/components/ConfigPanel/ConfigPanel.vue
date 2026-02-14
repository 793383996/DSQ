<template>
  <div v-if="visible" class="config-panel-overlay" @click.self="close">
    <div class="config-panel">
      <div class="config-header">
        <h3>参数设置</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="config-content">
        <div class="config-section">
          <h4>设备类型</h4>
          <div class="config-row">
            <label>制作台</label>
            <select v-model="settings.modeIn">
              <option value="制作台Mk.Ⅰ">制作台Mk.Ⅰ</option>
              <option value="制作台Mk.Ⅱ">制作台Mk.Ⅱ</option>
              <option value="制作台Mk.Ⅲ">制作台Mk.Ⅲ</option>
              <option value="重组式制造台">重组式制造台</option>
            </select>
          </div>
          <div class="config-row">
            <label>熔炉</label>
            <select v-model="settings.furnace">
              <option value="电弧熔炉">电弧熔炉</option>
              <option value="位面熔炉">位面熔炉</option>
              <option value="负熵熔炉">负熵熔炉</option>
            </select>
          </div>
          <div class="config-row">
            <label>化工厂</label>
            <select v-model="settings.chemical">
              <option value="化工厂">化工厂</option>
              <option value="量子化工厂">量子化工厂</option>
            </select>
          </div>
          <div class="config-row">
            <label>研究站</label>
            <select v-model="settings.research">
              <option value="矩阵研究站">矩阵研究站</option>
              <option value="自演化研究站">自演化研究站</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h4>增产剂</h4>
          <div class="config-row">
            <label>增产剂类型</label>
            <select v-model="settings.accType">
              <option value="增产剂Mk.Ⅰ">增产剂Mk.Ⅰ</option>
              <option value="增产剂Mk.Ⅱ">增产剂Mk.Ⅱ</option>
              <option value="增产剂Mk.Ⅲ">增产剂Mk.Ⅲ</option>
            </select>
          </div>
          <div class="config-row">
            <label>增产效果</label>
            <select v-model="settings.accValue">
              <option value="无">无</option>
              <option value="加速">加速</option>
              <option value="增产">增产</option>
            </select>
          </div>
          <div class="config-row">
            <label>自喷涂增产剂</label>
            <input type="checkbox" v-model="settings.selfAcc" />
          </div>
        </div>

        <div class="config-section">
          <h4>速度产量</h4>
          <div class="config-row">
            <label>采矿作业速度</label>
            <input type="number" v-model.number="settings.oreSpeed" min="1" max="1000" class="textbox" />
            <span class="unit">%</span>
          </div>
          <div class="config-row">
            <label>大型采矿机</label>
            <input type="number" v-model.number="settings.largeMinerSpeed" min="1" max="1000" class="textbox" />
            <span class="unit">%</span>
          </div>
          <div class="config-row">
            <label>分馏塔产量</label>
            <input type="number" v-model.number="settings.fractionatorSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="config-row">
            <label>原油速度</label>
            <input type="number" v-model.number="settings.oilSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="config-row">
            <label>临界光子产量</label>
            <input type="number" v-model.number="settings.criticalPhotonSpeed" min="1" max="100" class="textbox" />
          </div>
          <div class="config-row">
            <label>轨道采集-重氢</label>
            <input type="number" v-model.number="settings.orbitalDeuterium" step="0.01" min="0" max="10" class="textbox" />
          </div>
          <div class="config-row">
            <label>轨道采集-可燃冰</label>
            <input type="number" v-model.number="settings.orbitalFireIce" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="config-row">
            <label>轨道采集-氢(巨冰)</label>
            <input type="number" v-model.number="settings.orbitalHydrogenIce" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="config-row">
            <label>轨道采集-氢(气态)</label>
            <input type="number" v-model.number="settings.orbitalHydrogenGas" step="0.1" min="0" max="10" class="textbox" />
          </div>
          <div class="config-row">
            <label>小数点保留</label>
            <input type="number" v-model.number="settings.pointLength" min="0" max="10" class="textbox" />
            <span class="unit">位</span>
          </div>
        </div>

        <div class="config-section">
          <h4>物流配置</h4>
          <div class="config-row">
            <label>传送带类型</label>
            <select v-model="settings.beltType">
              <option value="传送带">传送带</option>
              <option value="高速传送带">高速传送带</option>
              <option value="极速传送带">极速传送带</option>
            </select>
          </div>
          <div class="config-row">
            <label>集装物流堆叠</label>
            <input type="number" v-model.number="settings.logisticStack" min="1" max="4" class="textbox" />
            <span class="unit">层</span>
          </div>
        </div>

        <div class="config-section">
          <h4>蓝图配置</h4>
          <div class="config-row">
            <label>只使用三级传送带</label>
            <input type="checkbox" v-model="settings.onlyConveyorBeltMk3" />
          </div>
          <div class="config-row">
            <label>只使用三级分拣器</label>
            <input type="checkbox" v-model="settings.onlySorterMk3" @change="onOnlySorterMk3Change" />
          </div>
          <div class="config-row">
            <label>只使用四级分拣器</label>
            <input type="checkbox" v-model="settings.useSorterMk4" @change="onUseSorterMk4Change" />
          </div>
          <div class="config-row">
            <label>自动插入电力感应塔</label>
            <input type="checkbox" v-model="settings.generateTeslaTower" />
          </div>
          <div class="config-row" v-if="settings.generateTeslaTower">
            <label>电力感应塔间隔</label>
            <input type="number" v-model.number="settings.teslaTowerLineInterval" min="1" max="5" class="textbox" />
            <span class="unit">排</span>
          </div>
          <div class="config-row">
            <label>传送带堆叠层数</label>
            <input type="number" v-model.number="settings.conveyorBeltStackLayer" min="1" max="4" class="textbox" />
          </div>
          <div class="config-row">
            <label>研究站层数</label>
            <input type="number" v-model.number="settings.maxLabLayers" min="1" max="30" class="textbox" />
          </div>
          <div class="config-row">
            <label>建筑堆叠层数</label>
            <input type="number" v-model.number="settings.stackLayers" min="1" max="4" class="textbox" />
          </div>
          <div class="config-row">
            <label>蓝图长宽比</label>
            <input type="number" v-model.number="settings.xyRatio" step="0.1" min="0.1" max="10" class="textbox" />
          </div>
        </div>

        <div class="config-section">
          <h4>显示设置</h4>
          <div class="config-row">
            <label>隐藏原料</label>
            <input type="checkbox" v-model="settings.hideSource" />
          </div>
        </div>

        <div class="config-actions">
          <button class="btn-reset" @click="resetSettings">重置默认</button>
          <button class="btn-save" @click="saveSettings">保存设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { useBlueprintStore, type MachineSettings } from '../../stores/blueprint'
import { legacyUpdateMachineSettings, legacyGetMachineSettings, legacyUpdateConfig, legacyUpdateSpeedSettings, legacyUpdateLogisticsSettings } from '../../core/bridge'
import { logger } from '../../utils/logger'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const store = useBlueprintStore()

const visible = ref(props.modelValue)

interface AllSettings {
  hideSource: boolean
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
  selfAcc: boolean
  oreSpeed: number
  largeMinerSpeed: number
  fractionatorSpeed: number
  oilSpeed: number
  criticalPhotonSpeed: number
  orbitalDeuterium: number
  orbitalFireIce: number
  orbitalHydrogenIce: number
  orbitalHydrogenGas: number
  pointLength: number
  beltType: string
  logisticStack: number
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

const settings = reactive<AllSettings>({
  hideSource: false,
  modeIn: '制作台Mk.Ⅰ',
  furnace: '电弧熔炉',
  chemical: '化工厂',
  accType: '增产剂Mk.Ⅰ',
  accValue: '无',
  research: '矩阵研究站',
  selfAcc: false,
  oreSpeed: 100,
  largeMinerSpeed: 100,
  fractionatorSpeed: 18,
  oilSpeed: 4,
  criticalPhotonSpeed: 5,
  orbitalDeuterium: 0.02,
  orbitalFireIce: 0.5,
  orbitalHydrogenIce: 0.5,
  orbitalHydrogenGas: 1,
  pointLength: 1,
  beltType: '极速传送带',
  logisticStack: 1,
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

const STORAGE_KEY = 'dsq_all_settings'

function loadSettingsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(settings, parsed)
    }
  } catch (e) {
    logger.warn('Failed to load settings from storage', e)
  }
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    logger.warn('Failed to save settings to storage', e)
  }
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadSettingsFromStorage()
    const machineSettings = store.machineSettings
    settings.modeIn = machineSettings.modeIn
    settings.furnace = machineSettings.furnace
    settings.chemical = machineSettings.chemical
    settings.accType = machineSettings.accType
    settings.accValue = machineSettings.accValue
    settings.research = machineSettings.research
  }
})

function onOnlySorterMk3Change() {
  if (settings.onlySorterMk3) {
    settings.useSorterMk4 = false
  }
}

function onUseSorterMk4Change() {
  if (settings.useSorterMk4) {
    settings.onlySorterMk3 = false
  }
}

function close() {
  visible.value = false
  emit('update:modelValue', false)
}

function saveSettings() {
  store.setMachineSetting('modeIn', settings.modeIn)
  store.setMachineSetting('furnace', settings.furnace)
  store.setMachineSetting('chemical', settings.chemical)
  store.setMachineSetting('accType', settings.accType)
  store.setMachineSetting('accValue', settings.accValue)
  store.setMachineSetting('research', settings.research)

  legacyUpdateMachineSettings({
    modeIn: settings.modeIn,
    furnace: settings.furnace,
    chemical: settings.chemical,
    accType: settings.accType,
    accValue: settings.accValue,
    research: settings.research,
    hideSource: settings.hideSource
  })

  legacyUpdateConfig({
    conveyorBeltStackLayer: settings.conveyorBeltStackLayer,
    onlyConveyorBeltMk3: settings.onlyConveyorBeltMk3,
    onlySorterMk3: settings.onlySorterMk3,
    useSorterMk4: settings.useSorterMk4,
    selfSpray: settings.selfAcc,
    generateTeslaTower: settings.generateTeslaTower,
    teslaTowerLineInterval: settings.teslaTowerLineInterval,
    stackLayers: settings.stackLayers,
    maxLabLayers: settings.maxLabLayers,
    x_y_ratio: settings.xyRatio
  })

  legacyUpdateSpeedSettings({
    oreSpeed: settings.oreSpeed,
    fractionatorSpeed: settings.fractionatorSpeed,
    largeMinerSpeed: settings.largeMinerSpeed,
    oilSpeed: settings.oilSpeed,
    orbitalDeuterium: settings.orbitalDeuterium,
    orbitalFireIce: settings.orbitalFireIce,
    orbitalHydrogenIce: settings.orbitalHydrogenIce,
    orbitalHydrogenGas: settings.orbitalHydrogenGas,
    criticalPhotonSpeed: settings.criticalPhotonSpeed,
    pointLength: settings.pointLength
  })

  legacyUpdateLogisticsSettings({
    beltType: settings.beltType,
    logisticStack: settings.logisticStack
  })

  saveSettingsToStorage()
  close()
}

function resetSettings() {
  const defaultMachineSettings: MachineSettings = {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: '增产剂Mk.Ⅰ',
    accValue: '无',
    research: '矩阵研究站'
  }
  store.loadMachineSettings(defaultMachineSettings)

  settings.hideSource = false
  settings.modeIn = '制作台Mk.Ⅰ'
  settings.furnace = '电弧熔炉'
  settings.chemical = '化工厂'
  settings.accType = '增产剂Mk.Ⅰ'
  settings.accValue = '无'
  settings.research = '矩阵研究站'
  settings.selfAcc = false
  settings.oreSpeed = 100
  settings.largeMinerSpeed = 100
  settings.fractionatorSpeed = 18
  settings.oilSpeed = 4
  settings.criticalPhotonSpeed = 5
  settings.orbitalDeuterium = 0.02
  settings.orbitalFireIce = 0.5
  settings.orbitalHydrogenIce = 0.5
  settings.orbitalHydrogenGas = 1
  settings.pointLength = 1
  settings.beltType = '极速传送带'
  settings.logisticStack = 1
  settings.onlyConveyorBeltMk3 = true
  settings.onlySorterMk3 = true
  settings.useSorterMk4 = false
  settings.generateTeslaTower = true
  settings.teslaTowerLineInterval = 1
  settings.conveyorBeltStackLayer = 4
  settings.maxLabLayers = 15
  settings.stackLayers = 1
  settings.xyRatio = 2

  legacyUpdateMachineSettings({
    ...defaultMachineSettings,
    hideSource: false
  })

  legacyUpdateConfig({
    conveyorBeltStackLayer: 4,
    onlyConveyorBeltMk3: true,
    onlySorterMk3: true,
    useSorterMk4: false,
    selfSpray: false,
    generateTeslaTower: true,
    teslaTowerLineInterval: 1,
    stackLayers: 1,
    maxLabLayers: 15,
    x_y_ratio: 2
  })

  legacyUpdateSpeedSettings({
    oreSpeed: 100,
    fractionatorSpeed: 18,
    largeMinerSpeed: 100,
    oilSpeed: 4,
    orbitalDeuterium: 0.02,
    orbitalFireIce: 0.5,
    orbitalHydrogenIce: 0.5,
    orbitalHydrogenGas: 1,
    criticalPhotonSpeed: 5,
    pointLength: 1
  })

  legacyUpdateLogisticsSettings({
    beltType: '极速传送带',
    logisticStack: 1
  })

  saveSettingsToStorage()
}
</script>

<style scoped>
.config-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.config-panel {
  background: white;
  border-radius: 8px;
  width: 95%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  border-radius: 8px 8px 0 0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.config-header h3 {
  margin: 0;
  font-size: 15px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.config-content {
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.config-section {
  width: 240px;
  flex-shrink: 0;
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #eee;
}

.config-section h4 {
  margin: 0 0 4px 0;
  color: #2980b9;
  font-size: 12px;
  font-weight: 600;
  padding-bottom: 3px;
  border-bottom: 1px solid #e2e8f0;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
  min-height: 20px;
}

.config-row:last-child {
  margin-bottom: 0;
}

.config-row label {
  width: 100px;
  flex-shrink: 0;
  color: #4a5568;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-row select {
  flex: 1;
  min-width: 0;
  padding: 3px 4px;
  border: 1px solid #d0d7de;
  border-radius: 3px;
  font-size: 11px;
  background: white;
  cursor: pointer;
  height: 26px;
  line-height: 1.3;
}

.config-row select:focus {
  outline: none;
  border-color: #3498db;
}

.config-row input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.config-row .textbox {
  width: 50px;
  padding: 2px 4px;
  border: 1px solid #d0d7de;
  border-radius: 3px;
  font-size: 11px;
  flex-shrink: 0;
  height: 22px;
}

.config-row .textbox:focus {
  outline: none;
  border-color: #3498db;
}

.config-row input[type="number"]::-webkit-inner-spin-button,
.config-row input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.config-row input[type="number"] {
  -moz-appearance: textfield;
}

.config-row .unit {
  color: #999;
  font-size: 10px;
  flex-shrink: 0;
  white-space: nowrap;
}

.config-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  position: sticky;
  bottom: 0;
  background: white;
  width: 100%;
  margin-top: 8px;
  padding: 8px 0 0 0;
}

.btn-save,
.btn-reset {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-reset {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn-reset:hover {
  background: #eee;
}
</style>
