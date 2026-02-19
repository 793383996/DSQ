import { describe, it, expect } from 'vitest'
import { defaultBreakpoints, type BreakpointConfig } from '../useBreakpoints'

describe('useBreakpoints', () => {
  describe('defaultBreakpoints', () => {
    it('should have correct default values', () => {
      expect(defaultBreakpoints.xs).toBe(0)
      expect(defaultBreakpoints.sm).toBe(640)
      expect(defaultBreakpoints.md).toBe(768)
      expect(defaultBreakpoints.lg).toBe(1024)
      expect(defaultBreakpoints.xl).toBe(1280)
      expect(defaultBreakpoints['2xl']).toBe(1536)
    })
  })

  describe('breakpoint logic', () => {
    const getBreakpoint = (
      width: number,
      breakpoints: BreakpointConfig = defaultBreakpoints
    ): string => {
      if (width >= breakpoints['2xl']) return '2xl'
      if (width >= breakpoints.xl) return 'xl'
      if (width >= breakpoints.lg) return 'lg'
      if (width >= breakpoints.md) return 'md'
      if (width >= breakpoints.sm) return 'sm'
      return 'xs'
    }

    it('should return xs for width < 640', () => {
      expect(getBreakpoint(500)).toBe('xs')
      expect(getBreakpoint(0)).toBe('xs')
      expect(getBreakpoint(639)).toBe('xs')
    })

    it('should return sm for width >= 640 and < 768', () => {
      expect(getBreakpoint(640)).toBe('sm')
      expect(getBreakpoint(700)).toBe('sm')
      expect(getBreakpoint(767)).toBe('sm')
    })

    it('should return md for width >= 768 and < 1024', () => {
      expect(getBreakpoint(768)).toBe('md')
      expect(getBreakpoint(900)).toBe('md')
      expect(getBreakpoint(1023)).toBe('md')
    })

    it('should return lg for width >= 1024 and < 1280', () => {
      expect(getBreakpoint(1024)).toBe('lg')
      expect(getBreakpoint(1100)).toBe('lg')
      expect(getBreakpoint(1279)).toBe('lg')
    })

    it('should return xl for width >= 1280 and < 1536', () => {
      expect(getBreakpoint(1280)).toBe('xl')
      expect(getBreakpoint(1400)).toBe('xl')
      expect(getBreakpoint(1535)).toBe('xl')
    })

    it('should return 2xl for width >= 1536', () => {
      expect(getBreakpoint(1536)).toBe('2xl')
      expect(getBreakpoint(1600)).toBe('2xl')
      expect(getBreakpoint(2000)).toBe('2xl')
    })

    it('should work with custom breakpoint config', () => {
      const customBreakpoints: BreakpointConfig = {
        xs: 0,
        sm: 400,
        md: 600,
        lg: 800,
        xl: 1000,
        '2xl': 1200
      }

      expect(getBreakpoint(350, customBreakpoints)).toBe('xs')
      expect(getBreakpoint(450, customBreakpoints)).toBe('sm')
      expect(getBreakpoint(650, customBreakpoints)).toBe('md')
      expect(getBreakpoint(850, customBreakpoints)).toBe('lg')
      expect(getBreakpoint(1050, customBreakpoints)).toBe('xl')
      expect(getBreakpoint(1250, customBreakpoints)).toBe('2xl')
    })
  })

  describe('isMobile logic', () => {
    const isMobile = (width: number, mdBreakpoint: number = 768): boolean => {
      return width < mdBreakpoint
    }

    it('should return true for width < 768', () => {
      expect(isMobile(500)).toBe(true)
      expect(isMobile(767)).toBe(true)
    })

    it('should return false for width >= 768', () => {
      expect(isMobile(768)).toBe(false)
      expect(isMobile(1024)).toBe(false)
    })
  })

  describe('isDesktop logic', () => {
    const isDesktop = (width: number, lgBreakpoint: number = 1024): boolean => {
      return width >= lgBreakpoint
    }

    it('should return true for width >= 1024', () => {
      expect(isDesktop(1024)).toBe(true)
      expect(isDesktop(1280)).toBe(true)
    })

    it('should return false for width < 1024', () => {
      expect(isDesktop(1023)).toBe(false)
      expect(isDesktop(768)).toBe(false)
    })
  })

  describe('isTablet logic', () => {
    const isTablet = (
      width: number,
      mdBreakpoint: number = 768,
      lgBreakpoint: number = 1024
    ): boolean => {
      return width >= mdBreakpoint && width < lgBreakpoint
    }

    it('should return true for width >= 768 and < 1024', () => {
      expect(isTablet(768)).toBe(true)
      expect(isTablet(900)).toBe(true)
      expect(isTablet(1023)).toBe(true)
    })

    it('should return false for width outside tablet range', () => {
      expect(isTablet(767)).toBe(false)
      expect(isTablet(1024)).toBe(false)
    })
  })

  describe('orientation logic', () => {
    const isPortrait = (width: number, height: number): boolean => height > width
    const isLandscape = (width: number, height: number): boolean => width > height

    it('should detect portrait orientation', () => {
      expect(isPortrait(768, 1024)).toBe(true)
      expect(isPortrait(500, 800)).toBe(true)
    })

    it('should detect landscape orientation', () => {
      expect(isLandscape(1024, 768)).toBe(true)
      expect(isLandscape(800, 500)).toBe(true)
    })
  })
})
