import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore'
import { ADMIN_UID, auth, db } from '../firebase'
import { normalizeUnitName, officialUnits, planUnitImport } from '../lib/officialUnits'
import { benchmarkReferences, criterionDomains, criterionGroups, officialCriteria } from '../lib/officialCriteria'
import './SharedData.css'

const monthlyStatusLabels = {
  missing: 'Thiếu dữ liệu',
  not_due: 'Chưa đến kỳ đo',
  no_occurrence: 'Không phát sinh',
}

function usePublicData() {
  const [data, setData] = useState({ units: [], monitorIndicators: [], monitorAssignments: [] })
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState([])

  useEffect(() => {
    const unsubscribe = Object.keys(data).map(name => onSnapshot(
      collection(db, name),
      snapshot => {
        setData(current => ({
          ...current,
          [name]: snapshot.docs.map(item => ({ id: item.id, ...item.data() })),
        }))
        setLoaded(current => current.includes(name) ? current : [...current, name])
      },
      err => setError(`Không thể tải ${name}: ${err.message}`),
    ))
    return () => unsubscribe.forEach(stop => stop())
  }, [])

  return { data, error, loading: loaded.length < 3 }
}

function useUnitMonthlyRecords(unitId) {
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRecords([])
    setError('')
    if (!unitId) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    return onSnapshot(query(collection(db, 'monthlyRecords'), where('unitId', '==', unitId)), snapshot => {
      setRecords(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
      setLoading(false)
    }, err => {
      setError(`Không thể tải số liệu tháng của đơn vị: ${err.message}`)
      setLoading(false)
    })
  }, [unitId])

  return { records, error, loading }
}

