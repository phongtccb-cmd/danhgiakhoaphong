import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { countAvailableSummaries, monthsForPeriod, summarizeIndicator, summarizeMonths } from './monitoring.js'

test('chọn tháng, quý hoặc năm và từ chối kỳ không hợp lệ', () => {
  assert.deepEqual(monthsForPeriod('month01'), [1])
  assert.deepEqual(monthsForPeriod('month11'), [11])
  assert.deepEqual(monthsForPeriod('month12'), [12])
  assert.deepEqual(monthsForPeriod('quarter1'), [1, 2, 3])
  assert.deepEqual(monthsForPeriod('quarter2'), [4, 5, 6])
  assert.deepEqual(monthsForPeriod('quarter3'), [7, 8, 9])
  assert.deepEqual(monthsForPeriod('quarter4'), [10, 11, 12])
  assert.deepEqual(monthsForPeriod('year'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.throws(() => monthsForPeriod('month13'), /không hợp lệ/)
})

test('đếm chỉ tiêu đã có kết quả số liệu theo đúng tháng và trạng thái, không tính là điểm', () => {
  const indicators = [
    { id: 'a', method: 'ratio' },
    { id: 'b', method: 'sum' },
    { id: 'c', method: 'last' },
  ]
  const records = [
    { indicatorId: 'a', month: '10', status: 'collected', numerator: 9, denominator: 10 },
    { indicatorId: 'b', month: '10', status: 'no_occurrence' },
    { indicatorId: 'c', month: '11', status: 'collected', value: 5 },
  ]
  assert.equal(countAvailableSummaries(indicators, records, monthsForPeriod('month10')), 1)
  assert.equal(countAvailableSummaries(indicators, records, monthsForPeriod('month11')), 1)
  assert.equal(countAvailableSummaries(indicators, records, monthsForPeriod('quarter4')), 0)
  assert.deepEqual(summarizeIndicator(records.filter(record => record.indicatorId === 'b'), [10], indicators[1]), { status: 'no_occurrence' })
  assert.equal(countAvailableSummaries(indicators, [...records, { indicatorId: 'a', month: '10', status: 'not_due' }], [10]), 0)
  assert.equal(countAvailableSummaries(indicators, [{ indicatorId: 'a', month: '10', status: 'collected', numerator: 1, denominator: 0 }], [10]), 0)
})

test('gộp tử số và mẫu số, không lấy trung bình tỷ lệ tháng', () => {
  const result = summarizeMonths([
    { month: 1, status: 'collected', numerator: 9, denominator: 10 },
    { month: 2, status: 'collected', numerator: 19, denominator: 20 },
    { month: 3, status: 'collected', numerator: 5, denominator: 5 },
  ], [1, 2, 3], 'ratio')
  assert.equal(result.numerator, 33)
  assert.equal(result.denominator, 35)
  assert.ok(Math.abs(result.value - 94.28571428571429) < 1e-10)
})

test('gộp chỉ số trên mẫu số mà không đổi thành phần trăm', () => {
  const result = summarizeMonths([
    { month: 1, status: 'collected', numerator: 130, denominator: 2 },
    { month: 2, status: 'collected', numerator: 90, denominator: 2 },
  ], [1, 2], 'rate')
  assert.equal(result.value, 55)
})

test('thiếu hoặc chưa nhập số liệu không bị tính thành 0', () => {
  assert.deepEqual(summarizeMonths([
    { month: 1, status: 'collected', value: 5 },
    { month: 2, status: 'missing' },
  ], [1, 2, 3], 'sum'), { status: 'missing', months: [2, 3] })
})

test('phân biệt chưa đến kỳ đo và không phát sinh', () => {
  assert.deepEqual(summarizeMonths([
    { month: 1, status: 'not_due' },
    { month: 2, status: 'not_due' },
    { month: 3, status: 'not_due' },
  ], [1, 2, 3], 'ratio'), { status: 'not_due' })
  assert.deepEqual(summarizeMonths([
    { month: 1, status: 'no_occurrence' },
    { month: 2, status: 'not_due' },
    { month: 3, status: 'no_occurrence' },
  ], [1, 2, 3], 'ratio'), { status: 'no_occurrence' })
})

test('cộng dồn và lấy giá trị gần nhất trong kỳ', () => {
  const records = [
    { month: 1, status: 'collected', value: 2 },
    { month: 2, status: 'not_due' },
    { month: 3, status: 'collected', value: 5 },
  ]
  assert.deepEqual(summarizeMonths(records, [1, 2, 3], 'sum'), { status: 'available', value: 7 })
  assert.deepEqual(summarizeMonths(records, [1, 2, 3], 'last'), { status: 'available', value: 5, month: 3 })
})

test('cả năm cần đủ 12 tháng và tính từ số liệu gốc', () => {
  const months = Array.from({ length: 12 }, (_, index) => index + 1)
  const records = months.map(month => ({ month, status: 'collected', numerator: month, denominator: month + 1 }))
  assert.deepEqual(summarizeMonths(records.slice(0, 11), months, 'ratio'), { status: 'missing', months: [12] })
  const result = summarizeMonths(records, months, 'ratio')
  assert.equal(result.numerator, 78)
  assert.equal(result.denominator, 90)
})

test('không tổng hợp dữ liệu sai hoặc trùng tháng', () => {
  assert.deepEqual(summarizeMonths([{ month: 1, status: 'collected', numerator: 1, denominator: 0 }], [1], 'ratio'), { status: 'invalid' })
  assert.deepEqual(summarizeMonths([{ month: 1, status: 'not_due' }, { month: 1, status: 'no_occurrence' }], [1], 'sum'), { status: 'invalid' })
})

test('cho phép số âm chỉ khi chỉ tiêu cho phép, dùng cho chênh lệch thu chi', () => {
  const records = [{ month: 1, status: 'collected', value: -12 }]
  assert.deepEqual(summarizeMonths(records, [1], 'last'), { status: 'invalid' })
  assert.deepEqual(summarizeMonths(records, [1], 'last', true), { status: 'available', value: -12, month: 1 })
})
