/**
 * Legacy存储管理器类型声明
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
