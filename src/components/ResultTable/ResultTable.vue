<!--
 * ResultTable - 结果表格组件
 *
 * 功能：
 * - 显示计算结果列表
 * - 支持排除/恢复物品
 * - 支持配方选择
 * - 支持增产剂等级/效果选择
 * - 支持设备选择
 * - 支持标注功能
 *
 * 老代码对应：
 * - index.html.backup: 表格结构
 * - data.js: update_all(), items/items2/items0
 -->
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
        <tr class="header">
          <th class="col-op">操作</th>
          <th class="col-item">
            物品
            <br /><span class="hint">点击图标显示详情</span>
          </th>
          <th class="col-rate">
            每分钟需求
            <br /><span class="hint">负数代表多余</span>
          </th>
          <th class="col-count">
            设备数量
            <br /><span class="hint">点击数字修改</span>
          </th>
          <th class="col-pf">
            配方
            <br /><span class="hint">可选</span>
          </th>
          <th class="col-acc-type">
            增产剂等级
            <br /><span class="hint">可选</span>
          </th>
          <th class="col-acc-value">
            增产剂效果
            <br /><span class="hint">可选</span>
          </th>
          <th class="col-machine">
            制作于
            <br /><span class="hint">可选</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item, index)"
          :class="getRowClass(item)"
        >
          <td class="col-op">
            <a
              v-if="!isExcluded(item.name)"
              href="javascript:void(0)"
              class="op-link"
              @click="excludeItem(item)"
              >排除</a
            >
            <a v-else href="javascript:void(0)" class="op-link restore" @click="includeItem(item)"
              >恢复</a
            >
            <a
              v-if="item.pf && item.pf.length > 1"
              href="javascript:void(0)"
              class="op-link"
              @click="showMultiRecipe(item)"
              >多配方</a
            >
            <a href="javascript:void(0)" class="op-link" @click="toggleTag(item)">{{
              item.isTagged ? '取消标注' : '标注'
            }}</a>
          </td>
          <td class="col-item">
            <div class="item-cell">
              <img
                v-if="getItemIcon(item.name)"
                :src="getItemIcon(item.name)"
                :alt="item.name"
                class="item-icon"
                :title="item.name"
              />
              <span v-else class="icon-placeholder">{{ getItemInitial(item.name) }}</span>
              <span class="item-name">{{ item.name }}</span>
            </div>
          </td>
          <td class="col-rate">
            <span class="number1">{{ item.number1 }}</span>
          </td>
          <td class="col-count">
            <span class="number2" @click="startEditCount(index)">{{ item.number2 || '-' }}</span>
            <span v-if="item.numberOther" class="number-other" v-html="item.numberOther" />
          </td>
          <td class="col-pf">
            <div v-if="item.pf && item.pf.length > 0" class="pf-list">
              <a
                v-for="pf in item.pf"
                :key="pf.id || pf.name"
                :class="pf.class"
                :title="pf.titleText || pf.title"
                href="javascript:void(0)"
                @click="selectRecipe(item.name, pf)"
                v-html="pf.title"
              />
            </div>
          </td>
          <td class="col-acc-type">
            <div v-if="item.accType && item.accType.length > 0" class="acc-list">
              <a
                v-for="acc in item.accType"
                :key="acc.name"
                :class="acc.class"
                :title="acc.title"
                href="javascript:void(0)"
                @click="selectAccType(item, acc.name)"
              >
                <img v-if="getItemIcon(acc.name)" :src="getItemIcon(acc.name)" class="acc-icon" />
                {{ acc.showName }}
              </a>
            </div>
          </td>
          <td class="col-acc-value">
            <div v-if="item.accValue && item.accValue.length > 0" class="acc-value-list">
              <a
                v-for="acc in item.accValue"
                :key="acc.name"
                :class="acc.class"
                :title="acc.title"
                href="javascript:void(0)"
                @click="selectAccValue(item, acc.name)"
              >
                {{ acc.showName }}
              </a>
            </div>
            <span v-if="item.accTotal && item.accTotal !== '0.00'" class="acc-total">
              需求：{{ item.accTotal }}
            </span>
          </td>
          <td class="col-machine">
            <div v-if="item.m && item.m.length > 0" class="machine-list">
              <a
                v-for="(m, idx) in item.m"
                :key="idx"
                :class="m.class"
                :title="m.title"
                href="javascript:void(0)"
                @click="selectMachine(item, String(m.name))"
              >
                <img
                  v-if="getMachineIcon(String(m.name))"
                  :src="getMachineIcon(String(m.name))"
                  class="machine-icon"
                />
                {{ String(m.showName || m.name || '') }}
              </a>
            </div>
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
import { computed, ref } from 'vue'
import { useBlueprintStore } from '../../stores/blueprint'
import { useIconProvider } from '../../composables/useIconProvider'
import type { IConsumptionItem, IResultItemOutput } from '../../core/types/recipe'

type TableItem = IConsumptionItem | IResultItemOutput

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
  (e: 'toggle-exclude', item: TableItem & { action: 'exclude' | 'include' }): void
  (e: 'retry'): void
  (e: 'select-recipe', item: TableItem, recipeId: string): void
  (e: 'select-acc-type', item: TableItem, accType: string): void
  (e: 'select-acc-value', item: TableItem, accValue: string): void
  (e: 'select-machine', item: TableItem, machineName: string): void
}>()

