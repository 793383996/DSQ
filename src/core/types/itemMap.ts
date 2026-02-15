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
