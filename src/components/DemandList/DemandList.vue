<!--
 * DemandList - 需求列表组件
 *
 * 功能：
 * - 显示已添加的需求物品列表
 * - 支持物品数量编辑（点击数量进入编辑模式）
 * - 支持删除单个物品（右键图标或点击删除按钮）
 * - 支持重置所有需求
 *
 * 主要方法：
 * - getItemIcon(name): 获取物品图标
 * - startEdit(index): 开始编辑数量
 * - submitEdit(): 提交编辑
 * - removeItem(index): 删除物品
 * - resetAll(): 重置所有需求
 *
 * 上游调用：
 * - App.vue: 显示需求列表
 *
 * 下游依赖：
 * - stores/blueprint.ts: demandList状态管理
 * - composables/useIconProvider.ts: 获取物品图标
 *
 * 事件：
 * - @demand-changed: 需求变化时触发
 -->
<template>
  <div v-if="store.demandList.length > 0" class="demand-list">
    <div class="demand-header">
      <span class="demand-title">{{ $t('demandList.title') }}</span>
      <div class="action-buttons">
        <button class="btn-reset" @click="resetAll">
          {{ $t('controlPanel.reset') }}
        </button>
        <button class="btn-save" @click="handleSave">
          {{ $t('controlPanel.saveProject') }}
        </button>
        <button class="btn-blueprint" @click="handleGenerateBlueprint">
          {{ $t('controlPanel.generateBlueprint') }}
        </button>
      </div>
    </div>
    <div class="demand-items">
      <div v-for="(item, index) in store.demandList" :key="item.name" class="demand-item">
        <img
          v-if="getItemIcon(item.name)"
          :src="getItemIcon(item.name)"
          :alt="item.name"
          class="item-icon"
          @contextmenu.prevent="removeItem(index)"
        />
        <span v-else class="icon-placeholder">{{ getItemInitial(item.name) }}</span>
        <span class="item-name" :title="item.name">{{ item.name }}</span>
        <span class="item-quantity" @click="startEdit(index)">
          <template v-if="editingIndex === index">
            <input
              :ref="el => setInputRef(el, index)"
              v-model.number="editingValue"
              type="number"
              min="0.01"
              step="0.01"
              class="quantity-input"
              @blur="submitEdit"
              @keydown="handleKeydown"
            />
          </template>
          <template v-else>
            {{ formatNumber(item.num) }}
          </template>
        </span>
        <button class="remove-btn" @click="removeItem(index)">×</button>
      </div>
    </div>
    <div class="demand-hint">
      <small>{{ $t('demandList.hint') }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlueprintStore } from '../../stores/blueprint'
import { useIconProvider } from '../../composables/useIconProvider'

const store = useBlueprintStore()
const { getIcon } = useIconProvider()
const { t } = useI18n()

const editingIndex = ref<number | null>(null)
const editingValue = ref<number>(1)
const inputRefs = new Map<number, HTMLInputElement>()

function setInputRef(el: unknown, index: number) {
  if (el instanceof HTMLInputElement) {
    inputRefs.set(index, el)
  }
}

function getItemIcon(name: string): string | undefined {
  return getIcon(name) ?? undefined
}

function getItemInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function formatNumber(num: number): string {
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

function startEdit(index: number) {
  editingIndex.value = index
  editingValue.value = store.demandList[index].num
  nextTick(() => {
    const input = inputRefs.get(index)
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const emit = defineEmits<{
  (e: 'demand-changed'): void
}>()

function submitEdit() {
  if (editingIndex.value !== null && editingValue.value > 0) {
    store.updateDemand(store.demandList[editingIndex.value].name, editingValue.value)
    emit('demand-changed')
  }
  editingIndex.value = null
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    submitEdit()
  } else if (e.key === 'Escape') {
    editingIndex.value = null
  }
}

function removeItem(index: number) {
  const item = store.demandList[index]
  if (item) {
    store.removeDemand(item.name)
    emit('demand-changed')
  }
}

function resetAll() {
  store.clearAll()
  emit('demand-changed')
}

function handleSave() {
  const win = window as any
  if (win.f_save) {
    win.f_save()
  } else {
    const name = prompt(t('controlPanel.inputProjectName'))
    if (!name) return

    const win2 = window as any
    if (win2.projects) {
      let index = -1
      for (let i = 0; i < win2.projects.length; i++) {
        if (win2.projects[i].name === name) {
          if (!confirm(t('controlPanel.projectExists'))) {
            return
          }
          index = i
          break
        }
      }

      const product_settings: Record<string, any> = {}
      for (const item of store.resultItems) {
        const recipe = win2.find ? win2.find(item.name) : null
        if (recipe) {
          const setting: Record<string, any> = {}
          if (item.accType && item.accType.length > 0) {
            for (const acc of item.accType) {
              if (acc.class === 'm selected') {
                setting.accType = acc.name
              }
            }
          }
          if (item.accValue && item.accValue.length > 0) {
            for (const acc of item.accValue) {
              if (acc.class === 'm selected') {
                setting.accValue = acc.name
              }
            }
          }
          if (item.m && item.m.length > 0) {
            for (const m of item.m) {
              if (m.class === 'm selected') {
                setting.m = m.name
              }
            }
          }
          product_settings[recipe.id] = setting
        }
      }

      const project = {
        name: name,
        singleMake: win2.singleMake || [],
        ig_names: store.excludeList || [],
        value: win2.xqs || [],
        settings: product_settings
      }

      if (index >= 0) {
        win2.projects[index] = project
      } else {
        win2.projects.push(project)
      }

      if (win2.saveSettingProjects) {
        win2.saveSettingProjects()
      }

      alert(t('controlPanel.projectSaved'))
    }
  }
}

function handleGenerateBlueprint() {
  const win = window as any
  if (win.generateBlueprint) {
    win.generateBlueprint()
  } else {
    alert(t('controlPanel.blueprintNotSupported'))
  }
}
</script>

<style scoped>
.demand-list {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.demand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.demand-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 12px;
}

.btn-reset {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.btn-reset:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-save {
  background: linear-gradient(135deg, #10b981, #059669);
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-blueprint {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.btn-blueprint:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.demand-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demand-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #f0f7ff, #e8f4fc);
  border: 1px solid #d1e7ff;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.demand-item:hover {
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
}

.item-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  cursor: pointer;
}

.icon-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #e2e8f0;
  border-radius: 4px;
  font-weight: 600;
  color: #64748b;
  font-size: 12px;
}

.item-name {
  font-size: 13px;
  color: #1e293b;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-quantity {
  font-size: 13px;
  font-weight: 600;
  color: #2980b9;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.item-quantity:hover {
  background: rgba(52, 152, 219, 0.1);
}

.quantity-input {
  width: 60px;
  padding: 2px 4px;
  border: 1px solid #3498db;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.quantity-input:focus {
  outline: none;
  border-color: #2980b9;
}

.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.quantity-input[type='number'] {
  -moz-appearance: textfield;
}

.remove-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  min-width: 28px;
  min-height: 28px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.demand-hint {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
