/**
 * Legacy蓝图类型声明
 *
 * 功能：
 * - 声明遗留蓝图生成函数类型
 * - 为遗留JavaScript蓝图代码提供类型支持
 *
 * 声明：
 * - itemMap: 物品映射表
 *
 * 函数：
 * - generateBlueprint(config): 生成蓝图字符串
 *
 * 上游使用：
 * - core/adapters/BlueprintAdapter.ts: 蓝图适配器
 */
export const itemMap: { [key: string]: { name: string; iconId?: string; remark?: string } }
export function generateBlueprint(config: any): string
