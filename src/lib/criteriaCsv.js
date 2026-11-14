const domainKeys = new Map([
  ['Quản lý tổ chức và chuyển đổi số', 'management'],
  ['Chất lượng chuyên môn và trải nghiệm người bệnh', 'quality'],
  ['Tài chính – kinh tế', 'finance'],
  ['Nhân sự, đào tạo và nghiên cứu khoa học', 'staff'],
  ['An toàn người bệnh và môi trường y tế', 'safety'],
])

const groupKeys = new Map([
  ['Phòng ban + Dược', 'functional'],
  ['Lâm sàng', 'clinical'],
  ['Cận lâm sàng', 'paraclinical'],
])

const groupPrefixes = { functional: 'F', clinical: 'C', paraclinical: 'P' }

function parseRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some(value => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  if (row.some(value => value.trim())) rows.push(row)
  return rows
}

export function parseCriteriaCsv(text) {
  const rows = parseRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('Tệp tiêu chí không có dữ liệu.')
  const headers = rows[0]
  const indexOf = name => headers.indexOf(name)
  const required = ['Khối đơn vị', 'Khía cạnh đánh giá', 'Trọng số khía cạnh', 'Loại dòng', 'Mã', 'Tiêu chí đề xuất']
  if (required.some(name => indexOf(name) < 0)) throw new Error('Thiếu cột bắt buộc trong tệp tiêu chí.')

  const criteria = []
  const references = []
  const counts = { functional: 0, clinical: 0, paraclinical: 0 }

  for (const cells of rows.slice(1)) {
    const get = name => (cells[indexOf(name)] || '').trim()
    const group = groupKeys.get(get('Khối đơn vị'))
    const domain = domainKeys.get(get('Khía cạnh đánh giá'))
    if (!group || !domain) throw new Error(`Nhóm hoặc lĩnh vực chưa hỗ trợ: ${get('Khối đơn vị')} / ${get('Khía cạnh đánh giá')}.`)
    const criterion = {
      group,
      domain,
      weight: get('Trọng số khía cạnh'),
      type: get('Loại dòng'),
      code: get('Mã'),
      name: get('Tiêu chí đề xuất'),
      numeratorLabel: get('Tử số hoặc số liệu chính'),
      denominatorLabel: get('Mẫu số hoặc dữ liệu đối chiếu'),
      direction: get('Chiều đạt'),
      threshold: get('Ngưỡng đạt'),
      source: get('Nguồn số liệu dự kiến'),
      owner: get('Đầu mối dự kiến'),
      measureNote: get('Quy tắc đo và nội dung cần chốt'),
      reviewNote: get('Ý kiến rà soát'),
      allowNegative: get('Tiêu chí đề xuất').toLocaleLowerCase('vi').includes('chênh lệch thu - chi'),
    }

    if (criterion.type === 'Điểm tham chiếu') {
      references.push(criterion)
      continue
    }
    if (criterion.type !== 'Tiêu chí') throw new Error(`Loại dòng chưa hỗ trợ: ${criterion.type}.`)
    if (!criterion.code || !criterion.name) throw new Error('Tiêu chí thiếu mã hoặc tên.')
    counts[group] += 1
    criterion.method = criterion.code === 'K2.08'
      ? 'rate'
      : criterion.numeratorLabel && criterion.denominatorLabel ? 'ratio' : 'last'
    criterion.id = `I${groupPrefixes[group]}${String(counts[group]).padStart(18, '0')}`
    criteria.push(criterion)
  }

  if (!criteria.length) throw new Error('Không tìm thấy tiêu chí đo lường trong tệp.')
  return { criteria, references }
}
