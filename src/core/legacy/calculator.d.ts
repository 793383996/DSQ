/**
 * Legacy计算器类型声明
 *
 * @deprecated 此模块已废弃，请使用 RecipeCalculator.ts
 *
 * 废弃原因：
 * - 新架构使用 RecipeCalculator.ts 作为主计算引擎
 * - 此模块仅作为遗留代码兼容层存在
 * - 蓝图生成功能仍依赖此模块的 find() 函数
 *
 * 迁移路径：
 * - legacy/calculator.js → src/core/services/RecipeCalculator.ts
 * - window.loadNumber → CalculatorService.calculateWithOptions()
 * - window.find → RecipeAdapter.findRecipe()
 *
 * 功能：
 * - 声明遗留计算函数类型
 * - 为遗留JavaScript计算代码提供类型支持
 *
 * 函数：
 * - calculate(): 执行计算
 * - init(): 初始化计算器
 *
 * 上游使用：
 * - core/services/CalculatorService.ts: 计算服务
 */
export function calculate(): unknown
export function init(): void
