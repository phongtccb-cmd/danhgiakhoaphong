import { CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react'
import './Overview.css'

export default function Overview() {
  const highlights = [
    {
      icon: CheckCircle,
      title: 'Toàn diện',
      description: '6 lĩnh vực bao phủ 100% hoạt động khoa phòng'
    },
    {
      icon: TrendingUp,
      title: 'Khách quan',
      description: '36+ chỉ tiêu cụ thể, đo lường được từ dữ liệu thực tế'
    },
    {
      icon: Users,
      title: 'Công bằng',
      description: 'So sánh riêng trong loại, không lẫn lộn giữa các nhóm'
    },
    {
      icon: AlertCircle,
      title: 'Minh bạch',
      description: 'Công bố tiêu chí, công thức, kết quả cho mọi khoa phòng'
    }
  ]

  return (
    <section className="overview section">
      <div className="container">
        <div className="section-title">
          <h2>Tại sao cần hệ thống đánh giá?</h2>
          <p>Bệnh viện đã chạy hơn 20 năm mà chưa có hệ thống đánh giá định kỳ. Đây là vấn đề cấp bách cần giải quyết.</p>
        </div>

        <div className="overview-grid">
          {highlights.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={index} className="overview-card">
                <div className="overview-icon">
                  <Icon size={32} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            )
          })}
        </div>

        <div className="overview-problems">
          <h3>Vấn đề hiện tại:</h3>
          <ul className="problems-list">
            <li>
              <strong>Không có hệ thống đánh giá định kỳ:</strong> Khen/phạt căn cứ vào quan hệ cá nhân → Bất công
            </li>
            <li>
              <strong>Khó phân loại 20%-30%-50%:</strong> Không có tiêu chí rõ ràng → Chỉ có cảm giác, không có số liệu
            </li>
            <li>
              <strong>Không đánh giá an toàn:</strong> Bộ Y tế yêu cầu mọi BV phải đo lường chỉ tiêu an toàn
            </li>
            <li>
              <strong>Sẽ bị kiểm toán:</strong> Khi thanh tra Bộ Y tế gặp câu hỏi "BV có hệ thống đánh giá gì?" → Bệnh viện không có câu trả lời thuyết phục
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
