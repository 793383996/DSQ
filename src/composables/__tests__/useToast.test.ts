import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToast, setToastInstance, cocoMessageProxy } from '../useToast'

describe('useToast', () => {
  let mockToast: ReturnType<typeof useToast>

  beforeEach(() => {
    mockToast = {
      success: vi.fn(() => 1),
      error: vi.fn(() => 2),
      warning: vi.fn(() => 3),
      info: vi.fn(() => 4),
      loading: vi.fn(() => 5),
      hide: vi.fn(),
      remove: vi.fn()
    }
    setToastInstance(mockToast)
  })

  describe('setToastInstance', () => {
    it('should set toast instance', () => {
      const toast = useToast()
      expect(toast).toBe(mockToast)
    })
  })

  describe('useToast', () => {
    it('should return toast instance', () => {
      const toast = useToast()
      expect(toast).toBeDefined()
      expect(toast.success).toBeDefined()
      expect(toast.error).toBeDefined()
      expect(toast.warning).toBeDefined()
      expect(toast.info).toBeDefined()
      expect(toast.loading).toBeDefined()
      expect(toast.hide).toBeDefined()
      expect(toast.remove).toBeDefined()
    })

    it('should call success method', () => {
      const toast = useToast()
      const id = toast.success('Test success')
      expect(mockToast.success).toHaveBeenCalledWith('Test success')
      expect(id).toBe(1)
    })

    it('should call error method', () => {
      const toast = useToast()
      const id = toast.error('Test error', 5000)
      expect(mockToast.error).toHaveBeenCalledWith('Test error', 5000)
      expect(id).toBe(2)
    })

    it('should call warning method', () => {
      const toast = useToast()
      const id = toast.warning('Test warning')
      expect(mockToast.warning).toHaveBeenCalledWith('Test warning')
      expect(id).toBe(3)
    })

    it('should call info method', () => {
      const toast = useToast()
      const id = toast.info('Test info')
      expect(mockToast.info).toHaveBeenCalledWith('Test info')
      expect(id).toBe(4)
    })

    it('should call loading method', () => {
      const toast = useToast()
      const id = toast.loading('Loading...')
      expect(mockToast.loading).toHaveBeenCalledWith('Loading...')
      expect(id).toBe(5)
    })

    it('should call hide method', () => {
      const toast = useToast()
      toast.hide(1)
      expect(mockToast.hide).toHaveBeenCalledWith(1)
    })

    it('should call remove method', () => {
      const toast = useToast()
      toast.remove(1)
      expect(mockToast.remove).toHaveBeenCalledWith(1)
    })
  })

  describe('cocoMessageProxy', () => {
    it('should proxy success message', () => {
      cocoMessageProxy('Success!', 'success')
      expect(mockToast.success).toHaveBeenCalledWith('Success!', 3000)
    })

    it('should proxy error message', () => {
      cocoMessageProxy('Error!', 'error')
      expect(mockToast.error).toHaveBeenCalledWith('Error!', 5000)
    })

    it('should proxy warning message', () => {
      cocoMessageProxy('Warning!', 'warning')
      expect(mockToast.warning).toHaveBeenCalledWith('Warning!', 4000)
    })

    it('should proxy info message as default', () => {
      cocoMessageProxy('Info!')
      expect(mockToast.info).toHaveBeenCalledWith('Info!', 3000)
    })

    it('should proxy unknown type as info', () => {
      cocoMessageProxy('Unknown type', 'unknown')
      expect(mockToast.info).toHaveBeenCalledWith('Unknown type', 3000)
    })
  })
})
