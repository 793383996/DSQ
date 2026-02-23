/**
 * Legacy配方助手类型声明
 *
 * @deprecated 此模块已废弃，保留用于遗留代码兼容
 *
 * 废弃状态：
 * - 配方处理：已迁移至 RecipeAdapter.ts
 *
 * 功能：
 * - 声明遗留配方处理函数类型
 * - 为遗留JavaScript配方代码提供类型支持
 *
 * 函数：
 * - getRecipeHelper(): 获取配方助手
 * - processRecipe(recipe): 处理配方
 *
 * 上游使用：
 * - core/adapters/RecipeAdapter.ts: 配方适配器
 */
export function getRecipeHelper(): unknown
export function processRecipe(recipe: unknown): unknown
