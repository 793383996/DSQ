/**
 * Legacy配方助手类型声明
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
