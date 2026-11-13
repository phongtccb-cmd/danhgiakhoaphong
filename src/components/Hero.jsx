import { ArrowRight, Download } from 'lucide-react'
import './Hero.css'

export default function Hero() {
  const handleDownloadPDF = () => {
    // Create a simple PDF download mock
    const link = document.createElement('a')
    link.href = '/DANH_GIA_TON_TAT_THONG_DIEP_CHINH.pdf'
    link.download = 'DANH_GIA_KHOA_PHONG_2027.pdf'
    link.click()
  }

  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          Hệ thống đánh giá hoạt động khoa phòng
        </h1>
        <p className="hero-subtitle">
          Chuẩn bị triển khai 2027 - Bệnh viện Đa khoa Thủ Đức
        </p>
        
        <p className="hero-description">
          Một hệ thống toàn diện và khách quan dựa trên 6 lĩnh vực, 36+ chỉ tiêu cụ thể, 
          tuân thủ tiêu chuẩn quốc tế (WHO, JCI, ISO) để đánh giá hoạt động của 44 khoa phòng.
        </p>

        <div className="hero-actions">
          <button className="btn-primary btn-large">
            <span>Xem chi tiết</span>
            <ArrowRight size={20} />
          </button>
          <button className="btn-secondary btn-large" onClick={handleDownloadPDF}>
            <Download size={20} />
            <span>Tải tài liệu</span>
          </button>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <div className="stat-number">44</div>
            <div className="stat-label">Khoa phòng</div>
          </div>
          <div className="stat">
            <div className="stat-number">6</div>
            <div className="stat-label">Lĩnh vực</div>
          </div>
          <div className="stat">
            <div className="stat-number">36+</div>
            <div className="stat-label">Chỉ tiêu</div>
          </div>
          <div className="stat">
            <div className="stat-number">2027</div>
            <div className="stat-label">Triển khai</div>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-chart">
          <div className="chart-bar" style={{height: '20%'}}>
            <span>Quản lý (20%)</span>
          </div>
          <div className="chart-bar" style={{height: '25%'}}>
            <span>Chất lượng (25%)</span>
          </div>
          <div className="chart-bar" style={{height: '20%'}}>
            <span>Tài chính (20%)</span>
          </div>
          <div className="chart-bar" style={{height: '15%'}}>
            <span>Nhân sự (15%)</span>
          </div>
          <div className="chart-bar" style={{height: '20%'}}>
            <span>An toàn (20%)</span>
          </div>
          <div className="chart-bar" style={{height: '5%'}}>
            <span>Riêng (5%)</span>
          </div>
        </div>
      </div>
    </section>
  )
}
