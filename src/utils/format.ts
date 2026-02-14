export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '-'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  if (num >= 100) return num.toFixed(0)
  if (num >= 10) return num.toFixed(1)
  return num.toFixed(2)
}
