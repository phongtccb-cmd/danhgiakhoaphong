# 🏥 Hệ thống Đánh giá Hoạt động Khoa Phòng

Bệnh viện Đa khoa Thủ Đức - Hạng I trực thuộc Sở Y tế TP.HCM

## 📋 Giới thiệu

Hệ thống toàn diện để đánh giá hoạt động của 44 khoa phòng dựa trên:
- **6 lĩnh vực chính** (Quản lý, Chất lượng, Tài chính, Nhân sự, An toàn, Chỉ tiêu riêng)
- **36+ chỉ tiêu cụ thể** (đo lường được từ dữ liệu thực tế)
- **Tiêu chuẩn quốc tế** (WHO, JCI, ISO)
- **Công bằng, khách quan, minh bạch**

## 🎯 Mục tiêu

- Đánh giá hoạt động định kỳ (quý/năm)
- Phân nhóm 20% xuất sắc, 30% tốt, 50% bình thường
- Tuân thủ tiêu chuẩn quốc tế
- Chuẩn bị triển khai năm 2027

## 📁 Cấu trúc Dự án

```
danhgiakhoaphong/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   ├── Hero.jsx
│   │   ├── Overview.jsx
│   │   ├── EvaluationSystem.jsx
│   │   ├── ComparisonPlans.jsx
│   │   ├── Timeline.jsx
│   │   ├── Dashboard.jsx
│   │   ├── FAQ.jsx
│   │   └── Footer.jsx
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🚀 Cách sử dụng

### Cài đặt

```bash
# Clone repository
git clone https://github.com/phongtccb-cmd/danhgiakhoaphong.git
cd danhgiakhoaphong

# Cài đặt dependencies
npm install

# Chạy dev server
npm run dev

# Build cho production
npm run build
```

### Deploy lên Cloudflare Pages

1. Push code lên GitHub
2. Kết nối repository với Cloudflare Pages
3. Build command: `npm run build`
4. Build output: `dist`

## 📊 Lịch trình 3 Tuần

### Tuần 1 (13-17.11.2026)
- 13.11: Đọc tài liệu, chuẩn bị email
- 13.11: BGĐ phê duyệt & gửi FORM_01, FORM_02
- 17.11: Hạn chót FORM_01 từ 5 phòng chức năng

### Tuần 2 (18-24.11.2026)
- 19.11 09:00: Kiểm email FORM_02 từ 5 BV
- 20.11 12:00: ⭐ QUYẾT ĐỊNH A hay B
- 20-23.11: Tính toán & QC

### Tuần 3 (25-30.11.2026)
- 24.11: Rehearsal & In tài liệu
- 27.11 08:00: 🎯 TRÌNH BGĐ
- 28.11: Công bố kết quả

## 🔄 PLAN A vs PLAN B

| Tiêu chí | PLAN A | PLAN B |
|----------|--------|--------|
| Phương pháp | Benchmarking (5 BV) | WHO Standards |
| Phụ thuộc | Email từ 5 BV | Không phụ thuộc |
| Trigger | ≥3 BV trả lời | <3 BV hoặc chọn chủ động |
| An toàn % | 10-15% | 20% (WHO) |
| Độc lập | Thấp | Cao (100%) |

## 📞 Liên hệ

**Phòng Tổ chức Cán bộ - Bệnh viện Đa khoa Thủ Đức**

- 📧 Email: toccb@benhvienthuduc.vn
- 📞 Điện thoại: (028) 6280 1000
- 🏢 Văn phòng: Tầng 2, BV Đa khoa Thủ Đức

## 📄 Tài liệu Tham khảo

- [Tóm tắt Thông điệp Chính](/DANH_GIA_TON_TAT_THONG_DIEP_CHINH.md)
- [PLAN B 1 Trang](/PLAN_B_TOM_TAT_NHANH_1_TRANG.md)
- [So sánh PLAN A vs PLAN B](/SO_SANH_PLAN_A_vs_PLAN_B.md)
- [Trang Đánh giá - Phần 1](/TRANG_DANH_GIA_TOAN_BO_NOI_DUNG_PHAN_1.md)
- [Trang Đánh giá - Phần 2](/TRANG_DANH_GIA_TOAN_BO_NOI_DUNG_PHAN_2.md)

## 🔒 Giấy phép

MIT License © 2026 Bệnh viện Đa khoa Thủ Đức

## 📱 Truy cập

- 🌐 Website: https://danhgiakhoaphong.pages.dev
- 📖 GitHub: https://github.com/phongtccb-cmd/danhgiakhoaphong
- 🏥 BV: https://benhvienthuduc.vn

---

**Phát triển bởi:** Phòng Tổ chức Cán bộ

**Ngày cập nhật:** 13.11.2026

**Trạng thái:** 🟢 Sẵn sàng triển khai
