/**
 * Legacy存储管理器类型声明
 *
 * @deprecated 此模块已废弃，请使用 SettingsAdapter.ts
 *
 * 废弃状态：
 * - 设置管理：已迁移至 SettingsAdapter.ts
 * - 保留用于遗留代码兼容
 *
 * 迁移路径：
 * - legacy/storageManager.js → src/core/adapters/SettingsAdapter.ts
 * - window.settings → SettingsAdapter.getRecipeSettings()
 * - window.settings_time → SettingsAdapter.getSpeedSettings()
 * - window.settings_pf → SettingsAdapter.getProductivitySettings()
 *
 * 功能：
 * - 声明遗留存储管理函数类型
 * - 为遗留JavaScript存储代码提供类型支持
 *
 * 函数：
 * - save(key, value): 保存数据
 * - load(key): 加载数据
 * - remove(key): 删除数据
 *
 * 上游使用：
 * - core/utils/storage.ts: 存储工具
 */
export function save(key: string, value: unknown): void
export function load(key: string): unknown
export function remove(key: string): void
