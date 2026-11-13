import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './FAQ.css'

export default function FAQ() {
  const [expandedId, setExpandedId] = useState(0)

  const faqItems = [
    {
      id: 1,
      question: 'Tại sao cần 6 lĩnh vực, không phải 4 (như Balanced Scorecard)?',
      answer: 'Tiêu chuẩn quốc tế (WHO, JCI, ISO) bắt buộc đánh giá An toàn riêng biệt. Bộ Y tế cũng yêu cầu các chỉ tiêu về tai nạn y khoa, lây nhiễm. Nếu không có → Bệnh viện sẽ bị kiểm toán. Do đó, An toàn được tách riêng thành lĩnh vực 5, chiếm 20% (tương đương quản lý & tài chính).'
    },
    {
      id: 2,
      question: 'Khoa ngoài sẽ luôn xếp cao hơn khoa nội vì doanh thu?',
      answer: 'KHÔNG. Hệ thống so sánh riêng trong loại (khoa ngoài vs khoa ngoài; khoa nội vs khoa nội). Ngoài ra, doanh thu chỉ chiếm ~3-4% tổng điểm (1/6 chỉ tiêu × 20%). Chất lượng + An toàn chiếm 35% → Quan trọng hơn nhiều.'
    },
    {
      id: 3,
      question: 'Có thể sai lệch dữ liệu không?',
      answer: 'Có quy trình kiểm chứng cụ thể (ngày 10-15 mỗi tháng). Nếu Khoa báo cáo sai → Kỷ luật Trưởng khoa (giảm điểm quản lý tổ chức) → Khoa sẽ không dám sai lần sau. Đây là cơ chế tự kiểm soát.'
    },
    {
      id: 4,
      question: 'Chi phí thực hiện bao nhiêu?',
      answer: 'Lần đầu: <50 triệu (tự làm trong BV, không cần tư vấn ngoài). Từ năm 2 trở đi: <10 triệu/năm (tự động hóa). Lợi nhuận: Nếu tăng doanh thu 5% = 50 tỷ → ROI = 100 lần. Rất đáng đầu tư.'
    },
    {
      id: 5,
      question: 'Các khoa sẽ phàn nàn không?',
      answer: 'Khó khăn. Vì hệ thống rõ ràng & công khai (công bố tiêu chí, công thức, kết quả). Khoa có thể kiểm tra lại số liệu. So với đánh giá chủ quan trước → Rất minh bạch. Nếu khoa phàn nàn, chúng ta có số liệu để bảo vệ.'
    },
    {
      id: 6,
      question: 'Có thể bắt đầu từ khi nào?',
      answer: 'Nếu BGĐ thống nhất → Lập Quyết định & đào tạo tháng 12.2026 → Chạy thử quý I.2027 → Áp dụng chính thức quý II.2027. Hiện tại chúng ta đang ở giai đoạn chuẩn bị (tuần này = 13-17.11.2026).'
    },
    {
      id: 7,
      question: 'PLAN A và PLAN B khác nhau như thế nào?',
      answer: 'PLAN A (Benchmarking): Lấy trọng số từ 5 BV khác, phụ thuộc vào email từ họ. PLAN B (WHO Standards): Lấy từ tiêu chuẩn WHO, không phụ thuộc ai, tự chủ 100%. Trigger: Nếu ≥3 BV trả lời → PLAN A. Nếu <3 → PLAN B. Hoặc BGĐ chọn chủ động PLAN B.'
    },
    {
      id: 8,
      question: 'Khi nào xác định được PLAN A hay PLAN B?',
      answer: '⭐ QUYẾT ĐỊNH CHÍNH: 20.11.2026 12:00 (Thứ 3 tuần 2). Vào sáng 19.11 09:00 (Thứ 2), chúng ta sẽ kiểm email từ 5 BV. Nếu ≥3 trả lời → PLAN A. Nếu <3 → PLAN B. BGĐ sẽ được báo cáo & quyết định.'
    },
    {
      id: 9,
      question: 'Nếu PLAN A được chọn, bước tiếp theo là gì?',
      answer: 'Dùng TEMPLATE_03 (Phân tích & Điều chỉnh Trọng số) để phân tích dữ liệu từ 5 BV và FORM_01 của BV Thủ Đức. Tính toán trọng số mới dựa trên so sánh. Sau đó tính điểm cho 44 khoa.'
    },
    {
      id: 10,
      question: 'Nếu PLAN B được chọn, bước tiếp theo là gì?',
      answer: 'Dùng PLAN_B_PHAN_2_Template để nhập dữ liệu từ FORM_01 vào, tính điểm theo công thức WHO. Template đã có sẵn, chỉ cần điền số liệu. Nhanh hơn PLAN A vì không phải chờ BV khác.'
    },
  ]

  return (
    <section className="faq section">
      <div className="container">
        <div className="section-title">
          <h2>Câu hỏi Thường Gặp</h2>
          <p>Giải đáp những thắc mắc phổ biến về hệ thống đánh giá</p>
        </div>

        <div className="faq-container">
          {faqItems.map((item) => (
            <div 
              key={item.id} 
              className={`faq-item ${expandedId === item.id ? 'expanded' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <span className="question-text">{item.question}</span>
                <ChevronDown 
                  size={24} 
                  className="chevron-icon"
                />
              </button>
              {expandedId === item.id && (
                <div className="faq-answer">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="faq-contact">
          <h3>Không tìm thấy câu trả lời?</h3>
          <p>Liên hệ trực tiếp với Phòng Tổ chức Cán bộ để được hỗ trợ thêm</p>
          <div className="contact-info">
            <p><strong>📧 Email:</strong> toccb@benhvienthuduc.vn</p>
            <p><strong>📞 Điện thoại:</strong> (028) 6280 1000 (ext. TCCB)</p>
            <p><strong>🏢 Văn phòng:</strong> Tầng 2, Bệnh viện Đa khoa Thủ Đức</p>
          </div>
        </div>
      </div>
    </section>
  )
}
