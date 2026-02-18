/**
 * Legacy图标加载器类型声明
 *
 * 功能：
 * - 声明遗留图标加载函数类型
 * - 为遗留JavaScript图标代码提供类型支持
 *
 * 函数：
 * - loadIcons(): 加载图标
 * - getIcon(name): 获取图标URL
 *
 * 上游使用：
 * - composables/useIconProvider.ts: 图标提供者
 */
export function loadIcons(): void
export function getIcon(name: string): string | undefined
