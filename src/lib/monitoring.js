export function monthsForPeriod(period) {
  if (period === 'year') return Array.from({ length: 12 }, (_, index) => index + 1)
  if (/^quarter[1-4]$/.test(period)) {
    const quarter = Number(period.slice(-1))
    return Array.from({ length: 3 }, (_, index) => (quarter - 1) * 3 + index + 1)
  }
  if (/^month(0[1-9]|1[0-2])$/.test(period)) return [Number(period.slice(5))]
  throw new Error('Kỳ theo dõi không hợp lệ.')
}

export function summarizeIndicator(records, months, indicator) {
  const monthRecords = records.map(record => ({ ...record, month: Number(record.month) }))
  return summarizeMonths(monthRecords, months, indicator.method, indicator.allowNegative)
}

export function countAvailableSummaries(indicators, records, months) {
  return indicators.reduce((count, indicator) => {
    const matching = records.filter(record => record.indicatorId === indicator.id)
    return count + (summarizeIndicator(matching, months, indicator).status === 'available' ? 1 : 0)
  }, 0)
}

export function summarizeMonths(records, months, method, allowNegative = false) {
  if (!['ratio', 'rate', 'sum', 'last'].includes(method)) return { status: 'invalid' }
  for (const month of months) {
    const matches = records.filter(record => record.month === month)
    if (matches.length > 1) return { status: 'invalid' }
    const entry = matches[0]
    if (!entry) continue
    if (!['collected', 'missing', 'not_due', 'no_occurrence'].includes(entry.status)) return { status: 'invalid' }
    if (entry.status === 'collected' && (method === 'ratio' || method === 'rate'
      ? !Number.isFinite(entry.numerator) || entry.numerator < 0 || !Number.isFinite(entry.denominator) || entry.denominator <= 0
      : !Number.isFinite(entry.value) || (!allowNegative && entry.value < 0))) return { status: 'invalid' }
  }
  const entries = months.map(month => records.find(record => record.month === month))
  const missing = months.filter((month, index) => !entries[index] || entries[index].status === 'missing')
  if (missing.length) return { status: 'missing', months: missing }

  const collected = entries.filter(entry => entry.status === 'collected')
  const noOccurrence = entries.filter(entry => entry.status === 'no_occurrence')
  if (!collected.length && !noOccurrence.length) return { status: 'not_due' }

  if (method === 'ratio' || method === 'rate') {
    const numerator = collected.reduce((sum, item) => sum + item.numerator, 0)
    const denominator = collected.reduce((sum, item) => sum + item.denominator, 0)
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return { status: 'invalid' }
    if (!denominator) return { status: 'no_occurrence' }
    const value = numerator / denominator * (method === 'ratio' ? 100 : 1)
    return Number.isFinite(value) ? { status: 'available', value, numerator, denominator } : { status: 'invalid' }
  }
  if (method === 'sum') {
    if (!collected.length) return { status: 'no_occurrence' }
    const value = collected.reduce((sum, item) => sum + item.value, 0)
    return Number.isFinite(value) ? { status: 'available', value } : { status: 'invalid' }
  }
  if (method === 'last') {
    const last = collected.at(-1)
    return last ? { status: 'available', value: last.value, month: last.month } : { status: 'no_occurrence' }
  }
}
