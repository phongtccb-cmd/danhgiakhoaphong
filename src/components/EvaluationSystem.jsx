import './EvaluationSystem.css'

export default function EvaluationSystem() {
  const domains = [
    {
      id: 1,
      name: 'Quản lý tổ chức & Chuyển đổi số',
      weight: '18%',
      color: '#3b82f6',
      criteria: ['Kỷ luật', 'Vắng mặt', 'Kế hoạch', 'Báo cáo đúng hạn', 'Ứng dụng CNTT'],
      description: 'Quản lý tổ chức và ứng dụng công nghệ phù hợp với nhiệm vụ của đơn vị.'
    },
    {
      id: 2,
      name: 'Chất lượng chuyên môn & Trải nghiệm người bệnh',
      weight: '23%',
      color: '#10b981',
      criteria: ['Hài lòng người bệnh', 'Tuân thủ phác đồ', 'Thời gian chờ', 'Ngày điều trị', 'Công suất giường'],
      description: 'Chất lượng chuyên môn, trải nghiệm người bệnh, thời gian và hiệu suất vận hành.'
    },
    {
      id: 3,
      name: 'Tài chính - Kinh tế',
      weight: '19%',
      color: '#f59e0b',
      criteria: ['Chi phí', 'Chênh lệch thu chi', 'Xuất toán BHYT', 'Định mức', 'Giải ngân'],
      description: 'Chọn chỉ tiêu theo chức năng: thu chi và BHYT cho đơn vị có nguồn thu; định mức chi phí và giải ngân cho phòng chức năng.'
    },
    {
      id: 4,
      name: 'Nhân sự - Đào tạo & Nghiên cứu khoa học',
      weight: '16%',
      color: '#8b5cf6',
      criteria: ['Đào tạo liên tục', 'Chứng chỉ hành nghề', 'Giữ chân nhân sự', 'Nghiên cứu', 'Sáng kiến'],
      description: 'Phát triển nhân sự, đào tạo và nghiên cứu hoặc sáng kiến phù hợp nhiệm vụ.'
    },
    {
      id: 5,
      name: 'An toàn người bệnh & Môi trường y tế',
      weight: '19%',
      color: '#ef4444',
      criteria: ['Sự cố và biến chứng', 'Kiểm soát nhiễm khuẩn', 'Chất thải y tế', 'ATVSLĐ', 'PCCC'],
      description: 'An toàn lâm sàng, kiểm soát nhiễm khuẩn, an toàn lao động và môi trường y tế.'
    },
    {
      id: 6,
      name: 'Chỉ tiêu riêng',
      weight: '5%',
      color: '#06b6d4',
      criteria: ['Lâm sàng', 'Cận lâm sàng', 'Phòng chức năng'],
      description: 'Chỉ tiêu đặc thù phù hợp với chức năng của từng nhóm khoa, phòng.'
    }
  ]

  return (
    <section className="evaluation-system section">
      <div className="container">
        <div className="section-title">
          <h2>Đề xuất 6 lĩnh vực đánh giá</h2>
          <p>5 lĩnh vực chung (95%) và chỉ tiêu riêng (5%); tổng trọng số 100%.</p>
          <p>
            Tham khảo các chiều kích trong{' '}
            <a href="https://doi.org/10.1186/s12913-022-07863-0" target="_blank" rel="noopener noreferrer">
              Amer và cộng sự (2022)
            </a>
            . Trọng số là đề xuất của bệnh viện, không phải trọng số do nghiên cứu quy định.
          </p>
        </div>

        <div className="specific-indicators">
          <h3>Gợi ý chỉ tiêu riêng theo khối</h3>
          <p>Các ví dụ cần được lựa chọn và phê duyệt theo chức năng, nguồn dữ liệu và trách nhiệm của từng đơn vị.</p>
          <div className="specific-indicators-grid">
            <div>
              <h4>Khoa lâm sàng & cơ sở</h4>
              <ul>
                <li>Triển khai kỹ thuật mới, kỹ thuật chuyên sâu.</li>
                <li>Chuyển tuyến trên không phù hợp; phẫu thuật đúng giờ với khoa có phẫu thuật.</li>
                <li>Mổ lại ngoài dự kiến: xem xét trong lĩnh vực an toàn.</li>
              </ul>
            </div>
            <div>
              <h4>Cận lâm sàng</h4>
              <ul>
                <li>Trả kết quả xét nghiệm hoặc chẩn đoán hình ảnh cấp cứu đúng thời hạn.</li>
                <li>Đứt gãy hóa chất và vật tư phục vụ chuyên môn.</li>
                <li>Kết quả ngoại kiểm chất lượng xét nghiệm theo yêu cầu áp dụng.</li>
              </ul>
            </div>
            <div>
              <h4>Phòng chức năng & khoa Dược</h4>
              <ul>
                <li>KHTH/QLCL: hoàn thành đề án cải tiến, theo dõi kết quả đánh giá chất lượng.</li>
                <li>Vật tư - thiết bị y tế: khắc phục sự cố và bảo trì đúng hạn.</li>
                <li>Tài chính - kế toán: thu hồi công nợ BHYT và chi trả đúng hạn theo trách nhiệm.</li>
                <li>Khoa Dược: đứt gãy thuốc và sai sót cấp phát thuốc.</li>
              </ul>
            </div>
          </div>
          <p className="indicator-note">
            Mỗi chỉ tiêu hoặc sự kiện chỉ được chấm một lần: phân công trước vào lĩnh vực chung hoặc chỉ tiêu riêng.
            Đặc biệt, biến chứng, nhiễm khuẩn, mổ lại ngoài dự kiến và sai sót cấp phát thuộc lĩnh vực an toàn;
            không chấm lặp trong chỉ tiêu riêng. Với phòng hành chính, không áp chỉ tiêu doanh thu hoặc lợi nhuận.
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
