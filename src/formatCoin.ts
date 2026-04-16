export function formatCoinCompact(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  if (abs < 1000) return Math.round(value).toString()

  const units = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' },
  ] as const

  for (const unit of units) {
    if (abs >= unit.threshold) {
      const scaled = value / unit.threshold
      const rounded = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)
      return `${rounded.replace(/\.0$/, '')}${unit.suffix}`
    }
  }

  return Math.round(value).toString()
}
