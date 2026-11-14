import './Timeline.css'

export default function Timeline() {
  const weeks = [
    {
      week: 1,
      title: 'Chuẩn bị dữ liệu nội bộ',
      dates: '13-17.11.2026',
      color: '#3b82f6',
      tasks: [
        { date: '13–17.11', task: 'Thu thập báo cáo, xác định đầu mối cung cấp và kiểm chứng dữ liệu nội bộ.', status: 'plan' },
        { date: '13–17.11', task: 'Rà soát nguồn WHO và khả năng đối chiếu với bệnh viện.', status: 'plan' },
      ]
    },
    {
      week: 2,
      title: 'Phân tích dữ liệu',
      dates: '18-24.11.2026',
      color: '#f59e0b',
      tasks: [
        { date: '18–24.11', task: 'Đối chiếu nguồn WHO, phân tích dữ liệu nội bộ và điều chỉnh chỉ tiêu theo 03 nhóm đơn vị.', status: 'plan' },
        { date: '18–24.11', task: 'Kiểm chứng công thức, nguồn dữ liệu và phương án chấm điểm cho 49 đơn vị.', status: 'plan' },
      ]
    },
    {
      week: 3,
      title: 'Rà soát & trình BGĐ',
      dates: '25-30.11.2026',
      color: '#10b981',
      tasks: [
        { date: '25–30.11', task: 'Rà soát dự thảo, trình BGĐ xem xét và tiếp nhận ý kiến các đơn vị.', status: 'plan' },
      ]
    }
  ]

  return (
    <section className="timeline section">
      <div className="container">
        <div className="section-title">
          <h2>Lịch trình dự kiến</h2>
          <p>Thời gian cần được rà soát và xác nhận theo tình hình thực tế.</p>
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

      </div>
    </section>
  )
}
