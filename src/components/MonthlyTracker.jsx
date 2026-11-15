import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { ADMIN_UID, auth, db } from '../firebase'
import { monthsForPeriod, summarizePeriod } from '../lib/monitoring'
import { normalizeUnitName, officialUnits } from '../lib/officialUnits'
import { benchmarkReferences, criterionDomains, officialCriteria } from '../lib/officialCriteria'
import { buildScorebook, isSingleValuePercentage, rankCompleteUnits } from '../lib/scoring'
import './SharedData.css'

const domains = {
  management: 'Quản lý tổ chức và chuyển đổi số',
  quality: 'Chất lượng chuyên môn và trải nghiệm',
  finance: 'Tài chính – kinh tế',
  staff: 'Nhân sự, đào tạo và nghiên cứu',
  safety: 'An toàn và môi trường',
}
const methods = { ratio: 'Tỷ lệ (tử số/mẫu số × 100%)', rate: 'Số liệu trên một đơn vị mẫu số', sum: 'Cộng dồn', last: 'Giá trị gần nhất trong kỳ' }
const statuses = {
  collected: 'Đã nhập số liệu',
  missing: 'Thiếu dữ liệu',
  not_due: 'Chưa đến kỳ đo',
  no_occurrence: 'Không phát sinh',
}
const groups = {
  functional: 'Phòng chức năng và khoa Dược',
  clinical: 'Khoa lâm sàng và cơ sở',
  paraclinical: 'Khoa cận lâm sàng',
}
const groupTargets = { functional: 11, clinical: 31, paraclinical: 7 }
const domainWeights = { management: 19, quality: 24, finance: 20, staff: 17, safety: 20 }

function useMonitoringData() {
  const [data, setData] = useState({ units: [], monitorIndicators: [], monitorAssignments: [], monthlyRecords: [] })
  const [loaded, setLoaded] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const subscriptions = ['units', 'monitorIndicators', 'monitorAssignments', 'monthlyRecords'].map(name =>
      onSnapshot(collection(db, name), snapshot => {
        setData(current => ({ ...current, [name]: snapshot.docs.map(item => ({ id: item.id, ...item.data() })) }))
        setLoaded(current => current.includes(name) ? current : [...current, name])
      }, err => setError(`Không thể tải dữ liệu ${name}: ${err.message}`)),
    )
    return () => subscriptions.forEach(unsubscribe => unsubscribe())
  }, [])

  return { data, loading: loaded.length < 4, error }
}

