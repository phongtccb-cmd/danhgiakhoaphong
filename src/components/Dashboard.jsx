import { BarChart3, PieChart, Users, TrendingUp } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  const metricsData = [
    { label: 'Khoa phòng', value: 44, icon: Users, color: '#0066cc' },
    { label: 'Lĩnh vực đánh giá', value: 6, icon: BarChart3, color: '#10b981' },
    { label: 'Chỉ tiêu cụ thể', value: '36+', icon: PieChart, color: '#f59e0b' },
    { label: 'Tăng trưởng kỳ vọng', value: '5%', icon: TrendingUp, color: '#8b5cf6' },
  ]

  const departmentCategories = [
    { name: 'Phòng chức năng', count: 10, color: '#3b82f6' },
    { name: 'Khoa lâm sàng', count: 24, color: '#10b981' },
    { name: 'Khoa cận lâm sàng', count: 8, color: '#f59e0b' },
    { name: 'Cơ sở trực thuộc', count: 2, color: '#8b5cf6' },
  ]

  return (
    <section className="dashboard section">
      <div className="container">
        <div className="section-title">
          <h2>Dashboard Tổng Quan</h2>
          <p>Các chỉ số chính của hệ thống đánh giá</p>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          {metricsData.map((metric, idx) => {
            const Icon = metric.icon
            return (
              <div key={idx} className="metric-card" style={{borderLeftColor: metric.color}}>
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

        {/* Department Distribution */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Phân loại 44 Khoa Phòng</h3>
            <div className="department-list">
              {departmentCategories.map((dept, idx) => (
                <div key={idx} className="department-item">
                  <div className="dept-info">
                    <div className="dept-color" style={{backgroundColor: dept.color}}></div>
                    <div>
                      <div className="dept-name">{dept.name}</div>
                      <div className="dept-count">{dept.count} khoa</div>
                    </div>
                  </div>
                  <div className="dept-bar">
                    <div 
                      className="dept-fill" 
                      style={{width: (dept.count / 44 * 100) + '%', backgroundColor: dept.color}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <h3>Kết quả Phân loại</h3>
            <div className="result-grid">
              <div className="result-item group-a">
                <div className="result-percent">20%</div>
                <div className="result-name">Xuất sắc</div>
                <div className="result-count">≈ 9 khoa</div>
              </div>
              <div className="result-item group-b">
                <div className="result-percent">30%</div>
                <div className="result-name">Tốt</div>
                <div className="result-count">≈ 13 khoa</div>
              </div>
              <div className="result-item group-c">
                <div className="result-percent">50%</div>
                <div className="result-name">Bình thường</div>
                <div className="result-count">≈ 22 khoa</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="dashboard-card full-width">
          <h3>Dữ liệu Baseline BV Thủ Đức (Năm 2026)</h3>
          <div className="baseline-grid">
            <div className="baseline-item">
              <div className="baseline-label">Tai nạn y khoa</div>
              <div className="baseline-value">45</div>
              <div className="baseline-unit">sự kiện/năm</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Lây nhiễm bệnh viện</div>
              <div className="baseline-value">1.2%</div>
              <div className="baseline-unit">bệnh nhân</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Hài lòng bệnh nhân</div>
              <div className="baseline-value">92%</div>
              <div className="baseline-unit">score</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Lợi nhuận</div>
              <div className="baseline-value">4.2%</div>
              <div className="baseline-unit">doanh thu</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Kỷ luật nhân viên</div>
              <div className="baseline-value">2.1%</div>
              <div className="baseline-unit">tổng số</div>
            </div>
            <div className="baseline-item">
              <div className="baseline-label">Vắng không phép</div>
              <div className="baseline-value">0.8%</div>
              <div className="baseline-unit">ngày công</div>
            </div>
          </div>
        </div>

        {/* Implementation Path */}
        <div className="implementation-path">
          <h3>Con đường triển khai</h3>
          <div className="path-timeline">
            <div className="path-item completed">
              <div className="path-marker">✅</div>
              <div className="path-label">Tháng 12.2026</div>
              <div className="path-description">Chuẩn bị & Đào tạo</div>
            </div>
            <div className="path-connector"></div>
            <div className="path-item active">
              <div className="path-marker">🔄</div>
              <div className="path-label">Quý I.2027</div>
              <div className="path-description">Thử nghiệm & Phản hồi</div>
            </div>
            <div className="path-connector"></div>
            <div className="path-item">
              <div className="path-marker">🔧</div>
              <div className="path-label">Tháng 2-3.2027</div>
              <div className="path-description">Điều chỉnh tiêu chí</div>
            </div>
            <div className="path-connector"></div>
            <div className="path-item">
              <div className="path-marker">🚀</div>
              <div className="path-label">Quý II.2027</div>
              <div className="path-description">Áp dụng chính thức</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <h3>Các con số nhanh</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-title">Chi phí lần đầu</div>
              <div className="stat-value">&lt;50 triệu</div>
              <div className="stat-desc">Setup hệ thống</div>
            </div>
            <div className="stat-box">
              <div className="stat-title">Chi phí hàng năm</div>
              <div className="stat-value">&lt;10 triệu</div>
              <div className="stat-desc">Từ năm 2 trở đi</div>
            </div>
            <div className="stat-box">
              <div className="stat-title">ROI</div>
              <div className="stat-value">100x</div>
              <div className="stat-desc">Nếu tăng doanh thu 5%</div>
            </div>
            <div className="stat-box">
              <div className="stat-title">Thời gian triển khai</div>
              <div className="stat-value">21 ngày</div>
              <div className="stat-desc">Từ chuẩn bị đến trình BGĐ</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
