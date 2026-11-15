import { summarizeIndicator } from './monitoring.js'
import { normalizeUnitName } from './officialUnits.js'

const singleValuePercentages = new Set([
  'clinical:K2.07',
  'clinical:K5.06',
  'paraclinical:K5.03',
])

export function isSingleValuePercentage(criterion) {
  return criterion.method === 'last' && singleValuePercentages.has(`${criterion.group}:${criterion.code}`)
}

function compare(value, threshold, direction) {
  switch (direction) {
    case '≥': case '>=': return value >= threshold
    case '≤': case '<=': return value <= threshold
    case '>': return value > threshold
    case '<': return value < threshold
    default: return null
  }
}

export function scoreCriterion(criterion, indicator, assigned, records, months, maximum) {
  const pending = reason => ({ status: 'pending', reason, maximum })
  if (!assigned || !indicator || indicator.name !== `${criterion.code} ${criterion.name}` ||
    indicator.domain !== criterion.domain || indicator.method !== criterion.method ||
    Boolean(indicator.allowNegative) !== criterion.allowNegative) {
    return pending('Chưa gán hoặc định nghĩa không khớp CSV')
  }
  const summary = summarizeIndicator(records, months, indicator)
  if (summary.status !== 'available') return { ...pending('Chưa có kết quả số liệu hợp lệ trong kỳ'), summary }
  if (!/^-?\d+(?:\.\d+)?$/.test(criterion.threshold)) return { ...pending('Ngưỡng chưa xác định rõ trong CSV'), summary }
  const threshold = Number(criterion.threshold)
  const value = criterion.method === 'ratio'
    ? summary.numerator / summary.denominator
    : isSingleValuePercentage(criterion) ? summary.value / 100 : summary.value
  const achieved = compare(value, threshold, criterion.direction)
  if (achieved === null) return { ...pending('Chiều đạt chưa xác định rõ trong CSV'), summary }
  return { status: achieved ? 'achieved' : 'failed', points: achieved ? maximum : 0, maximum, summary }
}

export function buildScorebook({ units, indicators, assignments, records, criteria, references, domains, officialUnits, year, months }) {
  const scores = {}
  const indicatorMap = new Map(indicators.map(indicator => [indicator.id, indicator]))
  const assignmentKeys = new Set(assignments.map(item => `${item.unitId}_${item.indicatorId}`))
  const yearRecords = records.filter(record => record.year === year)

  for (const unit of units) {
    const unitScores = {}
    for (const domain of domains) {
      const applicable = criteria.filter(item => item.group === unit.group && item.domain === domain.key)
      if (!applicable.length) continue
      const maximum = domain.weight / applicable.length
      const results = applicable.map(criterion => ({
        criterion,
        ...scoreCriterion(
          criterion,
          indicatorMap.get(criterion.id),
          assignmentKeys.has(`${unit.id}_${criterion.id}`),
          yearRecords.filter(record => record.unitId === unit.id && record.indicatorId === criterion.id),
          months,
          maximum,
        ),
      }))
      const determined = results.filter(result => result.status !== 'pending')
      unitScores[domain.key] = {
        value: determined.length ? determined.reduce((sum, item) => sum + item.points, 0) : null,
        complete: determined.length === results.length,
        determined: determined.length,
        total: results.length,
        results,
      }
    }
    scores[unit.id] = unitScores
  }

  const expected = officialUnits.filter(unit => ['clinical', 'paraclinical'].includes(unit.group))
  for (const reference of references) {
    const candidates = expected.map(expectedUnit => {
      const matches = units.filter(unit => unit.group === expectedUnit.group &&
        typeof unit.name === 'string' && normalizeUnitName(unit.name) === normalizeUnitName(expectedUnit.name))
      return matches.length === 1 ? scores[matches[0].id]?.[reference.domain] : null
    }).filter(score => score?.complete)
    const referenceScore = {
      value: candidates.length ? candidates.reduce((sum, score) => sum + score.value, 0) / candidates.length : null,
      complete: candidates.length === expected.length && expected.length > 0,
      determined: candidates.length,
      total: expected.length,
      reference: true,
    }
    units.filter(unit => unit.group === reference.group).forEach(unit => {
      scores[unit.id][reference.domain] = referenceScore
    })
  }
  return scores
}
