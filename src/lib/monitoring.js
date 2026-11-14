export function summarizeMonths(records, months, method) {
  if (!['ratio', 'sum', 'last'].includes(method)) return { status: 'invalid' }
  for (const month of months) {
    const matches = records.filter(record => record.month === month)
    if (matches.length > 1) return { status: 'invalid' }
    const entry = matches[0]
    if (!entry) continue
    if (!['collected', 'missing', 'not_due', 'no_occurrence'].includes(entry.status)) return { status: 'invalid' }
    if (entry.status === 'collected' && (method === 'ratio'
      ? !Number.isFinite(entry.numerator) || entry.numerator < 0 || !Number.isFinite(entry.denominator) || entry.denominator <= 0
      : !Number.isFinite(entry.value) || entry.value < 0)) return { status: 'invalid' }
  }
  const entries = months.map(month => records.find(record => record.month === month))
  const missing = months.filter((month, index) => !entries[index] || entries[index].status === 'missing')
  if (missing.length) return { status: 'missing', months: missing }

  const collected = entries.filter(entry => entry.status === 'collected')
  const noOccurrence = entries.filter(entry => entry.status === 'no_occurrence')
  if (!collected.length && !noOccurrence.length) return { status: 'not_due' }

  if (method === 'ratio') {
    const numerator = collected.reduce((sum, item) => sum + item.numerator, 0)
    const denominator = collected.reduce((sum, item) => sum + item.denominator, 0)
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return { status: 'invalid' }
    if (!denominator) return { status: 'no_occurrence' }
    const value = numerator / denominator * 100
    return Number.isFinite(value) ? { status: 'available', value, numerator, denominator } : { status: 'invalid' }
  }
  if (method === 'sum') {
    const value = collected.reduce((sum, item) => sum + item.value, 0)
    return Number.isFinite(value) ? { status: 'available', value } : { status: 'invalid' }
  }
  if (method === 'last') {
    const last = collected.at(-1)
    return last ? { status: 'available', value: last.value, month: last.month } : { status: 'no_occurrence' }
  }
}
