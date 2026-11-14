import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './FAQ.css'

export default function FAQ() {
  const [expandedId, setExpandedId] = useState(0)

  const faqItems = [
    {
      id: 1,
      question: 'Tại sao cần 6 lĩnh vực, không phải 4 (như Balanced Scorecard)?',
      answer: 'Khung đề xuất điều chỉnh Balanced Scorecard theo bối cảnh bệnh viện: 5 lĩnh vực chung chiếm 95% và chỉ tiêu riêng chiếm 5%. An toàn người bệnh và môi trường y tế được bố trí 19%; đây là trọng số đề xuất, không phải tỷ lệ bắt buộc của WHO hay nghiên cứu Amer.'
    },
    {
      id: 2,
      question: 'Khoa ngoài sẽ luôn xếp cao hơn khoa nội vì doanh thu?',
      answer: 'Cần so sánh trong các nhóm có chức năng tương đồng. Lĩnh vực tài chính 19% sử dụng chỉ tiêu phù hợp từng đơn vị: phòng hành chính không bị áp doanh thu hoặc lợi nhuận. Chất lượng và an toàn chiếm tổng cộng 42%; chỉ tiêu và cách chấm cần được công bố trước.'
    },
    {
      id: 3,
      question: 'Có thể sai lệch dữ liệu không?',
      answer: 'Cần đối chiếu báo cáo với nguồn dữ liệu gốc, phân công đầu mối kiểm chứng và cho đơn vị cơ hội giải trình trước khi xác nhận kết quả.'
    },
    {
      id: 4,
      question: 'Chi phí thực hiện bao nhiêu?',
      answer: 'Chi phí cần được lập dự toán dựa trên phạm vi triển khai và nguồn lực thực tế của bệnh viện.'
    },
    {
      id: 5,
      question: 'Các khoa sẽ phàn nàn không?',
      answer: 'Cần công bố tiêu chí, công thức và kết quả, đồng thời tiếp nhận phản hồi và giải trình của các khoa, phòng.'
    },
    {
      id: 6,
      question: 'Có thể bắt đầu từ khi nào?',
      answer: 'Nếu BGĐ thống nhất → Lập Quyết định & đào tạo tháng 12.2026 → Chạy thử quý I.2027 → Áp dụng chính thức quý II.2027. Hiện tại chúng ta đang ở giai đoạn chuẩn bị (tuần này = 13-17.11.2026).'
    },
    {
      id: 7,
      question: 'Căn cứ xây dựng hệ thống đánh giá là gì?',
      answer: 'Tham khảo dữ liệu, tài liệu WHO và điều chỉnh theo báo cáo, tình hình thực tế tại bệnh viện. WHO không quy định sẵn bộ trọng số này.'
    },
    {
      id: 8,
      question: '49 đơn vị được chia thành những nhóm nào?',
      answer: 'Ba nhóm gồm 10 phòng chức năng và khoa Dược (11); 29 khoa lâm sàng và 2 cơ sở (31); 7 khoa cận lâm sàng, không tính khoa Dược.'
    },
    {
      id: 9,
      question: 'Các ngưỡng điểm có tự bảo đảm tỷ lệ 20% – 30% – 50% không?',
      answer: 'Không. Ngưỡng điểm cố định và tỷ lệ phân nhóm là hai quy tắc khác nhau; cần quy định rõ cách xếp hạng và xử lý khi kết quả không khớp tỷ lệ.'
    },
    {
      id: 10,
      question: 'Bước tiếp theo trong xây dựng hệ thống là gì?',
      answer: 'Sử dụng dữ liệu nội bộ và tài liệu tham khảo để xây dựng phương án, sau đó rà soát chỉ tiêu, trọng số và cách tính với các đơn vị trước khi trình BGĐ.'
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
