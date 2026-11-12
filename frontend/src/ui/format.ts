/** Число с фиксированной точностью; null → «—» */
export function fmt(value: number | null, digits = 3): string {
  return value === null ? '—' : value.toFixed(digits)
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(1)} %`
}
