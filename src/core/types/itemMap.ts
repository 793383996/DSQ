/**
 * ItemMap类型定义
 *
 * 功能：
 * - 定义物品映射类型
 * - 提供物品查询函数
 * - 导出物品数据
 *
 * 主要方法：
 * - getItemByName(name): 按名称获取物品
 * - getItemByRemark(remark): 按备注获取物品
 * - getItemIconId(name): 获取物品图标ID
 * - getItemRemark(name): 获取物品备注
 *
 * 上游使用：
 * - core/blueprint/services/BlueprintService.ts: 蓝图服务
 * - components/ResultTable.vue: 结果表格组件
 *
 * 下游依赖：
 * - core/data/itemMap.json: 物品数据
 */
import type { IItemData, IItemInfo } from './blueprint'
import itemMapData from '../data/itemMap.json'

export type { IItemInfo, IItemData }

export const itemMap: Record<string, IItemInfo> = itemMapData as Record<string, IItemInfo>

export function getItemByName(name: string): IItemInfo | undefined {
  for (const key in itemMap) {
    if (itemMap[key].name === name) {
      return itemMap[key]
    }
  }
  return undefined
}

export function getItemByRemark(remark: string): IItemInfo | undefined {
  for (const key in itemMap) {
    if (itemMap[key].remark === remark) {
      return itemMap[key]
    }
  }
  return undefined
}

export function getItemIconId(name: string): number | undefined {
  const item = getItemByName(name)
  return item?.iconId
}

export function getItemRemark(name: string): string {
  const item = getItemByName(name)
  return item?.remark || name
}
