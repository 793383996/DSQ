/**
 * Legacy数据类型声明
 *
 * 功能：
 * - 声明全局遗留数据和函数类型
 * - 为遗留JavaScript代码提供TypeScript类型支持
 *
 * 声明：
 * - data: 配方数据数组
 * - game_data: 游戏数据
 * - isDataLoaded: 数据加载状态
 * - icons: 图标映射
 * - xqs: 需求列表
 * - ig_names: 排除名称列表
 * - settings: 设置对象
 * - settings_time: 时间设置
 *
 * 函数：
 * - f_init(): 初始化
 * - f_initIcons(): 初始化图标
 * - f_add3(name): 添加需求
 * - update_all(): 更新所有
 * - find(name, isProduct): 查找配方
 * - getRecipe(): 获取配方
 * - generateBlueprint(): 生成蓝图
 * - loadNumber(itemName, n): 加载数量计算
 * - f_reset(): 重置
 * - f_reset_ig(): 重置排除列表
 * - f_remove_ig(name): 移除排除项
 *
 * 上游使用：
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/workers/calculator.worker.ts: Worker计算
 */
export const data: any[]
export const game_data: any
export const isDataLoaded: boolean
export const icons: { [key: string]: string }
export const xqs: any[]
export const ig_names: string[]
export const settings: any
export const settings_time: Record<string, number>
export const app: any
export function f_init(): void
export function f_initIcons(): void
export function f_add3(name: string): void
export function update_all(): void
export function find(name: string, isProduct?: boolean): any
export function getRecipe(): any[]
export function generateBlueprint(): string
export function saveSettingTime(): void
export function loadSettingTime(): void
export function loadNumber(itemName: string, n: number): void
export function f_reset(): void
export function f_reset_ig(): void
export function f_remove_ig(name: string): void
