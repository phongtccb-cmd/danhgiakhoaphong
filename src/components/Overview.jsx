import { CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react'
import './Overview.css'

export default function Overview() {
  const highlights = [
    {
      icon: CheckCircle,
      title: 'Toàn diện',
      description: 'Đánh giá nhiều mặt hoạt động khoa phòng'
    },
    {
      icon: TrendingUp,
      title: 'Khách quan',
      description: 'Dựa trên chỉ tiêu và dữ liệu có thể kiểm chứng'
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
          <h2>Nguyên tắc đánh giá</h2>
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

      </div>
    </section>
  )
}
