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
