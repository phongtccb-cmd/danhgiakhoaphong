import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { summarizeMonths } from './monitoring.js'

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
