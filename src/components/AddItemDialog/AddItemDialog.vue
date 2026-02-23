<!--
 * AddItemDialog - 添加物品对话框组件
 *
 * 功能：
 * - 提供物品搜索和分类筛选功能（组件/建筑两个分类）
 * - 支持物品图标加载和显示
 * - 支持数量输入和确认添加
 *
 * 主要方法：
 * - loadItems(): 加载可选物品列表
 * - selectItem(item): 选择物品
 * - confirm(): 确认添加物品到需求列表
 * - close(): 关闭对话框
 *
 * 上游调用：
 * - App.vue: 通过v-model控制对话框显示
 *
 * 下游依赖：
 * - core/bridge.ts: getSelectableItemsWithIcons() 获取物品列表
 * - stores/blueprint.ts: 通过emit将选中物品传递给父组件
 *
 * 事件：
 * - @update:modelValue: 更新对话框显示状态
 * - @confirm: 确认添加物品 { name: string, num: number }
 -->
<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ $t('addItemDialog.title') }}</h3>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div class="dialog-content">
          <div class="search-section">
            <input
              ref="searchInput"
              v-model="searchKeyword"
              type="text"
              :placeholder="$t('addItemDialog.searchPlaceholder')"
              class="search-input"
            />
          </div>

          <div v-if="!isLoading" class="tab-section">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'icons1' }"
              @click="activeTab = 'icons1'"
            >
              {{ $t('addItemDialog.components') }}
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'icons2' }"
              @click="activeTab = 'icons2'"
            >
              {{ $t('addItemDialog.buildings') }}
            </button>
          </div>

          <div v-if="isLoading" class="items-grid">
            <div class="loading-hint">
              {{ $t('addItemDialog.loading') }}
            </div>
          </div>
          <div v-else-if="loadError" class="error-state">
            <span class="error-text">{{ loadError }}</span>
            <button class="retry-btn" @click="loadItems">
              {{ $t('common.retry') }}
            </button>
          </div>
          <div v-else-if="filteredItems.length > 0" class="items-grid">
            <button
              v-for="item in filteredItems"
              :key="item.name"
              class="item-btn"
              :class="{ selected: selectedItem?.name === item.name }"
              :title="item.name"
              @click="selectItem(item)"
            >
              <img
                v-if="item.icon"
                :src="'data:image/png;base64,' + item.icon"
                :alt="item.name"
                class="item-icon"
              />
              <span class="item-name">{{ item.name }}</span>
            </button>
          </div>

          <div v-else class="no-results">
            <span>{{ $t('addItemDialog.noMatch') }}</span>
          </div>

          <div v-if="selectedItem" class="quantity-section">
            <label>{{ $t('addItemDialog.quantity') }}：</label>
            <input
              v-model.number="quantity"
              type="number"
              min="1"
              max="9999"
              class="quantity-input"
            />
            <span class="unit">{{ $t('addItemDialog.unit') }}</span>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="close">
            {{ $t('common.cancel') }}
          </button>
          <button class="btn-confirm" :disabled="!selectedItem" @click="confirm">
            {{ $t('common.add') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { iconService } from '../../core/services/IconService'
import { logger } from '../../utils/logger'

interface ItemData {
  name: string
  icon: string
}

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
const debouncedKeyword = ref('')
const selectedItem = ref<ItemData | null>(null)
const quantity = ref(1)
const searchInput = ref<HTMLInputElement | null>(null)
const icons1Items = ref<ItemData[]>([])
const icons2Items = ref<ItemData[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const activeTab = ref<'icons1' | 'icons2'>('icons1')

async function loadItems() {
  isLoading.value = true
  loadError.value = null

  try {
    if (!iconService.isLoaded()) {
      await iconService.loadIconData()
    }

    const data = iconService.getSelectableItemsWithIcons()

    if (!data.icons1.length && !data.icons2.length) {
      loadError.value = '未找到可用物品数据'
      logger.warn('[AddItemDialog] No items found')
      return
    }

    icons1Items.value = data.icons1
    icons2Items.value = data.icons2
  } catch (e) {
    loadError.value = '数据加载失败，请重试'
    logger.error('[AddItemDialog] Failed to load items:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadItems()
})

const currentTabItems = computed(() => {
  return activeTab.value === 'icons1' ? icons1Items.value : icons2Items.value
})

const filteredItems = computed(() => {
  const items = currentTabItems.value
  if (!debouncedKeyword.value.trim()) {
    return items
  }
  const keyword = debouncedKeyword.value.toLowerCase()
  return items.filter(item => item.name.toLowerCase().includes(keyword))
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchKeyword, val => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, 150)
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      nextTick(() => {
        searchInput.value?.focus()
      })
      searchKeyword.value = ''
      debouncedKeyword.value = ''
      selectedItem.value = null
      quantity.value = 1
    }
  }
)

function selectItem(item: ItemData) {
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
  width: 95%;
  max-width: 800px;
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

.tab-section {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  padding: 8px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: #3498db;
}

.tab-btn.active {
  border-color: #3498db;
  background: #e8f4fc;
  color: #2980b9;
  font-weight: 500;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.item-btn {
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 6px;
  min-height: 90px;
}

.item-btn:hover {
  border-color: #3498db;
  background: #f0f7ff;
}

.item-btn.selected {
  border-color: #27ae60;
  background: #e8f8f0;
}

.item-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
  flex-shrink: 0;
}

.item-name {
  font-size: 11px;
  color: #2d3748;
  word-break: break-all;
  line-height: 1.2;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #e74c3c;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-text {
  font-size: 14px;
}

.retry-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.loading-hint {
  text-align: center;
  padding: 20px;
  color: #64748b;
  font-size: 14px;
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
