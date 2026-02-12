<template>
  <div v-if="visible" class="config-panel-overlay" @click.self="close">
    <div class="config-panel">
      <div class="config-header">
        <h3>参数设置</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="config-content">
        <div class="config-section">
          <h4>显示设置</h4>
          <div class="config-row">
            <input type="checkbox" id="hideSource" v-model="settings.hideSource" />
            <label for="hideSource">隐藏原料</label>
          </div>
        </div>

        <div class="config-section">
          <h4>制作设备</h4>
          <div class="config-row">
            <label for="selmodein">制作台类型</label>
            <select id="selmodein" v-model="settings.modeIn">
              <option value="制作台Mk.Ⅰ">制作台Mk.Ⅰ</option>
              <option value="制作台Mk.Ⅱ">制作台Mk.Ⅱ</option>
              <option value="制作台Mk.Ⅲ">制作台Mk.Ⅲ</option>
              <option value="重组式制造台">重组式制造台</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h4>冶炼设备</h4>
          <div class="config-row">
            <label for="furnace">熔炉类型</label>
            <select id="furnace" v-model="settings.furnace">
              <option value="电弧熔炉">电弧熔炉</option>
              <option value="位面熔炉">位面熔炉</option>
              <option value="负熵熔炉">负熵熔炉</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h4>化工设备</h4>
          <div class="config-row">
            <label for="chemical">化工厂类型</label>
            <select id="chemical" v-model="settings.chemical">
              <option value="化工厂">化工厂</option>
              <option value="量子化工厂">量子化工厂</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h4>增产剂设置</h4>
          <div class="config-row">
            <label for="accType">增产剂类型</label>
            <select id="accType" v-model="settings.accType">
              <option value="增产剂Mk.Ⅰ">增产剂Mk.Ⅰ</option>
              <option value="增产剂Mk.Ⅱ">增产剂Mk.Ⅱ</option>
              <option value="增产剂Mk.Ⅲ">增产剂Mk.Ⅲ</option>
            </select>
          </div>
          <div class="config-row">
            <label for="accValue">增产效果</label>
            <select id="accValue" v-model="settings.accValue">
              <option value="无">无</option>
              <option value="加速">加速</option>
              <option value="增产">增产</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h4>研究站</h4>
          <div class="config-row">
            <label for="research">研究站类型</label>
            <select id="research" v-model="settings.research">
              <option value="矩阵研究站">矩阵研究站</option>
              <option value="自演化研究站">自演化研究站</option>
            </select>
          </div>
        </div>

        <div class="config-actions">
          <button class="btn-save" @click="saveSettings">保存设置</button>
          <button class="btn-reset" @click="resetSettings">重置默认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { useBlueprintStore, type MachineSettings } from '../../stores/blueprint'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const store = useBlueprintStore()

const visible = ref(props.modelValue)
const settings = reactive({
  hideSource: false,
  modeIn: '制作台Mk.Ⅰ',
  furnace: '电弧熔炉',
  chemical: '化工厂',
  accType: '增产剂Mk.Ⅰ',
  accValue: '无',
  research: '矩阵研究站'
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadSettingsFromStore()
  }
})

function loadSettingsFromStore() {
  const machineSettings = store.machineSettings
  settings.modeIn = machineSettings.modeIn
  settings.furnace = machineSettings.furnace
  settings.chemical = machineSettings.chemical
  settings.accType = machineSettings.accType
  settings.accValue = machineSettings.accValue
  settings.research = machineSettings.research
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
  close()
}

function resetSettings() {
  const defaultSettings: MachineSettings = {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: '增产剂Mk.Ⅰ',
    accValue: '无',
    research: '矩阵研究站'
  }
  store.loadMachineSettings(defaultSettings)
  loadSettingsFromStore()
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
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  border-radius: 12px 12px 0 0;
}

.config-header h3 {
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

.config-content {
  padding: 20px;
}

.config-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.config-section:last-of-type {
  border-bottom: none;
  margin-bottom: 16px;
}

.config-section h4 {
  margin: 0 0 12px 0;
  color: #2d3748;
  font-size: 14px;
  font-weight: 600;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.config-row label {
  flex: 0 0 100px;
  color: #4a5568;
  font-size: 14px;
}

.config-row select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.config-row select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.config-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.config-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.btn-save,
.btn-reset {
  flex: 1;
  padding: 10px 16px;
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