function Login({ user, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setPassword('')
    } catch (err) {
      setError(`Đăng nhập không thành công: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setError('')
    try {
      await signOut(auth)
    } catch (err) {
      setError(`Không thể đăng xuất: ${err.message}`)
    }
  }

  return (
    <div className="shared-card">
      <h3>Tài khoản</h3>
      {loading ? <p>Đang kiểm tra đăng nhập…</p> : user ? (
        <div className="account-row">
          <span>Đã đăng nhập: {user.email}</span>
          <button type="button" onClick={logout}>Đăng xuất</button>
        </div>
      ) : (
        <form className="login-form" onSubmit={submit}>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
          <button type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        </form>
      )}
      {!user && !loading && <p>Tài khoản do quản trị viên tạo; người chưa đăng nhập chỉ có quyền xem.</p>}
      {error && <p className="shared-error" role="alert">{error}</p>}
    </div>
  )
}

function UnitImport({ units }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = planUnitImport(units)

  async function submit() {
    setBusy(true)
    setMessage('')
    try {
      const snapshot = await getDocs(collection(db, 'units'))
      const current = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      const plan = planUnitImport(current)
      if (plan.errors.length) throw new Error(plan.errors.join(' '))
      if (!plan.missing.length) {
        setMessage('Danh mục đã có đủ 49 đơn vị khớp tên và nhóm; không có dữ liệu cần thêm.')
        return
      }
      let added = 0
      await runTransaction(db, async transaction => {
        const refs = plan.missing.map(unit => doc(db, 'units', unit.id))
        const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)))
        const newUnits = []
        snapshots.forEach((item, index) => {
          const unit = plan.missing[index]
          if (!item.exists()) newUnits.push({ ref: refs[index], unit })
          else {
            const value = item.data()
            if (typeof value.name !== 'string' || normalizeUnitName(value.name) !== normalizeUnitName(unit.name) || value.group !== unit.group) {
              throw new Error(`Mã của ${unit.name} đã được dùng cho đơn vị khác; dừng để kiểm tra.`)
            }
          }
        })
        newUnits.forEach(({ ref, unit }) => transaction.set(ref, { name: unit.name, group: unit.group }))
        added = newUnits.length
      })
      setMessage(`Đã thêm ${added} đơn vị còn thiếu. Kiểm tra lại danh mục và phân quyền sau khi nhập.`)
    } catch (err) {
      setMessage(`Không thể nhập danh mục: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="shared-card">
      <summary>Nhập danh sách 49 đơn vị từ Quyết định 949</summary>
      <p>Đối chiếu 11 phòng chức năng và Dược, 31 khoa lâm sàng và cơ sở, 7 khoa cận lâm sàng. Khoa Truyền nhiễm tạm ghép Khoa Nội tổng hợp, không tạo đơn vị riêng.</p>
      <p>Chỉ thêm đơn vị còn thiếu; không sửa, xóa hoặc thay mã đơn vị đã có. Đối chiếu tên và nhóm trước khi nhập, tránh thao tác nhập danh mục đồng thời ở nơi khác.</p>
      <details>
        <summary>Xem danh sách dự kiến</summary>
        {criterionGroups.map(group => <div key={group.key}>
          <h4>{group.name}</h4>
          <ul>{officialUnits.filter(unit => unit.group === group.key).map(unit => <li key={unit.id}>{unit.name}</li>)}</ul>
        </div>)}
      </details>
      {preview.errors.length > 0 ? <div className="shared-error" role="alert">
        <p>Danh mục hiện có cần được đối chiếu trước khi nhập:</p>
        <ul>{preview.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
      </div> : <p>Còn thiếu {preview.missing.length}/49 đơn vị theo tên và nhóm.</p>}
      <button type="button" disabled={busy || preview.errors.length > 0} onClick={submit}>
        {busy ? 'Đang kiểm tra và nhập…' : 'Thêm các đơn vị còn thiếu'}
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  )
}

function AccessForm({ units }) {
  const [uid, setUid] = useState('')
  const [unitIds, setUnitIds] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [accessFailed, setAccessFailed] = useState(false)

  useEffect(() => {
    setUnitIds([])
    setMessage('')
    setAccessFailed(false)
    if (!uid.trim() || uid.trim().includes('/') || uid.trim().length > 128) {
      setLoadingAccess(false)
      return undefined
    }
    setLoadingAccess(true)
    return onSnapshot(doc(db, 'access', uid.trim()), snapshot => {
      setUnitIds(snapshot.exists() ? snapshot.data().unitIds : [])
      setLoadingAccess(false)
    }, err => {
      setAccessFailed(true)
      setLoadingAccess(false)
      setMessage(`Không thể tải quyền: ${err.message}`)
    })
  }, [uid])

  async function submit(event) {
    event.preventDefault()
    if (!uid.trim() || uid.includes('/') || uid.trim().length > 128) {
      setMessage('UID không hợp lệ.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await setDoc(doc(db, 'access', uid.trim()), { unitIds })
      setMessage('Đã lưu quyền. Danh sách trống nghĩa là không được sửa đơn vị nào.')
    } catch (err) {
      setMessage(`Không thể lưu quyền: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="shared-card shared-form" onSubmit={submit}>
      <h4>Cấp quyền theo đơn vị</h4>
      <p>Tạo tài khoản Email/Password trong Firebase Authentication trước, sau đó nhập UID của tài khoản tại đây.</p>
      <label>UID tài khoản<input value={uid} onChange={event => setUid(event.target.value)} required /></label>
      {loadingAccess && <p>Đang tải quyền hiện có…</p>}
      <fieldset disabled={loadingAccess || accessFailed || !uid.trim()}>
        <legend>Đơn vị được phép sửa</legend>
        {units.length === 0 && <p>Chưa có đơn vị để phân quyền.</p>}
        {units.map(unit => (
          <label className="checkbox-label" key={unit.id}>
            <input type="checkbox" checked={unitIds.includes(unit.id)} onChange={event => setUnitIds(current =>
              event.target.checked ? [...current, unit.id] : current.filter(id => id !== unit.id)
            )} />
            {unit.name}
          </label>
        ))}
      </fieldset>
      <button disabled={busy || loadingAccess || accessFailed} type="submit">{busy ? 'Đang lưu…' : 'Lưu phân quyền'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}

function CriteriaImport({ units, indicators, assignments }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const unitPlan = planUnitImport(units)

  async function importCriteria() {
    setBusy(true)
    setMessage('')
    try {
      const currentUnits = (await getDocs(collection(db, 'units'))).docs.map(item => ({ id: item.id, ...item.data() }))
      const plan = planUnitImport(currentUnits)
      if (plan.errors.length || plan.missing.length) {
        throw new Error(plan.errors.join(' ') || `Còn thiếu ${plan.missing.length} đơn vị trong danh mục.`)
      }

      const [indicatorSnapshot, assignmentSnapshot] = await Promise.all([
        getDocs(collection(db, 'monitorIndicators')),
        getDocs(collection(db, 'monitorAssignments')),
      ])
      const currentIndicators = new Map(indicatorSnapshot.docs.map(item => [item.id, item.data()]))
      const currentAssignments = new Map(assignmentSnapshot.docs.map(item => [item.id, item.data()]))
      const writes = []
      let missingDefinitions = 0
      let missingAssignments = 0
      for (const criterion of officialCriteria) {
        const definition = {
          name: `${criterion.code} ${criterion.name}`,
          domain: criterion.domain,
          method: criterion.method,
          source: criterion.source,
          unit: '',
          allowNegative: criterion.allowNegative,
        }
        const existing = currentIndicators.get(criterion.id)
        if (existing) {
          if (Object.keys(definition).some(key => existing[key] !== definition[key])) {
            throw new Error(`Định nghĩa ${criterion.code} đã tồn tại nhưng khác tệp CSV; cần rà soát trước khi tiếp tục.`)
          }
        } else {
          writes.push({ ref: doc(db, 'monitorIndicators', criterion.id), value: definition })
          missingDefinitions += 1
        }
      }

      for (const unit of currentUnits) {
        const applicable = officialCriteria.filter(criterion => criterion.group === unit.group)
        for (const criterion of applicable) {
          const id = `${unit.id}_${criterion.id}`
          const existing = currentAssignments.get(id)
          if (existing) {
            if (existing.unitId !== unit.id || existing.indicatorId !== criterion.id) {
              throw new Error(`Phạm vi gán ${criterion.code} cho ${unit.name} không khớp; cần rà soát.`)
            }
          } else {
            writes.push({ ref: doc(db, 'monitorAssignments', id), value: { unitId: unit.id, indicatorId: criterion.id } })
            missingAssignments += 1
          }
        }
      }

      for (let offset = 0; offset < writes.length; offset += 400) {
        const batch = writeBatch(db)
        writes.slice(offset, offset + 400).forEach(({ ref, value }) => batch.set(ref, value))
        await batch.commit()
      }
      setMessage(writes.length
        ? `Đã thêm ${missingDefinitions} định nghĩa và ${missingAssignments} phân công còn thiếu. Nạp lại trang nếu danh mục chưa cập nhật.`
        : 'Bộ tiêu chí và phạm vi gán đã đầy đủ; không có dữ liệu cần thêm.')
    } catch (err) {
      setMessage(`Không thể nạp bộ tiêu chí: ${err.message} Nếu đã nạp một phần, kiểm tra lại rồi chạy lại; thao tác chỉ bổ sung mục còn thiếu.`)
    } finally {
      setBusy(false)
    }
  }

  const existingCriterionCount = officialCriteria.filter(item => indicators.some(entry => entry.id === item.id)).length
  const expectedAssignments = units.reduce((total, unit) =>
    total + officialCriteria.filter(item => item.group === unit.group).length, 0)
  const existingAssignmentCount = assignments.filter(item => {
    const unit = units.find(entry => entry.id === item.unitId)
    return unit && officialCriteria.some(criterion => criterion.id === item.indicatorId && criterion.group === unit.group)
  }).length

  return (
    <details className="shared-card">
      <summary>Nạp tiêu chí và phân công theo CSV</summary>
      <p>Nguồn: Tieu_chi_danh_gia_Quy_IV_2026_03_nhom.csv · {officialCriteria.length} tiêu chí đo lường · {benchmarkReferences.length} dòng điểm tham chiếu không phải chỉ tiêu nhập số liệu.</p>
      <p>Trọng số theo tệp: 19% + 24% + 20% + 17% + 20% = 100%. Chức năng chỉ bổ sung định nghĩa và gán theo nhóm; không ghi đè hay xóa cấu hình và số liệu hiện có.</p>
      {unitPlan.errors.length > 0 && <div className="shared-error" role="alert">
        <p>Rà soát danh mục đơn vị trước khi nạp:</p>
        <ul>{unitPlan.errors.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </div>}
      {unitPlan.missing.length > 0 && <p>Cần đủ danh mục 49 đơn vị trước khi nạp bộ tiêu chí (còn thiếu {unitPlan.missing.length}).</p>}
      <p>Tiêu chí hiện có: {existingCriterionCount}/{officialCriteria.length} · Phân công hiện có: {existingAssignmentCount}/{expectedAssignments}</p>
      <button type="button" disabled={busy || unitPlan.errors.length > 0 || unitPlan.missing.length > 0} onClick={importCriteria}>
        {busy ? 'Đang nạp…' : 'Nạp tiêu chí CSV và gán theo nhóm'}
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  )
}

function formatCriterionTarget(criterion) {
  if (!criterion.threshold) return 'Chưa xác định trong tệp'
  if (criterion.threshold.toLocaleLowerCase('vi') === 'cân bằng') return 'Cân bằng'
  if (criterion.method === 'ratio' && Number.isFinite(Number(criterion.threshold))) {
    return `${criterion.direction || 'Chưa xác định'} ${(Number(criterion.threshold) * 100).toLocaleString('vi-VN')}%`
  }
  return `${criterion.direction || 'Chưa xác định'} ${criterion.threshold}`
}

function MonthlyCriterion({ criterion, record, unitId, year, month, mayEdit }) {
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

  useEffect(() => {
    if (dirty) return
    setStatus(record?.status || 'collected')
    setNumerator(record?.numerator == null ? '' : String(record.numerator))
    setDenominator(record?.denominator == null ? '' : String(record.denominator))
    setValue(record?.value == null ? '' : String(record.value))
    setEvidenceUrl(record?.evidenceUrl || '')
    setNote(record?.note || '')
    setRevision(record ? { exists: true, timestamp: record.updatedAt ?? null } : { exists: false })
  }, [record, dirty])

  useEffect(() => {
    setDirty(false)
    setMessage('')
  }, [unitId, criterion.id, year, month])

  function update(setter) {
    return event => {
      setDirty(true)
      setter(event.target.value)
    }
  }

  async function submit(event) {
    event.preventDefault()
    const numeratorValue = numerator.trim() === '' ? NaN : Number(numerator)
    const denominatorValue = denominator.trim() === '' ? NaN : Number(denominator)
    const numericValue = value.trim() === '' ? NaN : Number(value)
    if (status === 'collected' && (criterion.method === 'ratio' || criterion.method === 'rate'
      ? !Number.isFinite(numeratorValue) || numeratorValue < 0 || !Number.isFinite(denominatorValue) || denominatorValue <= 0
      : !Number.isFinite(numericValue))) {
      setMessage(['ratio', 'rate'].includes(criterion.method)
        ? 'Nhập tử số không âm và mẫu số lớn hơn 0.'
        : 'Nhập số liệu dạng số hợp lệ.')
      return
    }
    if (evidenceUrl && !/^https?:\/\/\S+$/i.test(evidenceUrl)) {
      setMessage('Liên kết minh chứng phải là địa chỉ http hoặc https, không chứa khoảng trắng.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const id = `${unitId}_${criterion.id}_${year}_${month}`
      const ref = doc(db, 'monthlyRecords', id)
      await runTransaction(db, async transaction => {
        const latest = await transaction.get(ref)
        const timestamp = latest.exists() ? latest.data().updatedAt : null
        if (!revision || latest.exists() !== revision.exists ||
          (revision.exists && (!revision.timestamp || !timestamp?.isEqual(revision.timestamp)))) {
          throw new Error('Số liệu đã thay đổi ở nơi khác. Chọn lại tháng để tải số liệu mới.')
        }
        transaction.set(ref, {
          unitId,
          indicatorId: criterion.id,
          year,
          month,
          status,
          numerator: status === 'collected' && ['ratio', 'rate'].includes(criterion.method) ? numeratorValue : null,
          denominator: status === 'collected' && ['ratio', 'rate'].includes(criterion.method) ? denominatorValue : null,
          value: status === 'collected' && !['ratio', 'rate'].includes(criterion.method) ? numericValue : null,
          evidenceUrl: evidenceUrl.trim(),
          note: note.trim(),
          updatedAt: serverTimestamp(),
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

  const ratioValue = record?.status === 'collected' && ['ratio', 'rate'].includes(criterion.method) && record.denominator > 0
    ? record.numerator / record.denominator * (criterion.method === 'ratio' ? 100 : 1)
    : null
  const result = record?.status === 'collected'
    ? ['ratio', 'rate'].includes(criterion.method)
      ? `${record.numerator}/${record.denominator} = ${ratioValue?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${criterion.method === 'ratio' ? '%' : ''}`
      : String(record.value)
    : monthlyStatusLabels[record?.status] || 'Chưa nhập số liệu'
  const hasGuideline = criterion.threshold && ['≥', '>=', '≤', '<=', '>', '<'].includes(criterion.direction)

  return (
    <article className="score-item criterion-entry">
      <div className="criterion-heading">
        <strong>{criterion.code} · {criterion.name}</strong>
        <span>Trọng số lĩnh vực: {criterion.weight}</span>
      </div>
      <p><strong>Số liệu hiện tại ({month}/{year}):</strong> {result}</p>
      <p><strong>Ngưỡng tham khảo trong CSV:</strong> {formatCriterionTarget(criterion)}</p>
      {hasGuideline && <p>Chưa tự động kết luận đạt/chưa đạt; cần phê duyệt công thức và xác nhận dữ liệu.</p>}
      {(criterion.numeratorLabel || criterion.denominatorLabel) && <p>
        {criterion.numeratorLabel && `Tử số/số liệu: ${criterion.numeratorLabel}`}
        {criterion.numeratorLabel && criterion.denominatorLabel && ' · '}
        {criterion.denominatorLabel && `Mẫu số/đối chiếu: ${criterion.denominatorLabel}`}
      </p>}
      {criterion.source && <p><strong>Nguồn:</strong> {criterion.source}</p>}
      {criterion.owner && <p><strong>Đầu mối:</strong> {criterion.owner}</p>}
      {(criterion.measureNote || criterion.reviewNote) && <p><strong>Nội dung cần rà soát:</strong> {[criterion.measureNote, criterion.reviewNote].filter(Boolean).join(' · ')}</p>}
      {record?.note && <p><strong>Ghi chú tháng:</strong> {record.note}</p>}
      {record?.evidenceUrl && /^https?:\/\/\S+$/i.test(record.evidenceUrl) &&
        <a href={record.evidenceUrl} target="_blank" rel="noopener noreferrer">Xem minh chứng</a>}
      {mayEdit ? <details className="criterion-edit">
        <summary>{record ? 'Cập nhật số liệu tháng' : 'Nhập số liệu tháng'}</summary>
        <form className="shared-form" onSubmit={submit}>
          <label>Trạng thái<select value={status} onChange={update(setStatus)}>
            <option value="collected">Đã nhập số liệu</option>
            <option value="missing">Thiếu dữ liệu</option>
            <option value="not_due">Chưa đến kỳ đo</option>
            <option value="no_occurrence">Không phát sinh</option>
          </select></label>
          {status === 'collected' && (criterion.method === 'ratio' || criterion.method === 'rate' ? <>
            <label>{criterion.numeratorLabel || 'Tử số'}<input type="number" step="any" min="0" value={numerator} onChange={update(setNumerator)} required /></label>
            <label>{criterion.denominatorLabel || 'Mẫu số'}<input type="number" step="any" min="0" value={denominator} onChange={update(setDenominator)} required /></label>
          </> : <label>{criterion.numeratorLabel || 'Số liệu chính'}<input type="number" step="any" value={value} onChange={update(setValue)} required /></label>)}
          <label>Liên kết minh chứng<input type="url" maxLength={2048} value={evidenceUrl} onChange={update(setEvidenceUrl)} placeholder="https://" /></label>
          <label>Ghi chú<textarea maxLength={2000} value={note} onChange={update(setNote)} /></label>
          <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu số liệu tháng'}</button>
          {message && <p role="status">{message}</p>}
        </form>
      </details> : <p>Chưa có quyền nhập số liệu cho tiêu chí này.</p>}
    </article>
  )
}

export default function SharedData() {
  const { data, error, loading: dataLoading } = usePublicData()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unitIds, setUnitIds] = useState([])
  const [accessError, setAccessError] = useState('')
  const [unitId, setUnitId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const { records: monthlyRecords, error: monthlyError, loading: monthlyLoading } = useUnitMonthlyRecords(unitId)

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current)
    setLoading(false)
  }, err => {
    setAccessError(`Không thể kiểm tra tài khoản: ${err.message}`)
    setLoading(false)
  }), [])

  useEffect(() => {
    setUnitIds([])
    setAccessError('')
    if (!user || user.uid === ADMIN_UID) return undefined
    return onSnapshot(doc(db, 'access', user.uid), snapshot => {
      setUnitIds(snapshot.exists() ? snapshot.data().unitIds : [])
    }, err => setAccessError(`Không thể tải phân quyền: ${err.message}`))
  }, [user])

  const isAdmin = user?.uid === ADMIN_UID
  const selectedUnit = data.units.find(unit => unit.id === unitId)
  const mayEdit = isAdmin || unitIds.includes(unitId)
  const assignedIndicatorIds = new Set(data.monitorAssignments
    .filter(assignment => assignment.unitId === unitId)
    .map(assignment => assignment.indicatorId))
  const unitCriteria = selectedUnit
    ? officialCriteria.filter(item => item.group === selectedUnit.group)
    : []
  const criterionRecords = monthlyRecords.filter(record =>
    record.unitId === unitId && record.year === year && record.month === month)
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))

  return (
    <section className="shared-data section">
      <div className="container">
        <div className="section-title">
          <h2>Dữ liệu đánh giá</h2>
          <p>Bộ tiêu chí theo CSV, cập nhật số liệu từng tháng. Dữ liệu và liên kết minh chứng được công khai; không nhập thông tin nhạy cảm.</p>
        </div>
        <Login user={user} loading={loading} />
        {(error || accessError) && <p className="shared-error" role="alert">{error || accessError}</p>}
        {dataLoading && !error && <p>Đang tải dữ liệu…</p>}
        {isAdmin && (
          <div className="admin-area">
            <h3>Cấu hình quản trị</h3>
            {!dataLoading && !error && <UnitImport units={data.units} />}
            {!dataLoading && !error && <CriteriaImport units={data.units} indicators={data.monitorIndicators} assignments={data.monitorAssignments} />}
            <div className="admin-grid">
              <AccessForm units={data.units} />
            </div>
          </div>
        )}
        {!dataLoading && !error && !selectedUnit && <section aria-labelledby="unit-groups-heading">
          <div className="shared-card">
            <h3 id="unit-groups-heading">Danh sách theo 3 nhóm</h3>
            <p>{data.units.length}/49 đơn vị có trong danh mục. Chọn khoa/phòng để xem tiêu chí và cập nhật số liệu tháng.</p>
            <div className="criteria-domain-summary">
              {criterionDomains.map(domain => <div className="score-item" key={domain.key}>
                <strong>{domain.name}</strong><span>Trọng số đề xuất: {domain.weight}%</span>
              </div>)}
            </div>
          </div>
          {criterionGroups.map(group => {
            const units = data.units.filter(unit => unit.group === group.key).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
            const target = group.key === 'functional' ? 11 : group.key === 'clinical' ? 31 : 7
            return <section className="shared-card unit-group-area" key={group.key}>
              <h3>{group.name} ({units.length}/{target})</h3>
              <p>{group.description}</p>
              {units.length ? <div className="unit-picker">
                {units.map(unit => <button
                  type="button"
                  className="unit-picker-button"
                  aria-pressed={false}
                  key={unit.id}
                  onClick={() => setUnitId(unit.id)}
                >{unit.name}</button>)}
              </div> : <p>Chưa có đơn vị trong danh mục.</p>}
            </section>
          })}
        </section>}
        {!dataLoading && !error && selectedUnit && <section className="criterion-detail">
          {monthlyError && <p className="shared-error" role="alert">{monthlyError}</p>}
          <div className="shared-card">
            <button type="button" onClick={() => setUnitId('')}>← Danh sách 3 nhóm</button>
            <h3>{selectedUnit.name}</h3>
            <p>{criterionGroups.find(group => group.key === selectedUnit.group)?.name || 'Nhóm chưa xác định'}</p>
            {normalizeUnitName(selectedUnit.name) === normalizeUnitName('Khoa Nội tổng hợp') &&
              <p>Khoa Truyền nhiễm hiện ghép chung Khoa Nội tổng hợp; chưa là đơn vị đánh giá riêng.</p>}
            <div className="shared-form month-controls">
              <label>Năm<input type="number" min="2000" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label>
              <label>Tháng<select value={month} onChange={event => setMonth(event.target.value)}>
                {monthOptions.map(item => <option key={item} value={item}>{item}</option>)}
              </select></label>
            </div>
            <p>Điểm, xếp loại và kết luận đạt/chưa đạt chưa tự động tính. Ngưỡng và nội dung được trình bày theo CSV để đối chiếu.</p>
            {monthlyLoading && <p>Đang tải số liệu tháng…</p>}
            {isAdmin && unitCriteria.some(item => !assignedIndicatorIds.has(item.id)) &&
              <p>Chưa nạp hoặc gán đủ tiêu chí cho nhóm. Quản trị viên có thể dùng mục “Nạp tiêu chí và phân công theo CSV”.</p>}
            {!mayEdit && <p>Tài khoản hiện tại chỉ xem; cần được phân quyền đơn vị để cập nhật.</p>}
          </div>
          {criterionDomains.map(domain => {
            const items = unitCriteria.filter(item => item.domain === domain.key)
            return <section className="shared-card criterion-domain" key={domain.key}>
              <h3>{domain.name} · {domain.weight}%</h3>
              {items.length ? <div className="score-list">
                {items.map(criterion => {
                  const record = criterionRecords.find(item => item.indicatorId === criterion.id)
                  const assigned = assignedIndicatorIds.has(criterion.id)
                  return <MonthlyCriterion
                    key={criterion.id}
                    criterion={criterion}
                    record={record}
                    unitId={unitId}
                    year={year}
                    month={month}
                    mayEdit={mayEdit && assigned}
                  />
                })}
              </div> : <p>Không có tiêu chí trong tệp cho lĩnh vực này.</p>}
            </section>
          })}
          {benchmarkReferences.filter(item => item.group === selectedUnit.group).length > 0 &&
            <details className="shared-card">
              <summary>Điểm tham chiếu trong CSV (không nhập số liệu tháng)</summary>
              <ul>{benchmarkReferences.filter(item => item.group === selectedUnit.group).map(item =>
                <li key={`${item.code}-${item.domain}`}>{item.code} · {item.name} — cần quy định nguồn tính trước khi áp dụng.</li>
              )}</ul>
            </details>}
        </section>}
      </div>
    </section>
  )
}
