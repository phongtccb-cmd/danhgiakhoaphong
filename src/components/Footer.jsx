import { Github, Mail, MapPin, Phone } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="container">
          <div className="footer-grid">
            {/* Hospital Info */}
            <div className="footer-section">
              <h4>Bệnh viện Đa khoa Thủ Đức</h4>
              <p className="footer-description">
                Bệnh viện Đa khoa Hạng I trực thuộc Sở Y tế Thành phố Hồ Chí Minh, cung cấp dịch vụ chăm sóc sức khỏe toàn diện cho cộng đồng.
              </p>
              <div className="footer-contact">
                <p><MapPin size={16} /> 1, Linh Trung, Thủ Đức, TP.HCM</p>
                <p><Phone size={16} /> (028) 6280 1000</p>
                <p><Mail size={16} /> info@benhvienthuduc.vn</p>
              </div>
            </div>

            {/* Evaluation System */}
            <div className="footer-section">
              <h4>Hệ thống Đánh giá</h4>
              <ul className="footer-links">
                <li><a href="#system">Tổng quan</a></li>
                <li><a href="#system">6 Lĩnh vực</a></li>
                <li><a href="#comparison">So sánh PLAN A/B</a></li>
                <li><a href="#timeline">Lịch trình</a></li>
                <li><a href="#dashboard">Dashboard</a></li>
                <li><a href="#faq">Câu hỏi thường gặp</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="footer-section">
              <h4>Tài liệu</h4>
              <ul className="footer-links">
                <li><a href="/DANH_GIA_TON_TAT_THONG_DIEP_CHINH.pdf" target="_blank" rel="noopener noreferrer">📄 Tóm tắt Thông điệp</a></li>
                <li><a href="/PLAN_B_TOM_TAT_NHANH.pdf" target="_blank" rel="noopener noreferrer">📄 PLAN B 1 trang</a></li>
                <li><a href="https://github.com/phongtccb-cmd/danhgiakhoaphong" target="_blank" rel="noopener noreferrer">🔗 GitHub Repository</a></li>
                <li><a href="https://benhvienthuduc.vn" target="_blank" rel="noopener noreferrer">🌐 Website BV</a></li>
              </ul>
            </div>

            {/* Important Dates */}
            <div className="footer-section">
              <h4>📅 Ngày quan trọng</h4>
              <ul className="footer-dates">
                <li><strong>17.11:</strong> Hạn chót FORM_01</li>
                <li><strong>19.11:</strong> Kiểm email FORM_02</li>
                <li><strong>20.11:</strong> Quyết định A/B ⭐</li>
                <li><strong>27.11:</strong> Trình BGĐ 🎯</li>
                <li><strong>28.11:</strong> Công bố kết quả</li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="footer-bottom">
            <div className="footer-credit">
              <p>© {currentYear} Phòng Tổ chức Cán bộ - Bệnh viện Đa khoa Thủ Đức. Tất cả quyền được bảo lưu.</p>
            </div>
            <div className="footer-links-bottom">
              <a href="https://github.com/phongtccb-cmd/danhgiakhoaphong" target="_blank" rel="noopener noreferrer" title="GitHub">
                <Github size={20} />
              </a>
              <a href="mailto:toccb@benhvienthuduc.vn" title="Email">
                <Mail size={20} />
              </a>
              <a href="https://benhvienthuduc.vn" target="_blank" rel="noopener noreferrer" title="Website">
                <MapPin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
