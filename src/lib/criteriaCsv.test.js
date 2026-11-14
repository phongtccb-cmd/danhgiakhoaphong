import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseCriteriaCsv } from './criteriaCsv.js'

const csv = readFileSync(new URL('../../Tieu_chi_danh_gia_Quy_IV_2026_03_nhom.csv', import.meta.url), 'utf8')

test('đọc CSV đúng cột kể cả dấu phẩy và ngoặc kép trong nội dung', () => {
  const { criteria, references } = parseCriteriaCsv(csv)
  assert.equal(criteria.length, 43)
  assert.equal(references.length, 2)
  assert.equal(criteria.filter(item => item.group === 'functional').length, 8)
  assert.equal(criteria.filter(item => item.group === 'clinical').length, 20)
  assert.equal(criteria.filter(item => item.group === 'paraclinical').length, 15)
  assert.equal(criteria.filter(item => item.allowNegative).length, 2)
  const report = criteria.find(item => item.code === 'K1.02' && item.group === 'clinical')
  assert.equal(report.denominatorLabel, 'Báo cáo đến hạn')
  assert.equal(criteria.find(item => item.code === 'K3.03').threshold, 'Cân bằng')
  assert.equal(criteria.find(item => item.code === 'K2.08').method, 'rate')
})

test('dùng mã tiêu chí xác định ổn định, duy nhất và hợp lệ cho Firestore', () => {
  const { criteria } = parseCriteriaCsv(csv)
  assert.equal(new Set(criteria.map(item => item.id)).size, criteria.length)
  assert.ok(criteria.every(item => /^[A-Za-z0-9]{20}$/.test(item.id)))
  assert.ok(criteria.every(item => ['ratio', 'rate', 'last'].includes(item.method)))
})

test('trọng số 5 lĩnh vực trong tệp cộng đủ 100%', () => {
  const { criteria } = parseCriteriaCsv(csv)
  const weights = new Map(criteria.map(item => [item.domain, Number(item.weight.replace('%', ''))]))
  assert.deepEqual(Object.fromEntries(weights), {
    management: 19,
    quality: 24,
    finance: 20,
    staff: 17,
    safety: 20,
  })
  assert.equal([...weights.values()].reduce((sum, weight) => sum + weight, 0), 100)
})

test('báo lỗi khi thiếu cột hoặc nhóm chưa được hỗ trợ', () => {
  assert.throws(() => parseCriteriaCsv('x,y\n1,2'), /Thiếu cột bắt buộc/)
  const invalid = csv.replace('Phòng ban + Dược', 'Khối khác')
  assert.throws(() => parseCriteriaCsv(invalid), /Nhóm hoặc lĩnh vực chưa hỗ trợ/)
})
