import './Timeline.css'

export default function Timeline() {
  const weeks = [
    {
      week: 1,
      title: 'Tuần 1: Chuẩn bị & Gửi FORM',
      dates: '13-17.11.2026',
      color: '#3b82f6',
      tasks: [
        { date: '13.11 09:30', task: 'Đọc 3 tệp trang đánh giá', status: 'plan' },
        { date: '13.11 14:00', task: 'Chuẩn bị email FORM_01 & FORM_02', status: 'plan' },
        { date: '13.11 17:00', task: 'BGĐ phê duyệt & gửi form', status: 'plan' },
        { date: '15.11 09:00', task: 'Chủ động nhắc nhở phòng chức năng', status: 'plan' },
        { date: '17.11 17:00', task: '❌ HẠN CHÓT FORM_01 (từ 5 phòng chức năng)', status: 'deadline' },
      ]
    },
    {
      week: 2,
      title: 'Tuần 2: Kiểm duyệt & QUYẾT ĐỊNH A/B',
      dates: '18-24.11.2026',
      color: '#f59e0b',
      tasks: [
        { date: '18.11', task: 'Nhận FORM_01 từ phòng chức năng', status: 'plan' },
        { date: '19.11 09:00', task: '🔍 KIỂM EMAIL FORM_02 từ 5 BV', status: 'trigger' },
        { date: '19.11 17:00', task: 'Thống kê số BV trả lời: ≥3 hay <3?', status: 'plan' },
        { date: '20.11 12:00', task: '⚠️ QUYẾT ĐỊNH A/B - DECISION POINT', status: 'critical' },
        { date: '20.11 14:00', task: 'Nếu A: Dùng PLAN_A template + tính toán', status: 'plan' },
        { date: '20.11 14:00', task: 'Nếu B: Dùng PLAN_B template + tính toán', status: 'plan' },
        { date: '21-23.11', task: 'Tính điểm toàn bệnh viện (44 khoa)', status: 'plan' },
        { date: '23.11 17:00', task: 'QC: Kiểm chứng dữ liệu & công thức', status: 'plan' },
      ]
    },
    {
      week: 3,
      title: 'Tuần 3: Trình BGĐ & Công bố',
      dates: '25-30.11.2026',
      color: '#10b981',
      tasks: [
        { date: '24.11 09:00', task: 'REHEARSAL: Luyện trình BGĐ', status: 'plan' },
        { date: '24.11 17:00', task: 'In 6 bộ tài liệu cho BGĐ', status: 'plan' },
        { date: '27.11 08:00', task: '🎯 TRÌNH BGĐ: Thuyết trình kết quả (35 phút)', status: 'critical' },
        { date: '27.11 09:00', task: 'BGĐ thảo luận & phê duyệt', status: 'plan' },
        { date: '28.11 09:00', task: '📢 CÔNG BỐ kết quả cho toàn BV', status: 'plan' },
        { date: '28.11 14:00', task: 'Tiếp nhận khiếu nại (5 ngày)', status: 'plan' },
      ]
    }
  ]

  return (
    <section className="timeline section">
      <div className="container">
        <div className="section-title">
          <h2>Lịch trình 3 Tuần</h2>
          <p>21 ngày từ chuẩn bị đến trình BGĐ & công bố kết quả</p>
        </div>

        <div className="weeks-container">
          {weeks.map((week, idx) => (
            <div key={idx} className="week-card" style={{borderTopColor: week.color}}>
              <div className="week-header" style={{backgroundColor: week.color}}>
                <h3>Tuần {week.week}</h3>
                <p className="week-title">{week.title}</p>
                <span className="week-dates">{week.dates}</span>
              </div>
              <div className="week-tasks">
                {week.tasks.map((item, taskIdx) => (
                  <div key={taskIdx} className={`task-item status-${item.status}`}>
                    <div className="task-date">{item.date}</div>
                    <div className="task-content">
                      <div className={`task-badge status-${item.status}`}></div>
                      <span className="task-text">{item.task}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="timeline-legend">
          <h3>Chú thích</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-badge status-plan"></div>
              <span>Công việc bình thường</span>
            </div>
            <div className="legend-item">
              <div className="legend-badge status-trigger"></div>
              <span>Điểm kích hoạt (trigger)</span>
            </div>
            <div className="legend-item">
              <div className="legend-badge status-deadline"></div>
              <span>Hạn chót</span>
            </div>
            <div className="legend-item">
              <div className="legend-badge status-critical"></div>
              <span>Quyết định quan trọng</span>
            </div>
          </div>
        </div>

        <div className="timeline-critical-path">
          <h3>🎯 Con đường tới quyết định</h3>
          <div className="critical-flow">
            <div className="flow-item">
              <div className="flow-label">T1: Gửi FORM</div>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-item">
              <div className="flow-label">T2: Kiểm email FORM_02</div>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-item">
              <div className="flow-label">T2: QUYẾT ĐỊNH A/B ⭐</div>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-item">
              <div className="flow-label">T2-T3: Tính & QC</div>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-item">
              <div className="flow-label">T3: Trình BGĐ 🎯</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