const store = useBlueprintStore()
const { getIcon } = useIconProvider()

const isIconsReady = computed(() => store.isIconsLoaded)
const taggedItems = ref<Set<string>>(new Set())

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

function getMachineIcon(name: string): string | undefined {
  if (!isIconsReady.value) return undefined

  const iconMap: Record<string, string> = {
    研究站: '矩阵研究站',
    电弧熔炉: '电弧熔炉',
    位面熔炉: '位面熔炉',
    负熵熔炉: '负熵熔炉',
    原油精炼机: '原油精炼厂',
    粒子对撞机: '微型粒子对撞机',
    射线接收塔: '射线接收站',
    '轨道采集器(气态)': '轨道采集器',
    '轨道采集器(巨冰)': '轨道采集器'
  }

  const iconName = iconMap[name] || name
  const icon = getIcon(iconName)
  return icon || undefined
}

function getItemInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function getRowClass(item: TableItem): Record<string, boolean> {
  const classes: Record<string, boolean> = {
    'is-excluded': isExcluded(item.name),
    'is-tagged': taggedItems.value.has(item.name)
  }
  if ('rowClass' in item && item.rowClass) {
    classes[item.rowClass] = true
  }
  return classes
}

function excludeItem(item: TableItem) {
  emit('toggle-exclude', { ...item, action: 'exclude' })
}

function includeItem(item: TableItem) {
  emit('toggle-exclude', { ...item, action: 'include' })
}

function showMultiRecipe(item: TableItem) {
  console.log('[ResultTable] Show multi recipe for:', item.name)
}

function toggleTag(item: TableItem) {
  if (taggedItems.value.has(item.name)) {
    taggedItems.value.delete(item.name)
  } else {
    taggedItems.value.add(item.name)
  }
}

function startEditCount(index: number) {
  console.log('[ResultTable] Edit count for index:', index)
}

function selectRecipe(itemName: string, pf: { name: string; class: string; id?: string }) {
  if (pf.class.includes('selected')) return
  console.log('[ResultTable] Select recipe:', itemName, pf.id || pf.name)
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { selectPf: (name: string, id: string) => void }).selectPf ===
      'function'
  ) {
    ;(window as unknown as { selectPf: (name: string, id: string) => void }).selectPf(
      itemName,
      pf.id || pf.name
    )
  }
}

function selectAccType(item: TableItem, accType: string) {
  emit('select-acc-type', item, accType)
}

function selectAccValue(item: TableItem, accValue: string) {
  emit('select-acc-value', item, accValue)
}

function selectMachine(item: TableItem, machineName: string) {
  emit('select-machine', item, machineName)
}
</script>

<style scoped>
.result-table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.result-table th {
  background: #f5f7fa;
  color: #333;
  font-weight: 500;
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #e1e4e8;
  vertical-align: top;
}

.result-table th .hint {
  font-size: 11px;
  color: #999;
  font-weight: normal;
}

.result-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.result-table tbody tr:hover {
  background: #fafbfc;
}

.result-table tbody tr.is-excluded {
  opacity: 0.5;
  background: #fff5f5;
}

.result-table tbody tr.is-tagged {
  background: #fffde7;
}

.col-op {
  width: 80px;
}

.col-item {
  width: 120px;
}

.col-rate,
.col-count {
  width: 100px;
}

.col-pf,
.col-acc-type,
.col-acc-value,
.col-machine {
  min-width: 100px;
}

.op-link {
  display: inline-block;
  padding: 4px 8px;
  margin: 2px;
  color: #2980b9;
  text-decoration: none;
  font-size: 12px;
  border-radius: 4px;
  background: #e3f2fd;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.op-link:hover {
  background: #bbdefb;
  color: #1565c0;
}

.op-link.restore {
  color: #27ae60;
  background: #e8f5e9;
}

.op-link.restore:hover {
  background: #c8e6c9;
  color: #1b5e20;
}

.item-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: contain;
  cursor: pointer;
}

.icon-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 4px;
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.item-name {
  font-weight: 500;
  color: #333;
}

.number1,
.number2 {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
  color: #666;
}

.number2 {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}

.number2:hover {
  background: #e6f7ff;
}

.number-other {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.pf-list,
.acc-list,
.acc-value-list,
.machine-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pf-list {
  flex-direction: column;
}

.pf-list a,
.acc-list a,
.acc-value-list a,
.machine-list a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 12px;
  color: #374151;
  background: linear-gradient(135deg, #e5e7eb, #d1d5db);
  transition: all 0.2s ease;
}

.pf-list a:hover,
.acc-list a:hover,
.acc-value-list a:hover,
.machine-list a:hover {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  transform: translateY(-1px);
}

.pf-list a.selected,
.acc-list a.selected,
.acc-value-list a.selected,
.machine-list a.selected {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.pf-list a :deep(img.sicon),
.pf-list a :deep(.sicon) {
  width: 20px;
  height: 20px;
  vertical-align: middle;
}

.pf-list a :deep(sub) {
  font-size: 10px;
  color: inherit;
}

.pf-list a :deep(img.to) {
  width: 16px;
  height: 16px;
  vertical-align: middle;
  margin: 0 4px;
}

.acc-icon,
.machine-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  object-fit: contain;
}

.acc-total {
  display: block;
  font-size: 11px;
  color: #fa8c16;
  margin-top: 4px;
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
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #40a9ff;
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
