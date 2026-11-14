import './EvaluationSystem.css'

export default function EvaluationSystem() {
  const domains = [
    {
      id: 1,
      name: 'Quản lý tổ chức & Chuyển đổi số',
      weight: '19%',
      color: '#3b82f6',
      criteria: ['Kỷ luật', 'Vắng mặt', 'Kế hoạch', 'Báo cáo đúng hạn', 'Ứng dụng CNTT'],
      description: 'Quản lý tổ chức và ứng dụng công nghệ phù hợp với nhiệm vụ của đơn vị.'
    },
    {
      id: 2,
      name: 'Chất lượng chuyên môn & Trải nghiệm người bệnh',
      weight: '24%',
      color: '#10b981',
      criteria: ['Hài lòng người bệnh', 'Tuân thủ phác đồ', 'Thời gian chờ', 'Ngày điều trị', 'Công suất giường'],
      description: 'Chất lượng chuyên môn, trải nghiệm người bệnh, thời gian và hiệu suất vận hành.'
    },
    {
      id: 3,
      name: 'Tài chính - Kinh tế',
      weight: '20%',
      color: '#f59e0b',
      criteria: ['Chi phí', 'Chênh lệch thu chi', 'Xuất toán BHYT', 'Định mức', 'Giải ngân'],
      description: 'Chọn chỉ tiêu theo chức năng: thu chi và BHYT cho đơn vị có nguồn thu; định mức chi phí và giải ngân cho phòng chức năng.'
    },
    {
      id: 4,
      name: 'Nhân sự - Đào tạo & Nghiên cứu khoa học',
      weight: '17%',
      color: '#8b5cf6',
      criteria: ['Đào tạo liên tục', 'Chứng chỉ hành nghề', 'Giữ chân nhân sự', 'Nghiên cứu', 'Sáng kiến'],
      description: 'Phát triển nhân sự, đào tạo và nghiên cứu hoặc sáng kiến phù hợp nhiệm vụ.'
    },
    {
      id: 5,
      name: 'An toàn người bệnh & Môi trường y tế',
      weight: '20%',
      color: '#ef4444',
      criteria: ['Sự cố và biến chứng', 'Kiểm soát nhiễm khuẩn', 'Chất thải y tế', 'ATVSLĐ', 'PCCC'],
      description: 'An toàn lâm sàng, kiểm soát nhiễm khuẩn, an toàn lao động và môi trường y tế.'
    }
  ]

  return (
    <section className="evaluation-system section">
      <div className="container">
        <div className="section-title">
          <h2>Đề xuất 5 lĩnh vực đánh giá</h2>
          <p>Trọng số được phân bổ lại từ lĩnh vực chỉ tiêu riêng cho 5 lĩnh vực còn lại; tổng trọng số 100%.</p>
          <p>
            Tham khảo các chiều kích trong{' '}
            <a href="https://doi.org/10.1186/s12913-022-07863-0" target="_blank" rel="noopener noreferrer">
              Amer và cộng sự (2022)
            </a>
            . Trọng số là đề xuất của bệnh viện, không phải trọng số do nghiên cứu quy định.
          </p>
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
          <p>Điểm lẻ được xếp theo khoảng liên tục. Mục tiêu tỷ lệ 20% – 30% – 50% cần có quy định xếp hạng riêng; các ngưỡng điểm không tự bảo đảm tỷ lệ này.</p>
          <table>
            <thead>
              <tr>
                <th>Mức đánh giá</th>
                <th>Điểm số</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group-a">
                <td><strong>Xuất sắc</strong></td>
                <td>90–100</td>
              </tr>
              <tr className="group-b">
                <td><strong>Rất tốt</strong></td>
                <td>85–dưới 90</td>
              </tr>
              <tr className="group-c">
                <td><strong>Khá tốt</strong></td>
                <td>75–dưới 85</td>
              </tr>
              <tr className="group-d">
                <td><strong>Hoàn thành</strong></td>
                <td>50–dưới 75</td>
              </tr>
              <tr>
                <td><strong>Chưa hoàn thành</strong></td>
                <td>Dưới 50</td>
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
