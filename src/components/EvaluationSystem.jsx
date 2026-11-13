import './EvaluationSystem.css'

export default function EvaluationSystem() {
  const domains = [
    {
      id: 1,
      name: 'Quản lý tổ chức',
      weight: '18%',
      color: '#3b82f6',
      criteria: ['Kỷ luật', 'Vắng mặt', 'Kế hoạch', 'Báo cáo'],
      description: 'Quản lý hành chính, kỷ luật nhân viên, lập kế hoạch'
    },
    {
      id: 2,
      name: 'Chất lượng dịch vụ',
      weight: '23%',
      color: '#10b981',
      criteria: ['Hài lòng BN', 'Biến chứng', 'Lây nhiễm', 'Chất lượng'],
      description: 'Hài lòng bệnh nhân, biến chứng, lây nhiễm bệnh viện'
    },
    {
      id: 3,
      name: 'Tài chính-Kinh tế',
      weight: '19%',
      color: '#f59e0b',
      criteria: ['Doanh thu', 'Chi phí', 'Lợi nhuận', 'Bù đắp'],
      description: 'Doanh thu, chi phí hoạt động, lợi nhuận'
    },
    {
      id: 4,
      name: 'Nhân sự-Đào tạo',
      weight: '16%',
      color: '#8b5cf6',
      criteria: ['Đào tạo', 'Chứng chỉ', 'Giữ chân', 'Phát triển'],
      description: 'Đào tạo, chứng chỉ hành nghề, phát triển nhân sự'
    },
    {
      id: 5,
      name: 'An toàn-Vệ sinh',
      weight: '20%',
      color: '#ef4444',
      criteria: ['Tai nạn', 'ATVSLD', 'PCCC', 'Vệ sinh'],
      description: 'Tai nạn y khoa, an toàn lao động, phòng cháy chữa cháy'
    },
    {
      id: 6,
      name: 'Chỉ tiêu riêng',
      weight: '5%',
      color: '#06b6d4',
      criteria: ['Tùy loại', 'Riêng biệt', 'Cụ thể', 'Phù hợp'],
      description: 'Chỉ tiêu riêng tùy theo loại khoa phòng'
    }
  ]

  return (
    <section className="evaluation-system section">
      <div className="container">
        <div className="section-title">
          <h2>Hệ thống 6 Lĩnh vực Đánh giá</h2>
          <p>Dựa trên Balanced Scorecard + Tiêu chuẩn quốc tế (WHO, JCI, ISO)</p>
        </div>

        <div className="domains-grid">
          {domains.map(domain => (
            <div key={domain.id} className="domain-card" style={{borderLeftColor: domain.color}}>
              <div className="domain-header" style={{backgroundColor: domain.color}}>
                <h3>{domain.name}</h3>
                <div className="weight-badge">{domain.weight}</div>
              </div>
              <div className="domain-content">
                <p className="domain-description">{domain.description}</p>
                <div className="criteria-list">
                  {domain.criteria.map((criterion, idx) => (
                    <span key={idx} className="criterion-tag">{criterion}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="weight-distribution">
          <h3>Phân bổ trọng số</h3>
          <div className="weight-bars">
            {domains.map(domain => (
              <div key={domain.id} className="weight-item">
                <div className="weight-label">
                  <span className="domain-name">{domain.name}</span>
                  <span className="weight-value">{domain.weight}</span>
                </div>
                <div className="weight-bar-container">
                  <div 
                    className="weight-bar" 
                    style={{
                      width: domain.weight,
                      backgroundColor: domain.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="scoring-table">
          <h3>Thang điểm & Phân loại</h3>
          <table>
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Tên gọi</th>
                <th>Điểm số</th>
                <th>Tỷ lệ</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group-a">
                <td><span className="group-badge">A</span></td>
                <td><strong>Xuất sắc</strong></td>
                <td>90-100</td>
                <td>20%</td>
                <td>Hoàn thành xuất sắc, vượt chỉ tiêu</td>
              </tr>
              <tr className="group-b">
                <td><span className="group-badge">B</span></td>
                <td><strong>Tốt</strong></td>
                <td>75-89</td>
                <td>30%</td>
                <td>Hoàn thành tốt, đạt chỉ tiêu</td>
              </tr>
              <tr className="group-c">
                <td><span className="group-badge">C</span></td>
                <td><strong>Bình thường</strong></td>
                <td>60-74</td>
                <td>50%</td>
                <td>Hoàn thành cơ bản, cần cải thiện</td>
              </tr>
              <tr className="group-d">
                <td><span className="group-badge">D</span></td>
                <td><strong>Chưa đạt</strong></td>
                <td>&lt;60</td>
                <td>Riêng</td>
                <td>Cần xử lý, hỗ trợ cụ thể</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="key-principles">
          <h3>Các nguyên tắc chính</h3>
          <div className="principles-grid">
            <div className="principle">
              <div className="principle-icon">✅</div>
              <h4>Công bằng</h4>
              <p>So sánh riêng trong loại (khoa ngoài vs khoa ngoài; khoa nội vs khoa nội)</p>
            </div>
            <div className="principle">
              <div className="principle-icon">📊</div>
              <h4>Khách quan</h4>
              <p>Dựa trên dữ liệu cụ thể, không phụ thuộc vào cảm xúc hay quan hệ</p>
            </div>
            <div className="principle">
              <div className="principle-icon">🔍</div>
              <h4>Minh bạch</h4>
              <p>Công bố tiêu chí, công thức, kết quả cho tất cả khoa phòng</p>
            </div>
            <div className="principle">
              <div className="principle-icon">📈</div>
              <h4>Hỗ trợ phát triển</h4>
              <p>Chỉ ra điểm yếu để khoa phòng biết cần cải thiện thế nào</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
