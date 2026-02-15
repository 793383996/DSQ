<template>
  <div class="result-table-container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>{{ $t('resultTable.calculating') }}</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">!</span>
      <span>{{ error }}</span>
      <button class="retry-btn" @click="$emit('retry')">
        {{ $t('common.retry') }}
      </button>
    </div>

    <div v-else-if="items.length > 0 && !isIconsReady" class="icons-loading-state">
      <div class="spinner-small" />
      <span>{{ $t('resultTable.iconsLoading') }}</span>
    </div>

    <table v-else-if="items.length > 0" class="result-table">
      <thead>
        <tr>
          <th class="col-icon">
            {{ $t('resultTable.icon') }}
          </th>
          <th class="col-name">
            {{ $t('resultTable.name') }}
          </th>
          <th class="col-rate">
            {{ $t('resultTable.rate') }}
          </th>
          <th class="col-count">
            {{ $t('resultTable.count') }}
          </th>
          <th class="col-building">
            {{ $t('resultTable.building') }}
          </th>
          <th class="col-actions">
            {{ $t('resultTable.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item, index)"
          v-memo="[item.name, item.rate, item.count, isExcluded(item.name)]"
          :class="{ 'is-excluded': isExcluded(item.name) }"
        >
          <td class="col-icon">
            <img
              v-if="getItemIcon(item.name)"
              :src="getItemIcon(item.name)"
              :alt="item.name"
              class="item-icon"
            />
            <span v-else class="icon-placeholder">{{ getItemInitial(item.name) }}</span>
          </td>
          <td class="col-name">
            <span class="item-name" :title="item.name">{{ item.name }}</span>
          </td>
          <td class="col-rate">
            <span class="item-rate">{{ formatNumber(item.rate) }}</span>
          </td>
          <td class="col-count">
            <span class="item-count">{{ formatNumber(item.count) }}</span>
          </td>
          <td class="col-building">
            <span class="item-building">{{ item.building || '-' }}</span>
          </td>
          <td class="col-actions">
            <button
              class="action-btn add-btn"
              :title="$t('resultTable.addDemand')"
              @click="addToDemand(item)"
            >
              +
            </button>
            <button
              v-if="!isExcluded(item.name)"
              class="action-btn exclude-btn"
              :title="$t('resultTable.exclude')"
              @click="excludeItem(item)"
            >
              -
            </button>
            <button
              v-else
              class="action-btn include-btn"
              :title="$t('resultTable.restore')"
              @click="includeItem(item)"
            >
              +
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty-state">
      <span class="empty-icon">📦</span>
      <span>{{ $t('common.noData') }}</span>
      <span class="empty-hint">{{ $t('resultTable.noResultsHint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlueprintStore } from '../../stores/blueprint'
import { useIconProvider } from '../../composables/useIconProvider'
import { formatNumber } from '../../utils/format'

interface TableItem {
  name: string
  rate?: number
  count?: number
  building?: string
  icon?: string
}

interface Props {
  items: TableItem[]
  isLoading?: boolean
  error?: string | null
  hideSource?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  isLoading: false,
  error: null,
  hideSource: false
})

const emit = defineEmits<{
  (e: 'add-demand', item: TableItem): void
  (e: 'toggle-exclude', item: TableItem): void
  (e: 'retry'): void
}>()

const store = useBlueprintStore()
const { getIcon } = useIconProvider()

const isIconsReady = computed(() => store.isIconsLoaded)

const visibleItems = computed(() => {
  if (!props.hideSource) return props.items

  return props.items.filter(item => {
    const isSource = props.items.some(
      other =>
        other.name !== item.name &&
        (other as unknown as Record<string, unknown>).name !== item.name &&
        getDemandNames().includes(item.name)
    )
    return !isSource
  })
})

function getDemandNames(): string[] {
  return store.demandList.map(d => d.name)
}

function getItemKey(item: TableItem, index: number): string {
  return `${item.name}-${index}`
}

function isExcluded(name: string): boolean {
  return store.excludeList.includes(name)
}

function getItemIcon(name: string): string | undefined {
  if (!isIconsReady.value) return undefined
  const icon = getIcon(name)
  return icon || undefined
}

function getItemInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function addToDemand(item: TableItem) {
  emit('add-demand', item)
}

function excludeItem(item: TableItem) {
  store.addExclude(item.name)
  emit('toggle-exclude', item)
}

function includeItem(item: TableItem) {
  store.removeExclude(item.name)
  emit('toggle-exclude', item)
}
</script>

<style scoped>
.result-table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.result-table {
  width: 100%;
  border-collapse: collapse;
}

.result-table th {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  color: #4a5568;
  font-weight: 600;
  font-size: 13px;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
}

.result-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #2d3748;
}

.result-table tbody tr:hover {
  background: #f8fafc;
}

.result-table tbody tr.is-excluded {
  opacity: 0.5;
  background: #fef2f2;
}

.col-icon {
  width: 50px;
  text-align: center;
}

.col-actions {
  width: 100px;
  text-align: center;
}

.item-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
}

.icon-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #e2e8f0;
  border-radius: 6px;
  font-weight: 600;
  color: #64748b;
  font-size: 14px;
}

.item-name {
  font-weight: 500;
  color: #1e293b;
}

.item-rate,
.item-count,
.item-building {
  color: #64748b;
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  margin: 0 2px;
  transition: all 0.2s ease;
}

.add-btn {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.add-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
}

.exclude-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.exclude-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
}

.include-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.include-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.loading-state,
.error-state,
.empty-state,
.icons-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
  gap: 12px;
}

.icons-loading-state {
  padding: 30px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  width: 40px;
  height: 40px;
  background: #fee2e2;
  color: #e74c3c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.retry-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-hint {
  font-size: 12px;
  color: #94a3b8;
}
</style>
