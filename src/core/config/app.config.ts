/**
 * App配置模块
 *
 * 功能：
 * - 定义应用版本号
 * - 定义本地存储键名常量
 *
 * 配置项：
 * - VERSION: 应用版本号
 * - STORAGE_KEYS: 本地存储键名
 *   - MACHINE_SETTINGS: 机器设置
 *   - SPEED_SETTINGS: 速度设置
 *   - PF_SETTINGS: 增产剂设置
 *
 * 上游使用：
 * - stores/blueprint.ts: 状态存储
 * - core/services/UpdateAllService.ts: 更新服务
 */
export const APP_CONFIG = {
  VERSION: '20240202',
  STORAGE_KEYS: {
    MACHINE_SETTINGS: 'machine_settings',
    SPEED_SETTINGS: 'machine_settings_time',
    PF_SETTINGS: 'machine_settings_pf'
  }
} as const

export type AppConfig = typeof APP_CONFIG
