export const APP_CONFIG = {
  VERSION: '20240202',
  STORAGE_KEYS: {
    MACHINE_SETTINGS: 'machine_settings',
    SPEED_SETTINGS: 'machine_settings_time',
    PF_SETTINGS: 'machine_settings_pf'
  }
} as const

export type AppConfig = typeof APP_CONFIG
