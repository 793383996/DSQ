/**
 * Legacy配置数据类型声明
 *
 * 功能：
 * - 声明遗留配置数据类型
 * - 为遗留JavaScript配置代码提供类型支持
 *
 * 声明：
 * - configData: 配置数据对象
 *
 * 函数：
 * - getConfig(): 获取配置
 * - setConfig(key, value): 设置配置
 *
 * 上游使用：
 * - stores/settings.ts: 设置存储
 */
export const configData: Record<string, unknown>
export function getConfig(): unknown
export function setConfig(key: string, value: unknown): void
