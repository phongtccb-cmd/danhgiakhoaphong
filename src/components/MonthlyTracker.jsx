import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { ADMIN_UID, auth, db } from '../firebase'
import { summarizeMonths } from '../lib/monitoring'
import { normalizeUnitName } from '../lib/officialUnits'
import './SharedData.css'

const domains = {
  management: 'Quản lý tổ chức và chuyển đổi số',
  quality: 'Chất lượng chuyên môn và trải nghiệm',
  finance: 'Tài chính – kinh tế',
  staff: 'Nhân sự, đào tạo và nghiên cứu',
  safety: 'An toàn và môi trường',
  specific: 'Chỉ tiêu riêng',
}
const methods = { ratio: 'Gộp tử số/mẫu số (hiển thị %)', sum: 'Cộng dồn', last: 'Giá trị gần nhất trong kỳ' }
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
const domainWeights = { management: 18, quality: 23, finance: 19, staff: 16, safety: 19, specific: 5 }

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

function MonthlyForm({ unitId, indicator, year, records, mayEdit }) {
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
    if (status === 'collected' && (indicator.method === 'ratio'
      ? !Number.isFinite(num) || num < 0 || !Number.isFinite(den) || den <= 0
      : !Number.isFinite(number) || number < 0)) {
      setMessage('Nhập số không âm; mẫu số của tỷ lệ phải lớn hơn 0.')
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
          numerator: status === 'collected' && indicator.method === 'ratio' ? num : null,
          denominator: status === 'collected' && indicator.method === 'ratio' ? den : null,
          value: status === 'collected' && indicator.method !== 'ratio' ? number : null,
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
      {status === 'collected' && (indicator.method === 'ratio' ? <>
        <label>Tử số<input type="number" step="any" min="0" value={numerator} onChange={update(setNumerator)} required /></label>
        <label>Mẫu số<input type="number" step="any" min="0" value={denominator} onChange={update(setDenominator)} required /></label>
      </> : <label>Giá trị<input type="number" step="any" min="0" value={value} onChange={update(setValue)} required /></label>)}
      <label>Liên kết minh chứng<input type="url" maxLength={2048} value={evidenceUrl} onChange={update(setEvidenceUrl)} placeholder="https://" /></label>
      <label>Ghi chú<textarea maxLength={2000} value={note} onChange={update(setNote)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu số liệu tháng'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}

function formatSummary(summary, method) {
  if (summary.status === 'invalid') return 'Dữ liệu hoặc phương pháp không hợp lệ; cần kiểm tra trước khi tổng hợp.'
  if (summary.status === 'missing') return `Chưa đủ dữ liệu: tháng ${summary.months.join(', ')}`
  if (summary.status === 'not_due') return 'Chưa đến kỳ đo'
  if (summary.status === 'no_occurrence') return method === 'ratio'
    ? 'Không phát sinh; không tính tỷ lệ khi mẫu số bằng 0'
    : 'Không phát sinh số liệu'
  const value = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(summary.value)
  if (method === 'ratio') return `${summary.numerator}/${summary.denominator} = ${value}%`
  if (method === 'last') return `${value} (tháng ${summary.month})`
  return value
}

function UnitTable({ title, units, target, onSelect }) {
  const sorted = [...units].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  return (
    <div className="shared-card monitoring-group">
      <h3>{title} ({units.length}{target != null && `/${target}`})</h3>
      {units.length === 0 ? <p>Chưa có đơn vị trong danh mục.</p> : (
        <div className="monitoring-table-scroll" tabIndex="0" aria-label={`Bảng ${title}, cuộn ngang để xem các cột`}>
          <table className="monitoring-table">
            <thead><tr>
              <th scope="col">Khoa phòng</th>
              {Object.entries(domains).map(([key, text]) => <th scope="col" key={key}>{text}<br />{domainWeights[key]}%</th>)}
            </tr></thead>
            <tbody>{sorted.map(unit => <tr key={unit.id}>
              <th scope="row"><button type="button" className="monitoring-unit-link" onClick={() => onSelect(unit.id)}>{unit.name}</button></th>
              {Object.keys(domains).map(key => <td key={key} aria-label="Chưa có quy định chấm điểm">—</td>)}
            </tr>)}</tbody>
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
  const [period, setPeriod] = useState('1')

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
  const months = period === 'year' ? Array.from({ length: 12 }, (_, index) => index + 1)
    : Array.from({ length: 3 }, (_, index) => (Number(period) - 1) * 3 + index + 1)
  const summary = indicator ? summarizeMonths(records.map(item => ({ ...item, month: Number(item.month) })), months, indicator.method) : null
  const mayEdit = user && (user.uid === ADMIN_UID || unitIds.includes(unitId))
  const selectedUnit = data.units.find(item => item.id === unitId)
  const ungroupedUnits = data.units.filter(item => !Object.hasOwn(groups, item.group))

  return (
    <section className="shared-data section">
      <div className="container">
        <div className="section-title">
          <h2>Theo dõi định kỳ</h2>
          <p>Dữ liệu công khai; số liệu tổng hợp là tạm tính, chưa xác nhận, chấm điểm hay xếp hạng.</p>
        </div>
        {!selectedUnit && <details className="shared-card">
          <summary>Chỉ tiêu gợi ý tham khảo</summary>
          <p>Không tự động áp dụng; quản trị viên lựa chọn sau khi đối chiếu nhiệm vụ và nguồn dữ liệu.</p>
          <ul>
            <li>Tỷ lệ báo cáo định kỳ nộp đúng hạn.</li>
            <li>Tỷ lệ nhiệm vụ đến hạn hoàn thành đúng hạn, loại trừ các đầu việc đã có chỉ tiêu riêng.</li>
            <li>Tỷ lệ hoàn thành đào tạo bắt buộc đến hạn.</li>
            <li>Tỷ lệ hành động khắc phục an toàn hoàn thành đúng hạn.</li>
          </ul>
          <p><strong>Lâm sàng và cơ sở:</strong> tuân thủ phác đồ, khám đúng thời gian mục tiêu, tuân thủ quy trình an toàn.</p>
          <p><strong>Cận lâm sàng:</strong> trả kết quả thường quy hoặc cấp cứu đúng hạn, thông báo kết quả nguy cấp đúng quy trình, ngoại kiểm theo lịch.</p>
          <p><strong>Phòng chức năng và khoa Dược:</strong> xử lý hồ sơ đúng hạn, sai sót cấp phát thuốc, bảo trì thiết bị đúng lịch.</p>
          <p>Cần phân biệt phạm vi đo và không chấm trùng sự kiện hoặc đầu việc giữa các chỉ tiêu.</p>
        </details>}
        {(error || accessError) && <p className="shared-error" role="alert">{error || accessError}</p>}
        {loading && !error && <p>Đang tải dữ liệu theo dõi…</p>}
        {!loading && !error && <>
          {!selectedUnit && <>
            <div className="shared-card">
              <h3>Danh sách khoa phòng</h3>
              <p>Danh mục Firebase: {data.units.length}/49 đơn vị. Mục tiêu theo nhóm: 11, 31 và 7; số lượng chưa xác nhận tính chính xác của danh sách.</p>
              <p>Chọn tên đơn vị để xem chi tiết. Dấu “—” nghĩa là chưa có quy định chấm điểm, không phải 0 điểm. Trên điện thoại, cuộn ngang bảng để xem đủ 6 khía cạnh.</p>
            </div>
            {Object.entries(groups).map(([key, title]) => (
              <UnitTable key={key} title={title} target={groupTargets[key]} units={data.units.filter(item => item.group === key)} onSelect={id => { setUnitId(id); setIndicatorId('') }} />
            ))}
            {ungroupedUnits.length > 0 && <UnitTable title="Chưa xác định nhóm" units={ungroupedUnits} onSelect={id => { setUnitId(id); setIndicatorId('') }} />}
            {user?.uid === ADMIN_UID && <details className="shared-card"><summary>Cấu hình theo dõi</summary><MonitoringAdmin data={data} /></details>}
          </>}
          {selectedUnit && <>
          <div className="shared-card monitoring-detail-header">
            <button type="button" onClick={() => { setUnitId(''); setIndicatorId('') }}>← Danh sách khoa phòng</button>
            <h3>{selectedUnit.name}</h3>
            <p>{groups[selectedUnit.group] || 'Chưa xác định nhóm'}</p>
            {normalizeUnitName(selectedUnit.name) === normalizeUnitName('Khoa Nội tổng hợp') &&
              <p>Khoa Truyền nhiễm chưa hình thành nhân sự, hiện ghép chung tại Khoa Nội tổng hợp; chưa là đơn vị đánh giá riêng.</p>}
            <p>Chưa có quy định quy đổi chỉ tiêu thành điểm, ngưỡng đạt hoặc điểm cộng/trừ. Không thể xác định đạt, chưa đạt hay điểm tổng.</p>
            <div className="monitoring-domain-grid">
              {Object.entries(domains).map(([key, text]) => <div className="score-item" key={key}>
                <strong>{text} · {domainWeights[key]}%</strong><span>Điểm: Chưa có quy định</span>
              </div>)}
            </div>
            <p>Chỉ tiêu đạt: Chưa xác định · Chỉ tiêu chưa đạt: Chưa xác định</p>
            <p>Điểm cộng: Chưa có quy định · Điểm trừ: Chưa có quy định</p>
          </div>
          <div className="shared-card shared-form">
            <h3>Chọn phạm vi theo dõi</h3>
            {!user && <p>Để nhập số liệu, đăng nhập tại mục Dữ liệu đánh giá.</p>}
            <label>Chỉ tiêu<select value={indicatorId} onChange={event => setIndicatorId(event.target.value)}>
              <option value="">Chọn chỉ tiêu đã áp dụng</option>{indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            {unitId && indicators.length === 0 && <p>Chưa có chỉ tiêu được gán cho đơn vị này; không tự coi là 0 điểm.</p>}
            <label>Năm<input type="number" min="2000" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label>
            <label>Kỳ tổng hợp<select value={period} onChange={event => setPeriod(event.target.value)}>
              <option value="1">Quý I</option><option value="2">Quý II</option><option value="3">Quý III</option><option value="4">Quý IV</option><option value="year">Cả năm</option>
            </select></label>
            {!validYear && <p className="shared-error">Nhập năm từ 2000 đến 2100.</p>}
            {indicator && <p>{domains[indicator.domain]} · {methods[indicator.method]}{indicator.unit && ` · Đơn vị số liệu gốc: ${indicator.unit}`}{indicator.source && ` · Nguồn: ${indicator.source}`}</p>}
          </div>
          {validYear && <div className="shared-card">
            <h3>Chỉ tiêu đã gán</h3>
            {indicators.length === 0 ? <p>Chưa có chỉ tiêu được gán cho đơn vị.</p> : <div className="score-list">
              {indicators.map(item => {
                const indicatorRecords = data.monthlyRecords.filter(record => record.unitId === unitId && record.indicatorId === item.id && record.year === year)
                const result = summarizeMonths(indicatorRecords.map(record => ({ ...record, month: Number(record.month) })), months, item.method)
                return <div className="score-item" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{domains[item.domain] || 'Chưa xác định lĩnh vực'} · {methods[item.method] || 'Phương pháp không hợp lệ'}</span>
                  <span>Tổng hợp tạm tính: {formatSummary(result, item.method)}</span>
                  <span>Đạt/chưa đạt: Chưa có quy định</span>
                  <button type="button" onClick={() => setIndicatorId(item.id)}>Xem số liệu tháng</button>
                </div>
              })}
            </div>}
          </div>}
          {indicator && validYear && <div className="shared-card">
            <h3>Tổng hợp tạm tính</h3>
            <p>{formatSummary(summary, indicator.method)}</p>
            <div className="score-list">
              {months.map(month => {
                const item = records.find(record => Number(record.month) === month)
                return <div key={month} className="score-item">
                  <strong>Tháng {month}: {item ? statuses[item.status] : 'Chưa nhập — thiếu dữ liệu'}</strong>
                  {item?.status === 'collected' && <span>{indicator.method === 'ratio' ? `${item.numerator}/${item.denominator}` : item.value}</span>}
                  {item?.note && <span>{item.note}</span>}
                  {item?.evidenceUrl && /^https?:\/\/\S+$/i.test(item.evidenceUrl) && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Xem minh chứng</a>}
                </div>
              })}
            </div>
          </div>}
          {validYear && <MonthlyForm unitId={unitId} indicator={indicator} year={year} records={records} mayEdit={mayEdit} />}
          </>}
        </>}
      </div>
    </section>
  )
}
