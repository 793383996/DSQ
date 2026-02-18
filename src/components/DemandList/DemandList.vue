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
      <button class="reset-btn" @click="resetAll">
        {{ $t('common.reset') }}
      </button>
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
              ref="editInput"
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
import { useBlueprintStore } from '../../stores/blueprint'
import { useIconProvider } from '../../composables/useIconProvider'

const store = useBlueprintStore()
const { getIcon } = useIconProvider()

const editingIndex = ref<number | null>(null)
const editingValue = ref<number>(1)
const editInput = ref<HTMLInputElement | null>(null)

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
    editInput.value?.focus()
    editInput.value?.select()
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

.reset-btn {
  padding: 4px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #e2e8f0;
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

.remove-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s ease;
}

.remove-btn:hover {
  color: #e74c3c;
}

.demand-hint {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
