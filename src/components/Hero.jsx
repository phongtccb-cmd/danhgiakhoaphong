import { ArrowRight } from 'lucide-react'
import './Hero.css'

export default function Hero({ setCurrentPage }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          Hệ thống đánh giá hoạt động khoa phòng
        </h1>
        <p className="hero-subtitle">
          Bệnh viện Đa khoa Thủ Đức
        </p>
        
        <p className="hero-description">
          Đề xuất đánh giá định kỳ dựa trên dữ liệu, công bằng và minh bạch.
        </p>

        <div className="hero-actions">
          <button className="btn-primary btn-large" onClick={() => setCurrentPage('system')}>
            <span>Xem hệ thống đánh giá</span>
            <ArrowRight size={20} />
          </button>
          <button className="btn-secondary btn-large" onClick={() => setCurrentPage('comparison')}>
            <span>Phương án B</span>
          </button>
        </div>
      </div>
    </section>
  )
}
