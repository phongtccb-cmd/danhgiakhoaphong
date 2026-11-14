import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { addDoc, collection, doc, getDocs, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { ADMIN_UID, auth, db } from '../firebase'
import { normalizeUnitName, officialUnits, planUnitImport } from '../lib/officialUnits'
import './SharedData.css'

const groups = {
  functional: 'Phòng chức năng và khoa Dược',
  clinical: 'Khoa lâm sàng và cơ sở',
  paraclinical: 'Khoa cận lâm sàng',
}

function usePublicData() {
  const [data, setData] = useState({ periods: [], units: [], indicators: [], scores: [] })
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

  return { data, error, loading: loaded.length < 4 }
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

function MasterForm({ title, name, items, isUnit = false }) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [group, setGroup] = useState('functional')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function choose(value) {
    setId(value)
    const item = items.find(entry => entry.id === value)
    setLabel(item?.name || '')
    setGroup(item?.group || 'functional')
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      setMessage('Tên không được để trống.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const value = isUnit ? { name: trimmed, group } : { name: trimmed }
      if (id) await setDoc(doc(db, name, id), value)
      else await addDoc(collection(db, name), value)
      setId('')
      setLabel('')
      setGroup('functional')
      setMessage('Đã lưu.')
    } catch (err) {
      setMessage(`Không thể lưu: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="shared-card shared-form" onSubmit={submit}>
      <h4>{title}</h4>
      <label>Chọn để sửa
        <select value={id} onChange={event => choose(event.target.value)}>
          <option value="">Thêm mới</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>Tên<input value={label} maxLength={200} onChange={event => setLabel(event.target.value)} required /></label>
      {isUnit && <label>Nhóm
        <select value={group} onChange={event => setGroup(event.target.value)}>
          {Object.entries(groups).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select>
      </label>}
      <button disabled={busy} type="submit">{busy ? 'Đang lưu…' : 'Lưu'}</button>
      {message && <p role="status">{message}</p>}
    </form>
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
        {Object.entries(groups).map(([group, title]) => <div key={group}>
          <h4>{title}</h4>
          <ul>{officialUnits.filter(unit => unit.group === group).map(unit => <li key={unit.id}>{unit.name}</li>)}</ul>
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

function ScoreForm({ data, user, allowedUnits }) {
  const [periodId, setPeriodId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [indicatorId, setIndicatorId] = useState('')
  const [value, setValue] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [revision, setRevision] = useState(null)

  const score = data.scores.find(item => item.periodId === periodId && item.unitId === unitId && item.indicatorId === indicatorId)

  useEffect(() => {
    setDirty(false)
    setMessage('')
  }, [periodId, unitId, indicatorId])

  useEffect(() => {
    if (dirty) return
    setValue(score ? String(score.value) : '')
    setEvidenceUrl(score?.evidenceUrl || '')
    setNote(score?.note || '')
    setRevision(score ? { exists: true, timestamp: score.updatedAt ?? null } : { exists: false })
  }, [periodId, unitId, indicatorId, dirty, score?.value, score?.evidenceUrl, score?.note, score?.updatedAt])

  async function submit(event) {
    event.preventDefault()
    const number = Number(value)
    if (!periodId || !unitId || !indicatorId || value.trim() === '' || !Number.isFinite(number) || number < 0 || number > 100) {
      setMessage('Chọn kỳ, đơn vị, chỉ tiêu và nhập điểm từ 0 đến 100.')
      return
    }
    if (evidenceUrl && !/^https?:\/\/\S+$/i.test(evidenceUrl)) {
      setMessage('Liên kết minh chứng phải bắt đầu bằng http:// hoặc https:// và không có khoảng trắng.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const scoreRef = doc(db, 'scores', `${periodId}_${unitId}_${indicatorId}`)
      await runTransaction(db, async transaction => {
        const latest = await transaction.get(scoreRef)
        const latestTimestamp = latest.exists() ? latest.data().updatedAt : null
        if (!revision || latest.exists() !== revision.exists ||
          (revision.exists && (!revision.timestamp || !latestTimestamp?.isEqual(revision.timestamp)))) {
          throw new Error('Dữ liệu đã thay đổi ở nơi khác. Chọn lại kỳ, đơn vị hoặc chỉ tiêu để tải bản mới trước khi lưu.')
        }
        transaction.set(scoreRef, {
          periodId, unitId, indicatorId, value: number,
          evidenceUrl: evidenceUrl.trim(), note: note.trim(), updatedAt: serverTimestamp(),
        })
      })
      setDirty(false)
      setMessage('Đã lưu lên Firestore.')
    } catch (err) {
      setMessage(`Không thể lưu điểm: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null
  return (
    <form className="shared-card shared-form" onSubmit={submit}>
      <h3>Nhập điểm và minh chứng</h3>
      <p>Điểm chỉ tiêu tạm dùng thang 0–100; chưa tự động tính tổng hoặc xếp loại. Nội dung được công khai.</p>
      {allowedUnits.length === 0 && <p>Chưa được phân quyền đơn vị. Liên hệ quản trị viên.</p>}
      <label>Kỳ đánh giá<select value={periodId} onChange={event => setPeriodId(event.target.value)} required>
        <option value="">Chọn kỳ</option>{data.periods.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Đơn vị<select value={unitId} onChange={event => setUnitId(event.target.value)} required>
        <option value="">Chọn đơn vị</option>{allowedUnits.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Chỉ tiêu<select value={indicatorId} onChange={event => setIndicatorId(event.target.value)} required>
        <option value="">Chọn chỉ tiêu</option>{data.indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Điểm<input type="number" min="0" max="100" step="any" value={value} onChange={event => { setDirty(true); setValue(event.target.value) }} required /></label>
      <label>Liên kết minh chứng<input type="url" maxLength={2048} value={evidenceUrl} onChange={event => { setDirty(true); setEvidenceUrl(event.target.value) }} placeholder="https://" /></label>
      <label>Ghi chú<textarea maxLength={2000} value={note} onChange={event => { setDirty(true); setNote(event.target.value) }} /></label>
      <button type="submit" disabled={busy || allowedUnits.length === 0}>{busy ? 'Đang lưu…' : 'Lưu điểm'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}

export default function SharedData() {
  const { data, error, loading: dataLoading } = usePublicData()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unitIds, setUnitIds] = useState([])
  const [accessError, setAccessError] = useState('')

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
  const allowedUnits = isAdmin ? data.units : data.units.filter(unit => unitIds.includes(unit.id))
  const nameOf = (items, id) => items.find(item => item.id === id)?.name || 'Không tìm thấy'

  return (
    <section className="shared-data section">
      <div className="container">
        <div className="section-title">
          <h2>Dữ liệu đánh giá</h2>
          <p>Dữ liệu và liên kết minh chứng tại đây được công khai; không nhập thông tin nhạy cảm.</p>
        </div>
        <Login user={user} loading={loading} />
        {(error || accessError) && <p className="shared-error" role="alert">{error || accessError}</p>}
        {dataLoading && !error && <p>Đang tải dữ liệu…</p>}
        {isAdmin && (
          <div className="admin-area">
            <h3>Quản trị dữ liệu</h3>
            {!dataLoading && !error && <UnitImport units={data.units} />}
            <div className="admin-grid">
              <MasterForm title="Kỳ đánh giá" name="periods" items={data.periods} />
              <MasterForm title="Đơn vị" name="units" items={data.units} isUnit />
              <MasterForm title="Chỉ tiêu" name="indicators" items={data.indicators} />
              <AccessForm units={data.units} />
            </div>
          </div>
        )}
        {!dataLoading && !error && <ScoreForm data={data} user={user} allowedUnits={allowedUnits} />}
        {!dataLoading && !error && (
          <div className="shared-card">
            <h3>Danh mục công khai</h3>
            <div className="public-catalog">
              <div><h4>Kỳ đánh giá</h4>{data.periods.length ? <ul>{data.periods.map(item => <li key={item.id}>{item.name}</li>)}</ul> : <p>Chưa có kỳ đánh giá.</p>}</div>
              <div><h4>Đơn vị</h4>{data.units.length ? <ul>{data.units.map(item => <li key={item.id}>{item.name} — {groups[item.group] || 'Chưa xác định nhóm'}</li>)}</ul> : <p>Chưa có danh sách chính thức.</p>}</div>
              <div><h4>Chỉ tiêu</h4>{data.indicators.length ? <ul>{data.indicators.map(item => <li key={item.id}>{item.name}</li>)}</ul> : <p>Chưa có bộ chỉ tiêu chính thức.</p>}</div>
            </div>
          </div>
        )}
        <div className="shared-card">
          <h3>Kết quả đã lưu</h3>
          {dataLoading || error ? <p>Không thể hiển thị kết quả khi dữ liệu chưa tải đầy đủ.</p> : data.scores.length === 0 ? <p>Chưa có điểm được công bố.</p> : (
            <div className="score-list">
              {data.scores.map(item => (
                <article className="score-item" key={item.id}>
                  <strong>{nameOf(data.units, item.unitId)} · {nameOf(data.indicators, item.indicatorId)}</strong>
                  <span>{nameOf(data.periods, item.periodId)} · {item.value}/100</span>
                  {item.note && <span>{item.note}</span>}
                  {/^https?:\/\/\S+$/i.test(item.evidenceUrl) && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Xem minh chứng</a>}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
