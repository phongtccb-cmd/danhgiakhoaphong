import './ComparisonPlans.css'

export default function ComparisonPlans() {
  return (
    <section className="comparison-plans section">
      <div className="container">
        <div className="section-title">
          <h2>So sánh PLAN A & PLAN B</h2>
          <p>Hai phương án thực hiện với ưu nhược điểm riêng</p>
        </div>

        <div className="plans-container">
          {/* PLAN A */}
          <div className="plan plan-a">
            <div className="plan-header">
              <h3>PLAN A: Benchmarking</h3>
              <span className="plan-badge">Tham khảo BV khác</span>
            </div>
            <div className="plan-content">
              <div className="plan-section">
                <h4>Phương pháp</h4>
                <p>Lấy trọng số từ 5 bệnh viện tương đồng (gửi FORM_02)</p>
              </div>
              <div className="plan-section">
                <h4>⏱️ Lịch trình</h4>
                <ul>
                  <li>T1 (13-17.11): Gửi FORM_01 & FORM_02</li>
                  <li>T2 (19-20.11): Kiểm email, phân tích dữ liệu</li>
                  <li>T3 (21-27.11): Tính toán, trình BGĐ</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>✅ Ưu điểm</h4>
                <ul>
                  <li>Dựa trên dữ liệu thực tế từ BV khác</li>
                  <li>Thích ứng với bối cảnh BV công lập VN</li>
                  <li>Dễ thuyết phục khoa phòng</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>⚠️ Hạn chế</h4>
                <ul>
                  <li>Phụ thuộc vào email từ 5 BV (có thể chậm)</li>
                  <li>Dữ liệu có thể không đầy đủ hoặc không chính xác</li>
                  <li>Nếu <3 BV trả lời → phải chuyển sang PLAN B</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>📊 Trigger</h4>
                <p><strong>≥3 BV trả lời FORM_02</strong> → Dùng PLAN A</p>
              </div>
            </div>
          </div>

          {/* PLAN B */}
          <div className="plan plan-b">
            <div className="plan-header">
              <h3>PLAN B: WHO Standards</h3>
              <span className="plan-badge">Tiêu chuẩn quốc tế</span>
            </div>
            <div className="plan-content">
              <div className="plan-section">
                <h4>Phương pháp</h4>
                <p>Lấy trọng số từ tiêu chuẩn WHO, JCI, ISO</p>
              </div>
              <div className="plan-section">
                <h4>⏱️ Lịch trình</h4>
                <ul>
                  <li>T1 (13-17.11): Sẵn sàng, không phụ thuộc ai</li>
                  <li>T2 (20-23.11): Tính toán (dựa PLAN_B template)</li>
                  <li>T3 (24-27.11): Trình BGĐ</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>✅ Ưu điểm</h4>
                <ul>
                  <li>Không phụ thuộc vào ai, tự chủ hoàn toàn</li>
                  <li>Dựa trên tiêu chuẩn quốc tế (WHO, JCI)</li>
                  <li>Khi thanh tra Bộ Y tế → Được khen</li>
                  <li>An toàn được tăng lên 20% (từ 10%)</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>⚠️ Hạn chế</h4>
                <ul>
                  <li>WHO tiêu chuẩn quốc tế → Có thể không 100% phù hợp BV VN</li>
                  <li>Cần giải thích cho BGĐ & khoa phòng</li>
                </ul>
              </div>
              <div className="plan-section">
                <h4>📊 Trigger</h4>
                <p><strong><3 BV trả lời FORM_02</strong> → Dùng PLAN B (hoặc chọn chủ động)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="comparison-matrix">
          <h3>Ma trận chi tiết so sánh</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                <th>PLAN A (Benchmarking)</th>
                <th>PLAN B (WHO Standards)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Căn cứ</strong></td>
                <td>Dữ liệu từ 5 BV tương đồng</td>
                <td>Tiêu chuẩn WHO, JCI, ISO</td>
              </tr>
              <tr>
                <td><strong>Phụ thuộc</strong></td>
                <td>Email từ 5 BV</td>
                <td>Không phụ thuộc</td>
              </tr>
              <tr>
                <td><strong>Lịch trình</strong></td>
                <td>27 ngày (chờ email)</td>
                <td>21 ngày (nhanh hơn)</td>
              </tr>
              <tr>
                <td><strong>An toàn %</strong></td>
                <td>10-15% (chờ BV)</td>
                <td>20% (WHO chuẩn)</td>
              </tr>
              <tr>
                <td><strong>Độc lập</strong></td>
                <td>Thấp (phụ FORM_02)</td>
                <td>Cao (tự chủ 100%)</td>
              </tr>
              <tr>
                <td><strong>Uy tín</strong></td>
                <td>Dựa dữ liệu BV VN</td>
                <td>Dựa tiêu chuẩn quốc tế</td>
              </tr>
              <tr>
                <td><strong>BGĐ thuyết phục</strong></td>
                <td>Vừa phải</td>
                <td>Cao (WHO = uy tín)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="decision-timeline">
          <h3>🎯 Trigger Decision Timeline</h3>
          <div className="timeline-item trigger-active">
            <span className="timeline-date">19.11 09:00</span>
            <span className="timeline-event">Kiểm email FORM_02</span>
          </div>
          <div className="timeline-item trigger-decision">
            <span className="timeline-date">20.11 12:00</span>
            <span className="timeline-event"><strong>⚠️ QUYẾT ĐỊNH A hay B</strong></span>
          </div>
          <div className="timeline-info">
            <p>✅ ≥3 BV → PLAN A (Benchmarking)</p>
            <p>❌ <3 BV → PLAN B (WHO Standards)</p>
          </div>
        </div>
      </div>
    </section>
  )
}
