export function monthsForPeriod(period) {
  if (period === 'year') return Array.from({ length: 12 }, (_, index) => index + 1)
  if (/^quarter[1-4]$/.test(period)) {
    const quarter = Number(period.slice(-1))
    return Array.from({ length: 3 }, (_, index) => (quarter - 1) * 3 + index + 1)
  }
  throw new Error('Kỳ theo dõi không hợp lệ.')
}

export function summarizeIndicator(records, months, indicator) {
  const monthRecords = records.map(record => ({ ...record, month: Number(record.month) }))
  return summarizeMonths(monthRecords, months, indicator.method, indicator.allowNegative)
}

export function summarizePeriod(records, period, indicator) {
  const monthRecords = records.map(record => ({ ...record, month: Number(record.month) }))
  if (period !== 'year') {
    return summarizeMonths(monthRecords, monthsForPeriod(period), indicator.method, indicator.allowNegative)
  }

  const quarters = [1, 2, 3, 4].map(quarter => {
    const key = `quarter${quarter}`
    return {
      quarter,
      result: summarizeMonths(monthRecords, monthsForPeriod(key), indicator.method, indicator.allowNegative),
    }
  })
  const invalid = quarters.find(item => item.result.status === 'invalid')
  if (invalid) return { status: 'invalid' }
  const missing = quarters.filter(item => item.result.status === 'missing').map(item => item.quarter)
  if (missing.length) return { status: 'missing', quarters: missing }

  const collected = quarters.filter(item => item.result.status === 'available')
  const noOccurrence = quarters.some(item => item.result.status === 'no_occurrence')
  if (!collected.length) return { status: noOccurrence ? 'no_occurrence' : 'not_due' }

  if (indicator.method === 'ratio' || indicator.method === 'rate') {
    const numerator = collected.reduce((sum, item) => sum + item.result.numerator, 0)
    const denominator = collected.reduce((sum, item) => sum + item.result.denominator, 0)
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return { status: 'invalid' }
    const value = numerator / denominator * (indicator.method === 'ratio' ? 100 : 1)
    return Number.isFinite(value) ? { status: 'available', value, numerator, denominator } : { status: 'invalid' }
  }
  if (indicator.method === 'sum') {
    const value = collected.reduce((sum, item) => sum + item.result.value, 0)
    return Number.isFinite(value) ? { status: 'available', value } : { status: 'invalid' }
  }
  if (indicator.method === 'last') {
    const last = collected.at(-1)
    return { status: 'available', value: last.result.value, quarter: last.quarter, month: last.result.month }
  }
  return { status: 'invalid' }
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