function MonitoringAdmin({ data }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('management')
  const [method, setMethod] = useState('ratio')
  const [source, setSource] = useState('')
  const [unit, setUnit] = useState('')
  const [unitId, setUnitId] = useState('')
  const [indicatorId, setIndicatorId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function createIndicator(event) {
    event.preventDefault()
    if (!name.trim()) {
      setMessage('Tên chỉ tiêu không được để trống.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await addDoc(collection(db, 'monitorIndicators'), { name: name.trim(), domain, method, source: source.trim(), unit: unit.trim() })
      setName('')
      setSource('')
      setUnit('')
      setMessage('Đã thêm chỉ tiêu theo dõi.')
    } catch (err) {
      setMessage(`Không thể thêm chỉ tiêu: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function assignIndicator(event) {
    event.preventDefault()
    if (!unitId || !indicatorId) {
      setMessage('Chọn đơn vị và chỉ tiêu.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const ref = doc(db, 'monitorAssignments', `${unitId}_${indicatorId}`)
      await runTransaction(db, async transaction => {
        if ((await transaction.get(ref)).exists()) throw new Error('Chỉ tiêu đã được gán cho đơn vị này.')
        transaction.set(ref, { unitId, indicatorId })
      })
      setMessage('Đã gán chỉ tiêu cho đơn vị.')
    } catch (err) {
      setMessage(`Không thể gán chỉ tiêu: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shared-card">
      <h3>Cấu hình theo dõi</h3>
      <p>Định nghĩa và phạm vi áp dụng không thể sửa hoặc xóa trên giao diện sau khi tạo. Nếu nhập nhầm, cần quản trị viên xử lý dữ liệu có kiểm soát trước khi dùng.</p>
      <div className="admin-grid">
        <form className="shared-card shared-form" onSubmit={createIndicator}>
          <h4>Thêm chỉ tiêu</h4>
          <label>Tên chỉ tiêu<input value={name} onChange={event => setName(event.target.value)} maxLength={200} required /></label>
          <label>Lĩnh vực<select value={domain} onChange={event => setDomain(event.target.value)}>
            {Object.entries(domains).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select></label>
          <label>Quy tắc tổng hợp<select value={method} onChange={event => setMethod(event.target.value)}>
            {Object.entries(methods).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select></label>
          <label>Nguồn dữ liệu dự kiến<input value={source} onChange={event => setSource(event.target.value)} maxLength={500} /></label>
          <label>Đơn vị tính của số liệu gốc<input value={unit} onChange={event => setUnit(event.target.value)} maxLength={60} placeholder="Ví dụ: hồ sơ, lượt, ngày" /></label>
          <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Thêm chỉ tiêu'}</button>
        </form>
        <form className="shared-card shared-form" onSubmit={assignIndicator}>
          <h4>Gán chỉ tiêu cho đơn vị</h4>
          <label>Đơn vị<select value={unitId} onChange={event => setUnitId(event.target.value)} required>
            <option value="">Chọn đơn vị</option>{data.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select></label>
          <label>Chỉ tiêu<select value={indicatorId} onChange={event => setIndicatorId(event.target.value)} required>
            <option value="">Chọn chỉ tiêu</option>{data.monitorIndicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Gán chỉ tiêu'}</button>
        </form>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  )
}

function MonthlyForm({ unitId, indicator, criterion, year, records, mayEdit }) {
  const [month, setMonth] = useState('01')
  const [status, setStatus] = useState('collected')
  const [numerator, setNumerator] = useState('')
  const [denominator, setDenominator] = useState('')
  const [value, setValue] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [note, setNote] = useState('')
  const [revision, setRevision] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const current = records.find(item => item.month === month)

  useEffect(() => {
    setDirty(false)
    setMessage('')
  }, [unitId, indicator?.id, year, month])

  useEffect(() => {
    if (dirty) return
    setStatus(current?.status || 'collected')
    setNumerator(current?.numerator == null ? '' : String(current.numerator))
    setDenominator(current?.denominator == null ? '' : String(current.denominator))
    setValue(current?.value == null ? '' : String(current.value))
    setEvidenceUrl(current?.evidenceUrl || '')
    setNote(current?.note || '')
    setRevision(current ? { exists: true, timestamp: current.updatedAt ?? null } : { exists: false })
  }, [unitId, indicator?.id, year, month, dirty, current?.status, current?.numerator, current?.denominator, current?.value, current?.evidenceUrl, current?.note, current?.updatedAt])

  async function submit(event) {
    event.preventDefault()
    const number = value.trim() === '' ? NaN : Number(value)
    const num = numerator.trim() === '' ? NaN : Number(numerator)
    const den = denominator.trim() === '' ? NaN : Number(denominator)
    if (!unitId || !indicator || !/^(20\d{2}|2100)$/.test(year)) {
      setMessage('Chọn đơn vị, chỉ tiêu và năm từ 2000 đến 2100.')
      return
    }
    if (status === 'collected' && (indicator.method === 'ratio' || indicator.method === 'rate'
      ? !Number.isFinite(num) || num < 0 || !Number.isFinite(den) || den <= 0
      : !Number.isFinite(number) || (!indicator.allowNegative && number < 0))) {
      setMessage(indicator.allowNegative
        ? 'Nhập số liệu dạng số hợp lệ; mẫu số của tỷ lệ phải lớn hơn 0.'
        : 'Nhập số không âm; mẫu số của tỷ lệ phải lớn hơn 0.')
      return
    }
    if (evidenceUrl && !/^https?:\/\/\S+$/i.test(evidenceUrl)) {
      setMessage('Liên kết minh chứng phải là địa chỉ http hoặc https, không chứa khoảng trắng.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const ref = doc(db, 'monthlyRecords', `${unitId}_${indicator.id}_${year}_${month}`)
      await runTransaction(db, async transaction => {
        const latest = await transaction.get(ref)
        const timestamp = latest.exists() ? latest.data().updatedAt : null
        if (!revision || latest.exists() !== revision.exists ||
          (revision.exists && (!revision.timestamp || !timestamp?.isEqual(revision.timestamp)))) {
          throw new Error('Số liệu đã thay đổi ở nơi khác. Chọn lại tháng để tải số liệu mới.')
        }
        transaction.set(ref, {
          unitId, indicatorId: indicator.id, year, month, status,
          numerator: status === 'collected' && ['ratio', 'rate'].includes(indicator.method) ? num : null,
          denominator: status === 'collected' && ['ratio', 'rate'].includes(indicator.method) ? den : null,
          value: status === 'collected' && !['ratio', 'rate'].includes(indicator.method) ? number : null,
          evidenceUrl: evidenceUrl.trim(), note: note.trim(), updatedAt: serverTimestamp(),
        })
      })
      setDirty(false)
      setMessage('Đã lưu số liệu tháng.')
    } catch (err) {
      setMessage(`Không thể lưu số liệu: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!mayEdit || !indicator) return null
  const update = setter => event => { setDirty(true); setter(event.target.value) }
  return (
    <form className="shared-card shared-form" onSubmit={submit}>
      <h3>Nhập số liệu tháng</h3>
      <p>Số liệu tạm thời, chưa được xác nhận hoặc khóa kỳ; được công khai ngay khi lưu.</p>
      <label>Tháng<select value={month} onChange={event => setMonth(event.target.value)}>
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map(item => <option key={item} value={item}>{item}</option>)}
      </select></label>
      <label>Trạng thái<select value={status} onChange={update(setStatus)}>
        {Object.entries(statuses).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select></label>
      {status === 'collected' && (indicator.method === 'ratio' || indicator.method === 'rate' ? <>
        <label>Tử số<input type="number" step="any" min="0" value={numerator} onChange={update(setNumerator)} required /></label>
        <label>Mẫu số<input type="number" step="any" min="0" value={denominator} onChange={update(setDenominator)} required /></label>
      </> : <label>Giá trị{criterion && isSingleValuePercentage(criterion) ? ' (%)' : ''}<input type="number" step="any" min={indicator.allowNegative ? undefined : '0'} value={value} onChange={update(setValue)} required /></label>)}
      <label>Liên kết minh chứng<input type="url" maxLength={2048} value={evidenceUrl} onChange={update(setEvidenceUrl)} placeholder="https://" /></label>
      <label>Ghi chú<textarea maxLength={2000} value={note} onChange={update(setNote)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu số liệu tháng'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}

function formatSummary(summary, method, criterion) {
  if (summary.status === 'invalid') return 'Dữ liệu hoặc phương pháp không hợp lệ; cần kiểm tra trước khi tổng hợp.'
  if (summary.status === 'missing') return summary.quarters
    ? `Chưa đủ dữ liệu quý ${summary.quarters.join(', ')}`
    : `Chưa đủ dữ liệu: tháng ${summary.months.join(', ')}`
  if (summary.status === 'not_due') return 'Chưa đến kỳ đo'
  if (summary.status === 'no_occurrence') return method === 'ratio'
    ? 'Không phát sinh; không tính tỷ lệ khi mẫu số bằng 0'
    : 'Không phát sinh số liệu'
  const value = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(summary.value)
  if (method === 'ratio') return `${summary.numerator}/${summary.denominator} = ${value}%`
  if (method === 'rate') return `${summary.numerator}/${summary.denominator} = ${value}`
  if (method === 'last') {
    const period = summary.quarter ? `Quý ${summary.quarter}, ` : ''
    return `${value}${criterion && isSingleValuePercentage(criterion) ? '%' : ''} (${period}tháng ${summary.month})`
  }
  return value
}

function formatPoints(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

function describeScore(score, maximum) {
  if (!score || score.value === null) return 'Chưa xác định'
  return `${score.complete ? '' : 'Tạm tính: '}${formatPoints(score.value)}/${maximum} điểm`
}

function scoreProgress(score) {
  if (!score) return ''
  return score.reference
    ? `${score.determined}/${score.total} đơn vị đủ điểm lĩnh vực`
    : `${score.determined}/${score.total} tiêu chí đã xác định`
}

function describeTotalScore(score) {
  if (!score || score.totalScore === null) return 'Chưa đủ dữ liệu'
  return `${score.totalComplete ? '' : 'Tạm tính: '}${formatPoints(score.totalScore)}/100 điểm`
}

function describeRank(rank) {
  return rank ? `Hạng ${rank.rank}/${rank.eligibleCount}` : 'Chưa xếp hạng (điểm chưa đủ)'
}

function scoreTarget(criterion) {
  if (!criterion.threshold) return 'Chưa xác định'
  if ((criterion.method === 'ratio' || isSingleValuePercentage(criterion)) &&
    /^-?\d+(?:\.\d+)?$/.test(criterion.threshold)) {
    return `${criterion.direction} ${formatPoints(Number(criterion.threshold) * 100)}%`
  }
  return `${criterion.direction || ''} ${criterion.threshold}`.trim()
}

function UnitTable({ title, units, target, onSelect, scores, rankings, validYear }) {
  const sorted = [...units].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  return (
    <div className="shared-card monitoring-group">
      <h3>{title} ({units.length}{target != null && `/${target}`})</h3>
      {units.length === 0 ? <p>Chưa có đơn vị trong danh mục.</p> : (
        <div className="monitoring-table-scroll" tabIndex="0" aria-label={`Bảng ${title}, cuộn ngang để xem các cột`}>
          <table className="monitoring-table">
            <thead><tr>
              <th scope="col">Khoa phòng</th>
              <th scope="col">Tổng điểm / 100</th>
              <th scope="col">Thứ hạng trong nhóm</th>
              {Object.entries(domains).map(([key, text]) => <th scope="col" key={key}>{text}<br />{domainWeights[key]}%</th>)}
            </tr></thead>
            <tbody>{sorted.map(unit => {
              const unitScore = scores[unit.id]
              return <tr key={unit.id}>
                <th scope="row"><button type="button" className="monitoring-unit-link" onClick={() => onSelect(unit.id)}>{unit.name}</button></th>
                <td>{validYear ? describeTotalScore(unitScore) : '—'}</td>
                <td>{validYear ? describeRank(rankings[unit.id]) : '—'}</td>
                {Object.keys(domains).map(key => {
                  const score = unitScore?.[key]
                  return <td key={key}>
                    <span>{validYear ? describeScore(score, domainWeights[key]) : '—'}</span>
                    {validYear && score && <small className="monitoring-progress">{scoreProgress(score)}</small>}
                  </td>
                })}
              </tr>
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function MonthlyTracker() {
  const { data, error, loading } = useMonitoringData()
  const [user, setUser] = useState(null)
  const [unitIds, setUnitIds] = useState([])
  const [accessError, setAccessError] = useState('')
  const [unitId, setUnitId] = useState('')
  const [indicatorId, setIndicatorId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [period, setPeriod] = useState(`quarter${Math.floor(new Date().getMonth() / 3) + 1}`)

  useEffect(() => onAuthStateChanged(auth, setUser, err => setAccessError(`Không thể kiểm tra tài khoản: ${err.message}`)), [])
  useEffect(() => {
    setUnitIds([])
    setAccessError('')
    if (!user || user.uid === ADMIN_UID) return undefined
    return onSnapshot(doc(db, 'access', user.uid), snapshot => {
      setUnitIds(snapshot.exists() ? snapshot.data().unitIds : [])
    }, err => setAccessError(`Không thể tải phân quyền: ${err.message}`))
  }, [user])

  const assigned = data.monitorAssignments.filter(item => item.unitId === unitId)
  const indicators = data.monitorIndicators.filter(item => assigned.some(entry => entry.indicatorId === item.id))
  const indicator = indicators.find(item => item.id === indicatorId)
  const records = data.monthlyRecords.filter(item => item.unitId === unitId && item.indicatorId === indicatorId && item.year === year)
  const validYear = /^(20\d{2}|2100)$/.test(year)
  const months = period === 'year' ? [] : monthsForPeriod(period)
  const summary = indicator ? summarizePeriod(records, period, indicator) : null
  const scores = useMemo(() => validYear ? buildScorebook({
    units: data.units,
    indicators: data.monitorIndicators,
    assignments: data.monitorAssignments,
    records: data.monthlyRecords,
    criteria: officialCriteria,
    references: benchmarkReferences,
    domains: criterionDomains,
    officialUnits,
    year,
    period,
  }) : {}, [data, year, period, validYear])
  const rankings = useMemo(() => rankCompleteUnits(data.units, scores), [data.units, scores])
  const mayEdit = user && (user.uid === ADMIN_UID || unitIds.includes(unitId))
  const selectedUnit = data.units.find(item => item.id === unitId)
  const selectedScores = scores[unitId] || {}
  const selectedCriterion = officialCriteria.find(item => item.id === indicatorId && item.group === selectedUnit?.group)
  const ungroupedUnits = data.units.filter(item => !Object.hasOwn(groups, item.group))

  return (
    <section className="shared-data section">
      <div className="container">
        <div className="section-title">
          <h2>Theo dõi định kỳ</h2>
        </div>
        {(error || accessError) && <p className="shared-error" role="alert">{error || accessError}</p>}
        {loading && !error && <p>Đang tải dữ liệu theo dõi…</p>}
        {!loading && !error && <>
          <div className="shared-card shared-form month-controls">
            <label>Năm<input type="number" min="2000" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label>
            <label>Kỳ theo dõi<select value={period} onChange={event => setPeriod(event.target.value)}>
              <option value="quarter1">Quý I</option><option value="quarter2">Quý II</option><option value="quarter3">Quý III</option><option value="quarter4">Quý IV</option>
              <option value="year">Cả năm</option>
            </select></label>
            {!validYear && <p className="shared-error">Nhập năm từ 2000 đến 2100.</p>}
            <p>{period === 'year'
              ? 'Kết quả năm được tổng hợp từ 4 quý; mỗi quý được tính từ số liệu các tháng thuộc quý đó.'
              : 'Kết quả quý được tổng hợp từ số liệu các tháng thuộc quý đã chọn.'} Phương pháp tổng hợp một số tiêu chí chưa được phê duyệt; cần rà soát trước khi sử dụng chính thức.</p>
          </div>
          <p>Tổng điểm là tổng điểm 5 lĩnh vực. Xếp hạng riêng theo từng nhóm, chỉ áp dụng khi đủ điểm cả 5 lĩnh vực; đồng điểm cùng hạng.</p>
          {!selectedUnit && <>
            <h3>Danh sách khoa phòng</h3>
            {Object.entries(groups).map(([key, title]) => (
              <UnitTable key={key} title={title} target={groupTargets[key]} units={data.units.filter(item => item.group === key)} onSelect={id => { setUnitId(id); setIndicatorId('') }} scores={scores} rankings={rankings} validYear={validYear} />
            ))}
            {ungroupedUnits.length > 0 && <UnitTable title="Chưa xác định nhóm" units={ungroupedUnits} onSelect={id => { setUnitId(id); setIndicatorId('') }} scores={scores} rankings={rankings} validYear={validYear} />}
            {user?.uid === ADMIN_UID && <details className="shared-card"><summary>Cấu hình theo dõi</summary><MonitoringAdmin data={data} /></details>}
          </>}
          {selectedUnit && <>
          <div className="shared-card monitoring-detail-header">
            <button type="button" onClick={() => { setUnitId(''); setIndicatorId('') }}>← Danh sách khoa phòng</button>
            <h3>{selectedUnit.name}</h3>
            <p>{groups[selectedUnit.group] || 'Chưa xác định nhóm'}</p>
            {normalizeUnitName(selectedUnit.name) === normalizeUnitName('Khoa Nội tổng hợp') &&
              <p>Khoa Truyền nhiễm chưa hình thành nhân sự, hiện ghép chung tại Khoa Nội tổng hợp; chưa là đơn vị đánh giá riêng.</p>}
            <p>Số liệu tháng dùng chung với mục Dữ liệu đánh giá. Điểm dựa trên ngưỡng số và chiều đạt rõ trong CSV; ngưỡng còn thiếu hoặc chưa rõ không tự chấm. Chưa có quy định điểm cộng/trừ.</p>
            {selectedUnit.group === 'functional' && <p>Điểm tham chiếu Tài chính và An toàn là trung bình điểm cùng lĩnh vực của các đơn vị lâm sàng và cận lâm sàng đủ điểm; chưa đủ 38 đơn vị thì chỉ là tạm tính.</p>}
            <p><strong>Tổng điểm:</strong> {describeTotalScore(selectedScores)}</p>
            <p><strong>Thứ hạng trong nhóm:</strong> {describeRank(rankings[selectedUnit.id])}</p>
            <div className="monitoring-domain-grid">
              {Object.entries(domains).map(([key, text]) => <div className="score-item" key={key}>
                <strong>{text} · {domainWeights[key]} điểm</strong>
                <span>{validYear ? describeScore(selectedScores[key], domainWeights[key]) : 'Chưa xác định'}</span>
                {validYear && selectedScores[key] && <span>{scoreProgress(selectedScores[key])}</span>}
                {validYear && selectedScores[key]?.results && <span>
                  Mỗi tiêu chí: {domainWeights[key]} / {selectedScores[key].total} = {formatPoints(domainWeights[key] / selectedScores[key].total)} điểm tối đa
                </span>}
              </div>)}
            </div>
            <p>Điểm cộng: Chưa có quy định · Điểm trừ: Chưa có quy định</p>
          </div>
          <div className="shared-card shared-form">
            <h3>Chọn phạm vi theo dõi</h3>
            {!user && <p>Để nhập số liệu, đăng nhập tại mục Dữ liệu đánh giá.</p>}
            <label>Chỉ tiêu<select value={indicatorId} onChange={event => setIndicatorId(event.target.value)}>
              <option value="">Chọn chỉ tiêu đã áp dụng</option>{indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            {unitId && indicators.length === 0 && <p>Chưa có chỉ tiêu được gán cho đơn vị này; không tự coi là 0 điểm.</p>}
            {indicator && <p>{domains[indicator.domain]} · {methods[indicator.method]}{indicator.unit && ` · Đơn vị số liệu gốc: ${indicator.unit}`}{indicator.source && ` · Nguồn: ${indicator.source}`}</p>}
          </div>
          {validYear && <div className="shared-card">
            <h3>Chỉ tiêu đã gán</h3>
            {Object.values(selectedScores).flatMap(score => score.results || []).filter(result =>
              result.reason === 'Chưa gán hoặc định nghĩa không khớp CSV'
            ).map(result => <p className="shared-error" key={result.criterion.id}>
              {result.criterion.code} · {result.criterion.name}: {result.reason}.
            </p>)}
            {indicators.length === 0 ? <p>Chưa có chỉ tiêu được gán cho đơn vị.</p> : <div className="score-list">
              {indicators.map(item => {
                const indicatorRecords = data.monthlyRecords.filter(record => record.unitId === unitId && record.indicatorId === item.id && record.year === year)
                const result = summarizePeriod(indicatorRecords, period, item)
                const scored = selectedScores[item.domain]?.results?.find(entry => entry.criterion.id === item.id)
                return <div className="score-item" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{domains[item.domain] || 'Chưa xác định lĩnh vực'} · {methods[item.method] || 'Phương pháp không hợp lệ'}</span>
                  <span>Tổng hợp tạm tính: {formatSummary(result, item.method, scored?.criterion)}</span>
                  {scored && <span>Ngưỡng CSV: {scoreTarget(scored.criterion)}</span>}
                  <span>{scored
                    ? scored.status === 'pending'
                      ? `Chưa xác định (${scored.reason}); tối đa ${formatPoints(scored.maximum)} điểm`
                      : `${scored.status === 'achieved' ? 'Đạt' : 'Không đạt'}: ${formatPoints(scored.points)}/${formatPoints(scored.maximum)} điểm`
                    : 'Chưa có quy định chấm điểm cho chỉ tiêu ngoài CSV'}</span>
                  <button type="button" onClick={() => setIndicatorId(item.id)}>Xem số liệu tháng</button>
                </div>
              })}
            </div>}
          </div>}
          {indicator && validYear && <div className="shared-card">
            <h3>{period === 'year' ? 'Kết quả năm (tổng hợp 4 quý)' : 'Kết quả quý'}</h3>
            <p>{formatSummary(summary, indicator.method, selectedCriterion)}</p>
            <div className="score-list">
              {period === 'year'
                ? [1, 2, 3, 4].map(quarter => {
                    const quarterPeriod = `quarter${quarter}`
                    return <div key={quarter} className="score-item">
                      <strong>Quý {quarter}: {formatSummary(summarizePeriod(records, quarterPeriod, indicator), indicator.method, selectedCriterion)}</strong>
                    </div>
                  })
                : months.map(month => {
                    const item = records.find(record => Number(record.month) === month)
                    return <div key={month} className="score-item">
                      <strong>Tháng {month}: {item ? statuses[item.status] : 'Chưa nhập — thiếu dữ liệu'}</strong>
                      {item?.status === 'collected' && <span>{['ratio', 'rate'].includes(indicator.method) ? `${item.numerator}/${item.denominator}` : `${item.value}${selectedCriterion && isSingleValuePercentage(selectedCriterion) ? '%' : ''}`}</span>}
                      {item?.note && <span>{item.note}</span>}
                      {item?.evidenceUrl && /^https?:\/\/\S+$/i.test(item.evidenceUrl) && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Xem minh chứng</a>}
                    </div>
                  })}
            </div>
          </div>}
          {validYear && <MonthlyForm unitId={unitId} indicator={indicator} criterion={selectedCriterion} year={year} records={records} mayEdit={mayEdit} />}
          </>}
        </>}
      </div>
    </section>
  )
}
