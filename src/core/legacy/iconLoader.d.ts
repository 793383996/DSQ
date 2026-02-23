/**
 * Legacy图标加载器类型声明
 *
 * @deprecated 此模块已废弃，请使用 useIconProvider.ts
 *
 * 废弃状态：
 * - 图标加载：已迁移至 useIconProvider.ts
 * - 图标缓存：已迁移至 useIconProvider.ts
 * - 保留用于遗留代码兼容
 *
 * 迁移路径：
 * - legacy/iconLoader.js → src/composables/useIconProvider.ts
 * - window.icons → useIconProvider().getIcon()
 * - f_initIcons → useIconProvider().initializeIcons()
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
