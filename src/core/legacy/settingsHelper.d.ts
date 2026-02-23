/**
 * Legacy设置助手类型声明
 *
 * @deprecated 此模块已废弃，请使用 SettingsAdapter.ts
 *
 * 废弃状态：
 * - 设置管理：已迁移至 SettingsAdapter.ts
 *
 * 功能：
 * - 声明遗留设置管理函数类型
 * - 为遗留JavaScript设置代码提供类型支持
 *
 * 函数：
 * - getSettings(): 获取设置
 * - setSettings(settings): 设置设置
 * - saveSettings(): 保存设置
 * - loadSettings(): 加载设置
 *
 * 上游使用：
 * - stores/settings.ts: 设置存储
 * - core/adapters/SettingsAdapter.ts: 设置适配器
 */
export function getSettings(): Record<string, unknown>
export function setSettings(settings: Record<string, unknown>): void
export function saveSettings(): void
export function loadSettings(): void
