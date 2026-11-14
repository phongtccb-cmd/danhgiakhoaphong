import csvText from '../../Tieu_chi_danh_gia_Quy_IV_2026_03_nhom.csv?raw'
import { parseCriteriaCsv } from './criteriaCsv'

const parsed = parseCriteriaCsv(csvText)

export const officialCriteria = parsed.criteria
export const benchmarkReferences = parsed.references

export const criterionDomains = [
  { key: 'management', name: 'Quản lý tổ chức và chuyển đổi số', weight: 19 },
  { key: 'quality', name: 'Chất lượng chuyên môn và trải nghiệm người bệnh', weight: 24 },
  { key: 'finance', name: 'Tài chính – kinh tế', weight: 20 },
  { key: 'staff', name: 'Nhân sự, đào tạo và nghiên cứu khoa học', weight: 17 },
  { key: 'safety', name: 'An toàn người bệnh và môi trường y tế', weight: 20 },
]

export const criterionGroups = [
  { key: 'functional', name: 'Phòng ban + Dược', description: '10 phòng chức năng và Khoa Dược' },
  { key: 'clinical', name: 'Lâm sàng', description: '29 khoa lâm sàng và 2 cơ sở' },
  { key: 'paraclinical', name: 'Cận lâm sàng', description: '7 khoa cận lâm sàng' },
]
