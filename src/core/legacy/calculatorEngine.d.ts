export function createCalculatorEngine(config?: unknown): {
  calculate: () => unknown
  reset: () => void
  getState: () => unknown
}
