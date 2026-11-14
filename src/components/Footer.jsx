import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Phòng Tổ chức Cán bộ - Bệnh viện Đa khoa Thủ Đức</p>
        <a href="https://benhvienthuduc.vn" target="_blank" rel="noopener noreferrer">
          Website bệnh viện
        </a>
      </div>
    </footer>
  )
}
