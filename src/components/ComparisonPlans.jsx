import './ComparisonPlans.css'

export default function ComparisonPlans() {
  return (
    <section className="comparison-plans section">
      <div className="container">
        <div className="section-title">
          <h2>Phương án B đã chọn</h2>
          <p>Tham khảo dữ liệu, tài liệu WHO và điều chỉnh theo báo cáo, tình hình thực tế tại bệnh viện.</p>
        </div>
        <div className="plan plan-b">
          <div className="plan-header">
            <h3>Cách thực hiện</h3>
            <span className="plan-badge">WHO + dữ liệu bệnh viện</span>
          </div>
          <div className="plan-content">
            <div className="plan-section">
              <h4>1. Xác định nguồn tham khảo</h4>
              <p>Chọn chỉ số và tài liệu WHO phù hợp; ghi rõ nguồn, năm, định nghĩa và điều kiện so sánh.</p>
            </div>
            <div className="plan-section">
              <h4>2. Thu thập dữ liệu bệnh viện</h4>
              <p>Đối chiếu báo cáo và dữ liệu nội bộ theo kỳ đánh giá, nhóm đơn vị và trách nhiệm của từng khoa, phòng.</p>
            </div>
            <div className="plan-section">
              <h4>3. Điều chỉnh và trình duyệt</h4>
              <p>Rà soát tính phù hợp, công thức, khả năng thu thập và trọng số; công bố tiêu chí trước khi áp dụng.</p>
            </div>
            <div className="plan-section">
              <h4>Lưu ý</h4>
              <p>Dữ liệu WHO chỉ là căn cứ tham khảo, không mặc nhiên tương đương dữ liệu bệnh viện. Các trọng số và ngưỡng đánh giá là đề xuất của bệnh viện, không phải chuẩn do WHO ấn định.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
