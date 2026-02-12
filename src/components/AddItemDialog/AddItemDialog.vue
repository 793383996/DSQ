<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog">
        <div class="dialog-header">
          <h3>添加需求</h3>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div class="dialog-content">
          <div class="search-section">
            <input
              ref="searchInput"
              type="text"
              v-model="searchKeyword"
              placeholder="搜索物品名称..."
              class="search-input"
            />
          </div>

          <div class="items-grid" v-if="filteredItems.length > 0">
            <button
              v-for="item in filteredItems"
              :key="item.name"
              class="item-btn"
              :class="{ selected: selectedItem?.name === item.name }"
              @click="selectItem(item)"
            >
              <span class="item-name">{{ item.name }}</span>
            </button>
          </div>

          <div v-else class="no-results">
            <span>未找到匹配物品</span>
          </div>

          <div v-if="selectedItem" class="quantity-section">
            <label>数量：</label>
            <input
              type="number"
              v-model.number="quantity"
              min="1"
              max="9999"
              class="quantity-input"
            />
            <span class="unit">个</span>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="close">取消</button>
          <button
            class="btn-confirm"
            :disabled="!selectedItem"
            @click="confirm"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { data } from '../../core/legacy/data'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', item: { name: string; num: number }): void
}>()

const visible = ref(props.modelValue)
const searchKeyword = ref('')
const selectedItem = ref<{ name: string } | null>(null)
const quantity = ref(1)
const searchInput = ref<HTMLInputElement | null>(null)

const allItems = computed(() => {
  return data.map((item: any) => {
    const product = item.s?.[0]
    return {
      name: product?.name || '未知物品'
    }
  }).filter((item: any) => item.name !== '未知物品')
})

const filteredItems = computed(() => {
  if (!searchKeyword.value.trim()) {
    return allItems.value.slice(0, 50)
  }
  const keyword = searchKeyword.value.toLowerCase()
  return allItems.value.filter((item: any) =>
    item.name.toLowerCase().includes(keyword)
  )
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    nextTick(() => {
      searchInput.value?.focus()
    })
    searchKeyword.value = ''
    selectedItem.value = null
    quantity.value = 1
  }
})

function selectItem(item: { name: string }) {
  selectedItem.value = item
}

function close() {
  visible.value = false
  emit('update:modelValue', false)
}

function confirm() {
  if (selectedItem.value) {
    emit('confirm', {
      name: selectedItem.value.name,
      num: Math.max(1, quantity.value)
    })
    close()
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  border-radius: 12px 12px 0 0;
}

.dialog-header h3 {
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

.dialog-content {
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.item-btn {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.item-btn:hover {
  border-color: #3498db;
  background: #f0f7ff;
}

.item-btn.selected {
  border-color: #27ae60;
  background: #e8f8f0;
}

.item-name {
  font-size: 13px;
  color: #2d3748;
  word-break: break-all;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.quantity-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.quantity-section label {
  color: #4a5568;
  font-size: 14px;
}

.quantity-input {
  width: 80px;
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.quantity-input:focus {
  outline: none;
  border-color: #3498db;
}

.unit {
  color: #64748b;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
