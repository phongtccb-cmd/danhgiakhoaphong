import './Navigation.css'

export default function Navigation({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'home', label: 'Trang chủ', icon: '🏠' },
    { id: 'system', label: 'Hệ thống đánh giá', icon: '📊' },
    { id: 'timeline', label: 'Lịch trình', icon: '📅' },
    { id: 'dashboard', label: 'Dashboard', icon: '📈' },
    { id: 'data', label: 'Dữ liệu đánh giá', icon: '📋' },
    { id: 'faq', label: 'Câu hỏi thường gặp', icon: '❓' },
  ]

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-items">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              aria-current={currentPage === item.id ? 'page' : undefined}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
