/**
 * App配置模块
 *
 * 功能：
 * - 定义应用版本号
 * - 定义本地存储键名常量
 * - 定义超时配置
 *
 * 配置项：
 * - VERSION: 应用版本号
 * - STORAGE_KEYS: 本地存储键名
 *   - MACHINE_SETTINGS: 机器设置
 *   - SPEED_SETTINGS: 速度设置
 *   - PF_SETTINGS: 增产剂设置
 * - TIMEOUTS: 超时配置
 *   - INITIALIZATION: 初始化超时（毫秒）
 *   - RECIPE_INDEX: 配方索引构建超时（毫秒）
 *   - ICONS_LOAD: 图标加载超时（毫秒）
 *   - CALCULATION_READY: 计算就绪等待超时（毫秒）
 *
 * 上游使用：
 * - stores/blueprint.ts: 状态存储
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/services/InitializationService.ts: 初始化服务
 * - core/bridge.ts: 遗留桥接
 * - App.vue: 主应用组件
 */
export const APP_CONFIG = {
  VERSION: '20240202',
  STORAGE_KEYS: {
    MACHINE_SETTINGS: 'machine_settings',
    SPEED_SETTINGS: 'machine_settings_time',
    PF_SETTINGS: 'machine_settings_pf',
    DEFAULT_MACHINE_SETTINGS: 'default_machine_settings'
  },
  TIMEOUTS: {
    INITIALIZATION: 30000,
    RECIPE_INDEX: 10000,
    ICONS_LOAD: 30000,
    CALCULATION_READY: 15000
  }
} as const

export type AppConfig = typeof APP_CONFIG
