/**
 * useToast - Toast消息组合式函数
 *
 * 功能：
 * - 提供全局Toast消息访问
 * - 支持多种消息类型：success/error/warning/info/loading
 * - 支持遗留代码的cocoMessage代理
 *
 * 主要方法：
 * - useToast(): 获取Toast实例
 * - setToastInstance(instance): 设置全局Toast实例
 * - cocoMessageProxy(message, type): 遗留代码消息代理
 *
 * 上游调用：
 * - App.vue: 设置全局Toast实例
 * - components/BlueprintGenerator.vue: 显示操作结果
 * - core/bridge.ts: 遗留代码消息提示
 *
 * 下游依赖：
 * - components/Toast/Toast.vue: Toast组件实例
 *
 * 使用方式：
 * - 在App.vue中通过ref获取Toast实例并调用setToastInstance
 * - 在其他组件中通过useToast()获取实例
 */
import { ref, getCurrentInstance } from 'vue'

interface ToastAPI {
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  warning: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
  loading: (message?: string) => number
  hide: (id: number) => void
  remove: (id: number) => void
}

let toastInstance: ToastAPI | null = null

export function setToastInstance(instance: ToastAPI) {
  toastInstance = instance
}

export function useToast(): ToastAPI {
  if (!toastInstance) {
    const vm = getCurrentInstance()
    if (vm) {
      return vm.appContext.config.globalProperties.$toast as ToastAPI
    }
    return {
      success: () => 0,
      error: () => 0,
      warning: () => 0,
      info: () => 0,
      loading: () => 0,
      hide: () => {},
      remove: () => {}
    }
  }
  return toastInstance
}

export function cocoMessageProxy(message: string, type: string = 'info'): void {
  const toast = useToast()
  switch (type) {
    case 'success':
      toast.success(message, 3000)
      break
    case 'error':
      toast.error(message, 5000)
      break
    case 'warning':
      toast.warning(message, 4000)
      break
    case 'info':
    default:
      toast.info(message, 3000)
      break
  }
}
