const namesByGroup = {
  functional: [
    'Phòng Tổ chức cán bộ',
    'Phòng Hành chính quản trị',
    'Phòng Tài chính - Kế toán',
    'Phòng Điều dưỡng',
    'Phòng Kế hoạch tổng hợp',
    'Phòng Vật tư, thiết bị y tế',
    'Phòng Quản lý chất lượng',
    'Phòng Công tác xã hội',
    'Phòng Công nghệ thông tin',
    'Phòng Chỉ đạo tuyến – Đào tạo và Nghiên cứu khoa học',
    'Khoa Dược',
  ],
  clinical: [
    'Khoa Khám bệnh',
    'Khoa Cấp cứu',
    'Khoa Hồi sức tích cực và chống độc',
    'Khoa Nội tổng hợp',
    'Khoa Ngoại tổng hợp',
    'Khoa Gây mê hồi sức',
    'Khoa Nhi',
    'Khoa Sản',
    'Khoa Mắt',
    'Khoa Da liễu',
    'Khoa Tai Mũi Họng',
    'Khoa Răng Hàm Mặt',
    'Khoa Nội tiết',
    'Khoa Nội thần kinh',
    'Khoa Điều trị dịch vụ theo yêu cầu',
    'Khoa Nội thận - Thận nhân tạo',
    'Khoa Ung Bướu',
    'Khoa Tiết niệu - Nam khoa',
    'Khoa Ngoại thần kinh',
    'Khoa Phẫu thuật - Tạo hình thẩm mỹ',
    'Khoa Nội Tim mạch - Lão học',
    'Khoa Ngoại Lồng ngực mạch máu',
    'Khoa Hồi sức tim và tim mạch can thiệp',
    'Khoa Chấn thương chỉnh hình',
    'Khoa Dinh dưỡng',
    'Khoa Y học cổ truyền',
    'Khoa Vật lý trị liệu - Phục hồi chức năng',
    'Khoa Tâm thể',
    'Khoa Hồi sức tích cực Nhi - Sơ sinh',
    'Cơ sở Linh Tây',
    'Cơ sở Linh Xuân',
  ],
  paraclinical: [
    'Khoa Kiểm soát nhiễm khuẩn',
    'Khoa Chẩn đoán hình ảnh',
    'Khoa Huyết học truyền máu',
    'Khoa Hóa sinh',
    'Khoa Vi sinh',
    'Khoa Giải phẫu bệnh',
    'Khoa Thăm dò chức năng',
  ],
}

export const officialUnits = Object.entries(namesByGroup)
  .flatMap(([group, names]) => names.map(name => ({ name, group })))
  .map((unit, index) => ({ ...unit, id: `U${String(index + 1).padStart(19, '0')}` }))

export function normalizeUnitName(name) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
}

export function planUnitImport(existingUnits) {
  const expected = new Map(officialUnits.map(unit => [normalizeUnitName(unit.name), unit]))
  const seen = new Set()
  const errors = []
  for (const unit of existingUnits) {
    if (typeof unit.name !== 'string') {
      errors.push(`Đơn vị ${unit.id} không có tên hợp lệ.`)
      continue
    }
    const key = normalizeUnitName(unit.name)
    const match = expected.get(key)
    if (!match) errors.push(`Tên chưa khớp danh mục: ${unit.name}.`)
    else if (unit.group !== match.group) errors.push(`Sai nhóm: ${unit.name}.`)
    if (seen.has(key)) errors.push(`Tên bị trùng: ${unit.name}.`)
    seen.add(key)
  }
  return {
    errors,
    missing: officialUnits.filter(unit => !seen.has(normalizeUnitName(unit.name))),
  }
}
