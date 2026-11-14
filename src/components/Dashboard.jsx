import { BarChart3, Users, PieChart } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  const departmentCategories = [
    { name: 'Phòng chức năng & khoa Dược', detail: '10 phòng chức năng + 1 khoa Dược', count: 11, color: '#3b82f6' },
    { name: 'Khoa lâm sàng & cơ sở', detail: '29 khoa lâm sàng + 2 cơ sở', count: 31, color: '#10b981' },
    { name: 'Khoa cận lâm sàng', detail: 'Không bao gồm khoa Dược', count: 7, color: '#f59e0b' },
  ]
  const total = departmentCategories.reduce((sum, dept) => sum + dept.count, 0)
  const metricsData = [
    { label: 'Phòng, khoa, cơ sở', value: total, icon: Users, color: '#0066cc' },
    { label: 'Nhóm đơn vị', value: departmentCategories.length, icon: PieChart, color: '#f59e0b' },
    { label: 'Lĩnh vực đánh giá', value: 6, icon: BarChart3, color: '#10b981' },
  ]

  return (
    <section className="dashboard section">
      <div className="container">
        <div className="section-title">
          <h2>Tổng quan đánh giá</h2>
          <p>Phạm vi và nhóm đơn vị của bệnh viện</p>
        </div>
        <div className="metrics-grid">
          {metricsData.map(metric => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="metric-card" style={{borderLeftColor: metric.color}}>
                <div className="metric-icon" style={{backgroundColor: metric.color}}>
                  <Icon size={28} color="white" />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>03 nhóm đơn vị</h3>
            <div className="department-list">
              {departmentCategories.map(dept => (
                <div key={dept.name} className="department-item">
                  <div className="dept-info">
                    <div className="dept-color" style={{backgroundColor: dept.color}} />
                    <div>
                      <div className="dept-name">{dept.name}: {dept.count}</div>
                      <div className="dept-count">{dept.detail}</div>
                    </div>
                  </div>
                  <div className="dept-bar">
                    <div className="dept-fill" style={{width: (dept.count / total * 100) + '%', backgroundColor: dept.color}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dashboard-card">
            <h3>Mục tiêu phân nhóm</h3>
            <div className="result-grid">
              <div className="result-item group-a"><div className="result-percent">20%</div><div className="result-name">Xuất sắc</div></div>
              <div className="result-item group-b"><div className="result-percent">30%</div><div className="result-name">Hoàn thành tốt</div></div>
              <div className="result-item group-c"><div className="result-percent">50%</div><div className="result-name">Còn lại</div></div>
            </div>
            <p className="dashboard-note">Đây là mục tiêu phân nhóm, không phải kết quả đã đánh giá. Cách áp dụng tỷ lệ và làm tròn theo từng nhóm cần được phê duyệt; ngưỡng điểm không tự bảo đảm các tỷ lệ này.</p>
          </div>
        </div>
        <div className="dashboard-card">
          <h3>Dữ liệu thực tế</h3>
          <p>Dữ liệu từ báo cáo và phần mềm của bệnh viện cần được thu thập, đối chiếu và xác nhận trước khi tính điểm. Chưa hiển thị kết quả khi chưa có số liệu được xác nhận.</p>
        </div>
      </div>
    </section>
  )
}
