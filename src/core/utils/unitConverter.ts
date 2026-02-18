/**
 * UnitConverter - 单位转换工具
 *
 * 功能：
 * - 游戏内单位与显示单位转换
 * - 秒/分钟速率转换
 * - 数字格式化和解析
 *
 * 主要方法：
 * - perSecondToPerMinute(value): 秒速率转分钟速率
 * - perMinuteToPerSecond(value): 分钟速率转秒速率
 * - formatNumber(value, decimals): 格式化数字
 * - parseNumber(value): 解析数字字符串
 * - calculatePerMinute(baseAmount, time): 计算每分钟产量
 *
 * 上游调用：
 * - core/services/UpdateAllService.ts: 更新服务
 * - components/ResultTable.vue: 结果表格组件
 *
 * 单位说明：
 * - 游戏内单位: 个/秒
 * - 显示单位: 个/min
 */
/**
 * 单位转换工具
 *
 * 游戏内单位: 个/秒
 * 显示单位: 个/min
 */
export const SECONDS_PER_MINUTE = 60

/**
 * 秒转分钟
 */
export function perSecondToPerMinute(value: number): number {
  return value * SECONDS_PER_MINUTE
}

/**
 * 分钟转秒
 */
export function perMinuteToPerSecond(value: number): number {
  return value / SECONDS_PER_MINUTE
}

/**
 * 格式化数字 (保留指定小数位)
 */
export function formatNumber(value: number, decimals: number = 3): string {
  if (value === 0) return '0'
  const absValue = Math.abs(value)
  if (absValue < 0.001 && absValue > 0) return value.toExponential(2)
  if (absValue >= 1000000) return value.toExponential(2)
  return value.toFixed(decimals)
}

/**
 * 解析数字字符串
 */
export function parseNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

/**
 * 计算每分钟产量
 * @param baseAmount 基础产量 (个)
 * @param time 生产时间 (秒)
 * @returns 每分钟产量
 */
export function calculatePerMinute(baseAmount: number, time: number): number {
  if (time <= 0) return 0
  return (baseAmount / time) * SECONDS_PER_MINUTE
}

/**
 * 计算所需机器数量
 * @param targetPerMinute 目标每分钟产量
 * @param recipeOutput 配方产出数量
 * @param recipeTime 配方生产时间 (秒)
 * @param machineSpeed 机器速度倍率
 * @returns 所需机器数量
 */
export function calculateMachineCount(
  targetPerMinute: number,
  recipeOutput: number,
  recipeTime: number,
  machineSpeed: number = 1
): number {
  if (recipeOutput <= 0 || recipeTime <= 0 || machineSpeed <= 0) return 0
  const outputPerMinute = calculatePerMinute(recipeOutput, recipeTime) * machineSpeed
  if (outputPerMinute <= 0) return 0
  return targetPerMinute / outputPerMinute
}
