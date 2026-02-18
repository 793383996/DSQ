/**
 * Shims - TypeScript类型声明
 *
 * 功能：
 * - 声明.vue模块类型
 * - 声明pako库类型
 * - 声明PWA注册模块类型
 *
 * 声明模块：
 * - *.vue: Vue组件模块
 * - pako: 压缩/解压库
 * - virtual:pwa-register: PWA注册
 *
 * 上游使用：
 * - TypeScript编译器类型检查
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'pako' {
  export function deflate(data: string | Uint8Array, options?: { to?: string }): Uint8Array
  export function inflate(data: Uint8Array, options?: { to?: string }): Uint8Array | string
  export function deflateRaw(data: string | Uint8Array): Uint8Array
  export function inflateRaw(data: Uint8Array): Uint8Array
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: Error) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}
