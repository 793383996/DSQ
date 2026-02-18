/**
 * Format - 数字格式化工具
 *
 * 功能：
 * - 格式化数字显示
 * - 支持千位缩写（k）
 * - 根据数值大小调整精度
 *
 * 主要方法：
 * - formatNumber(num): 格式化数字
 *
 * 上游调用：
 * - components/ResultTable.vue: 结果表格组件
 * - components/DemandList.vue: 需求列表组件
 *
 * 格式化规则：
 * - >= 1000: 显示为 x.xk
 * - >= 100: 显示整数
 * - >= 10: 显示1位小数
 * - < 10: 显示2位小数
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '-'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  if (num >= 100) return num.toFixed(0)
  if (num >= 10) return num.toFixed(1)
  return num.toFixed(2)
}
