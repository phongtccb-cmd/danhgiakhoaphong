import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseCriteriaCsv } from './criteriaCsv.js'
import { officialUnits } from './officialUnits.js'
import { buildScorebook, scoreCriterion } from './scoring.js'

const csv = readFileSync(new URL('../../Tieu_chi_danh_gia_Quy_IV_2026_03_nhom.csv', import.meta.url), 'utf8')
const { criteria, references } = parseCriteriaCsv(csv)
const domains = [
  { key: 'management', weight: 19 }, { key: 'quality', weight: 24 },
  { key: 'finance', weight: 20 }, { key: 'staff', weight: 17 }, { key: 'safety', weight: 20 },
]
const definition = item => ({
  id: item.id, name: `${item.code} ${item.name}`, domain: item.domain,
  method: item.method, allowNegative: item.allowNegative,
})
const data = (unit, item, value, month = '10') => ({
  unitId: unit.id, indicatorId: item.id, year: '2026', month, status: 'collected',
  ...(item.method === 'ratio' || item.method === 'rate'
    ? { numerator: value, denominator: 100 } : { value }),
})

test('chia đều 19 điểm cho bốn tiêu chí; đạt, không đạt và thiếu dữ liệu khác nhau', () => {
  const unit = officialUnits.find(item => item.group === 'functional')
  const items = criteria.filter(item => item.group === 'functional' && item.domain === 'management')
  const input = {
    units: [unit], indicators: items.map(definition), assignments: items.map(item => ({ unitId: unit.id, indicatorId: item.id })),
    records: [data(unit, items[0], 90), data(unit, items[1], 94), data(unit, items[2], 100)],
    criteria, references, domains, officialUnits, year: '2026', months: [10],
  }
  const score = buildScorebook(input)[unit.id].management
  assert.equal(items.length, 4)
  assert.deepEqual(score.results.map(item => item.status), ['achieved', 'failed', 'achieved', 'pending'])
  assert.equal(score.value, 9.5)
  assert.equal(score.complete, false)
  assert.equal(score.results[0].maximum, 4.75)
  input.records.push(data(unit, items[3], 90))
  assert.equal(buildScorebook(input)[unit.id].management.value, 14.25)
  assert.equal(buildScorebook(input)[unit.id].management.complete, true)
})

test('không chấm ngưỡng chưa rõ, dữ liệu sai hoặc định nghĩa và phân công không khớp', () => {
  const unit = officialUnits.find(item => item.group === 'clinical')
  const item = criteria.find(entry => entry.group === 'clinical' && entry.code === 'K3.01')
  assert.equal(scoreCriterion(item, definition(item), true, [data(unit, item, 0)], [10], 5).status, 'pending')
  const valid = criteria.find(entry => entry.group === 'clinical' && entry.code === 'K1.01')
  const record = data(unit, valid, 90)
  assert.equal(scoreCriterion(valid, definition(valid), false, [record], [10], 5).status, 'pending')
  assert.equal(scoreCriterion(valid, { ...definition(valid), method: 'last' }, true, [record], [10], 5).status, 'pending')
  assert.equal(scoreCriterion(valid, definition(valid), true, [{ ...record, denominator: 0 }], [10], 5).status, 'pending')
  assert.equal(scoreCriterion(valid, definition(valid), true, [{ ...record, status: 'no_occurrence' }], [10], 5).status, 'pending')
  assert.equal(scoreCriterion(valid, definition(valid), true, [record], [10, 11, 12], 5).status, 'pending')
})

test('tỷ lệ một ô nhập theo phần trăm và tỷ lệ hai ô so sánh theo ngưỡng CSV', () => {
  const unit = officialUnits.find(item => item.group === 'clinical')
  const item = criteria.find(entry => entry.group === 'clinical' && entry.code === 'K2.07')
  assert.equal(scoreCriterion(item, definition(item), true, [data(unit, item, 80)], [10], 6).status, 'achieved')
  assert.equal(scoreCriterion(item, definition(item), true, [data(unit, item, 79)], [10], 6).status, 'failed')
  const ratio = criteria.find(entry => entry.group === 'clinical' && entry.code === 'K1.01')
  assert.equal(scoreCriterion(ratio, definition(ratio), true, [data(unit, ratio, 90)], [10], 6).status, 'achieved')
  assert.equal(scoreCriterion(ratio, definition(ratio), true, [data(unit, ratio, 89)], [10], 6).status, 'failed')
})

test('chấm kỳ quý theo số liệu tổng hợp của đủ ba tháng', () => {
  const unit = officialUnits.find(item => item.group === 'functional')
  const item = criteria.find(entry => entry.group === 'functional' && entry.code === 'K1.02')
  const records = [data(unit, item, 94, '10'), data(unit, item, 95, '11'), data(unit, item, 96, '12')]
  const result = scoreCriterion(item, definition(item), true, records, [10, 11, 12], 4.75)
  assert.equal(result.status, 'achieved')
  assert.equal(result.points, 4.75)
  assert.equal(scoreCriterion(item, definition(item), true, records.slice(0, 2), [10, 11, 12], 4.75).status, 'pending')
})

test('điểm tham chiếu trung bình theo đơn vị đủ điểm, chỉ đầy đủ khi có đủ 38 đơn vị', () => {
  const functional = officialUnits.find(unit => unit.group === 'functional')
  const candidates = officialUnits.filter(unit => ['clinical', 'paraclinical'].includes(unit.group))
  const items = criteria.filter(item => ['clinical', 'paraclinical'].includes(item.group) && item.domain === 'safety')
  const assignments = candidates.flatMap(unit => items.filter(item => item.group === unit.group).map(item => ({ unitId: unit.id, indicatorId: item.id })))
  const records = candidates.flatMap((unit, index) => items.filter(item => item.group === unit.group).map(item => {
    const pass = item.direction.includes('<') || item.direction === '≤' ? 0 : 100
    return data(unit, item, index === 1 ? 0 : pass)
  }))
  const input = { units: [functional, ...candidates], indicators: items.map(definition), assignments, records, criteria, references, domains, officialUnits, year: '2026', months: [10] }
  const full = buildScorebook(input)[functional.id].safety
  assert.equal(full.complete, true)
  assert.equal(full.determined, 38)
  assert.ok(Math.abs(full.value - (37 * 20 + 20 / 3) / 38) < 1e-10)
  input.units = [functional, ...candidates, { ...candidates[0], id: 'duplicate' }]
  const duplicate = buildScorebook(input)[functional.id].safety
  assert.equal(duplicate.complete, false)
  assert.equal(duplicate.determined, 37)
  input.units = [functional, ...candidates.slice(0, 2)]
  const partial = buildScorebook(input)[functional.id].safety
  assert.equal(partial.complete, false)
  assert.equal(partial.determined, 2)
  assert.ok(Math.abs(partial.value - (20 + buildScorebook(input)[candidates[1].id].safety.value) / 2) < 1e-10)
  input.units = [functional]
  assert.equal(buildScorebook(input)[functional.id].safety.value, null)
})
