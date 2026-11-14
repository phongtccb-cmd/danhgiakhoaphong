# 🏥 Hệ thống Đánh giá Hoạt động Khoa Phòng

Bệnh viện Đa khoa Thủ Đức - Hạng I trực thuộc Sở Y tế TP.HCM

## 📋 Giới thiệu

Hệ thống đánh giá hoạt động của 49 phòng, khoa và cơ sở thuộc 3 nhóm:
- 10 phòng chức năng và khoa Dược: 11 đơn vị
- 29 khoa lâm sàng và 2 cơ sở: 31 đơn vị
- 7 khoa cận lâm sàng (không tính khoa Dược)

Khung đánh giá gồm:
- **6 lĩnh vực chính** (Quản lý, Chất lượng, Tài chính, Nhân sự, An toàn, Chỉ tiêu riêng)
- Tham khảo dữ liệu, tài liệu WHO và điều chỉnh theo báo cáo, tình hình thực tế tại bệnh viện
- **Công bằng, khách quan, minh bạch**

## 🎯 Mục tiêu

- Đánh giá hoạt động định kỳ (quý/năm)
- Mục tiêu phân nhóm 20% xuất sắc, 30% tốt, 50% còn lại; quy tắc áp dụng cần được phê duyệt
- Tham khảo tài liệu quốc tế phù hợp với thực tế bệnh viện
- Chuẩn bị triển khai năm 2027

## 📁 Cấu trúc Dự án

```
danhgiakhoaphong/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   ├── Overview.jsx
│   │   ├── EvaluationSystem.jsx
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

## Dữ liệu dùng chung với Firebase

- Dữ liệu kỳ đánh giá, đơn vị, chỉ tiêu, điểm, ghi chú và liên kết minh chứng **công khai trên Internet**. Không nhập dữ liệu nhạy cảm hoặc liên kết chứa thông tin riêng tư.
- Trước khi đưa chức năng lên website, mở Firestore Database → Rules, thay nội dung bằng tệp `firestore.rules` của dự án và bấm **Publish**. Chỉ đưa dữ liệu thật vào sau khi kiểm tra quy tắc đã được áp dụng. Quyền xem/sửa được thực thi tại Firestore, không chỉ ẩn nút trên giao diện.
- Bật Email/Password trong Firebase Authentication → Sign-in method. Thêm tên miền website vào Authentication → Settings → Authorized domains nếu chưa có.
- Quản trị viên ban đầu là UID được cấu hình trong `src/firebase.js` và `firestore.rules`; hai giá trị phải khớp. Không chia sẻ mật khẩu hoặc khóa dịch vụ.
- Tạo tài khoản Email/Password trong Firebase Authentication → Users. Trong website → Dữ liệu đánh giá, quản trị viên nhập UID và chọn đơn vị được phép sửa; danh sách trống thu hồi quyền sửa.
- Quản trị viên thêm hoặc sửa kỳ đánh giá, danh sách đơn vị và chỉ tiêu. Danh mục khởi đầu trống cho đến khi có dữ liệu chính thức.
- Người được cấp quyền nhập điểm chỉ tiêu tạm thời theo thang 0–100 và liên kết `http`/`https` cho đơn vị được giao; người chưa đăng nhập chỉ xem dữ liệu công khai. Chức năng chưa tự tính điểm tổng hay xếp loại. Liên kết minh chứng cần có quyền truy cập phù hợp và không chứa dữ liệu nhạy cảm.
- Tài khoản được tạo trong Firebase Console, không tạo từ website. Chức năng không tải tệp minh chứng và không tự xóa dữ liệu.

## 📊 Thang điểm

| Điểm | Mức đánh giá |
|---|---|
| 90–100 | Xuất sắc |
| 85–dưới 90 | Rất tốt |
| 75–dưới 85 | Khá tốt |
| 50–dưới 75 | Hoàn thành |
| Dưới 50 | Chưa hoàn thành |

Điểm lẻ được xét theo khoảng liên tục. Ngưỡng điểm không tự bảo đảm tỷ lệ phân nhóm.
Trọng số và ngưỡng là đề xuất của bệnh viện, không phải tỷ lệ do WHO quy định.

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
