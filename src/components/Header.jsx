import { Moon, Sun } from 'lucide-react'
import './Header.css'

export default function Header({ darkMode, toggleDarkMode }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <img 
            src="https://benhvienthuduc.vn/images/logo-svg.svg" 
            alt="BV Đa khoa Thủ Đức" 
            className="logo-img"
            onError={(e) => {
              e.target.src = '/logo-placeholder.svg'
            }}
          />
          <div className="logo-text">
            <h1>ĐÁNH GIÁ KHOA PHÒNG</h1>
            <p>Bệnh viện Đa khoa Thủ Đức</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleDarkMode} title="Chuyển đổi chế độ tối">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}
