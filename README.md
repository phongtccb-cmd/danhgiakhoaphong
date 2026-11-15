# 🏥 Hệ thống Đánh giá Hoạt động Khoa Phòng

Bệnh viện Đa khoa Thủ Đức - Hạng I trực thuộc Sở Y tế TP.HCM

## 📋 Giới thiệu

Hệ thống đánh giá hoạt động của 49 phòng, khoa và cơ sở thuộc 3 nhóm:
- 10 phòng chức năng và khoa Dược: 11 đơn vị
- 29 khoa lâm sàng và 2 cơ sở: 31 đơn vị
- 7 khoa cận lâm sàng (không tính khoa Dược)

Khung đánh giá gồm:
- **5 lĩnh vực chính** (Quản lý 19%, Chất lượng 24%, Tài chính 20%, Nhân sự 17%, An toàn 20%)
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
- Quản trị viên có thể xem và nhập các đơn vị còn thiếu theo Quyết định 949 tại mục **Dữ liệu đánh giá**. Danh sách gồm 49 đơn vị; Khoa Truyền nhiễm tạm ghép Khoa Nội tổng hợp và không tạo đơn vị riêng. Việc nhập không tự chạy, không sửa hoặc xóa đơn vị có sẵn; tên khác, nhóm sai hoặc tên trùng phải được đối chiếu trước. Không nhập danh mục đồng thời từ nơi khác.
- Sau khi đủ 49 đơn vị, quản trị viên dùng **Nạp tiêu chí và phân công theo CSV** để thêm bộ tiêu chí đo lường và gán theo nhóm. Tệp có 43 tiêu chí đo lường và 2 dòng điểm tham chiếu không nhập số liệu.
- Tab **Dữ liệu đánh giá** chia 3 nhóm đơn vị; chọn đơn vị, tháng và năm để xem/cập nhật từng tiêu chí theo CSV. Tài khoản chỉ nhập cho đơn vị được cấp quyền.
- Hệ thống đối chiếu ngưỡng số và chiều đạt rõ trong CSV để tính điểm tại tab Theo dõi định kỳ. Một số trường đo/ngưỡng còn thiếu hoặc cần rà soát; các tiêu chí đó chưa được chấm. Liên kết minh chứng cần có quyền truy cập phù hợp và không chứa dữ liệu nhạy cảm.
- Tài khoản được tạo trong Firebase Console, không tạo từ website. Chức năng không tải tệp minh chứng và không tự xóa dữ liệu.

### Theo dõi quý và tổng hợp năm

- Bảng theo dõi lấy danh mục đơn vị từ Firebase và đối chiếu số lượng theo 3 nhóm (11/31/7); chưa đủ dữ liệu thì chỉ hiển thị những đơn vị đã có. Chọn tên đơn vị để xem các khía cạnh và số liệu chỉ tiêu đã gán.
- Tab **Theo dõi định kỳ** chỉ chọn Quý I–IV hoặc Cả năm; số liệu nguồn vẫn được cập nhật theo tháng tại **Dữ liệu đánh giá**.
- Kết quả năm được tổng hợp từ bốn kết quả quý. Mỗi quý cần đủ trạng thái số liệu của ba tháng tương ứng; thiếu quý nào thì kết quả năm báo thiếu quý đó.
- Mỗi lĩnh vực có điểm tối đa bằng trọng số trên thang 100. Chia đều điểm tối đa cho các tiêu chí CSV của nhóm: đạt ngưỡng được đủ điểm tiêu chí, không đạt được 0. Tính toán không làm tròn từng tiêu chí, kết quả hiển thị tối đa hai chữ số thập phân.
- Tổng điểm là tổng 5 lĩnh vực; thứ hạng tính riêng trong từng nhóm và chỉ áp dụng cho đơn vị đã đủ điểm cả 5 lĩnh vực. Đơn vị thiếu điểm vẫn có thể hiển thị tổng tạm tính nhưng chưa được xếp hạng. Đồng điểm cùng hạng theo kiểu cạnh tranh (1, 1, 3).
- Thiếu dữ liệu, chưa đến kỳ, không phát sinh, ngưỡng hoặc chiều đạt chưa rõ, cấu hình không khớp CSV đều chưa xác định; không coi là không đạt hay 0 điểm. Điểm lĩnh vực chưa đủ tiêu chí chỉ là tổng tạm tính của các tiêu chí đã xác định.
- Khối phòng ban và Dược dùng điểm tham chiếu Tài chính và An toàn là trung bình cộng điểm cùng lĩnh vực của từng đơn vị lâm sàng, cận lâm sàng đã đủ điểm lĩnh vực. Khi chưa đủ 38 đơn vị, trung bình này là tạm tính và hiển thị số đơn vị đã đủ điểm.
- Tỷ lệ chỉ nhập một ô theo CSV (giường nội trú, vệ sinh tay) nhập theo phần trăm: 80 tương ứng 80%, không nhập 0,8. Cần rà soát các số liệu đã nhập trước khi sử dụng điểm. Tỷ lệ có tử số và mẫu số tiếp tục nhập hai số liệu gốc.
- Hai tab cùng sử dụng các bộ sưu tập theo dõi và số liệu tháng trong Firestore. Bộ tiêu chí CSV cần được quản trị viên nạp và gán trước; các chỉ tiêu cấu hình thủ công vẫn được giữ lại.
- Định nghĩa theo dõi và việc gán hiện chỉ được tạo mới, không sửa/xóa trên giao diện. Không có hiệu lực theo ngày; phải rà soát trước khi tạo và không dùng để thay đổi phạm vi chỉ tiêu theo từng kỳ. Danh mục này tách khỏi danh mục điểm nhập thủ công hiện có.
- Người được cấp quyền nhập dữ liệu tháng của đơn vị: số liệu, thiếu dữ liệu, chưa đến kỳ đo hoặc không phát sinh. Không gán chỉ tiêu cho đơn vị nghĩa là chưa cấu hình áp dụng, không phải điểm 0.
- Từng quý tổng hợp dữ liệu ba tháng: tỷ lệ gộp tử số và mẫu số rồi nhân 100; chỉ số trên mẫu số giữ nguyên đơn vị; cộng dồn cộng giá trị tháng; giá trị gần nhất lấy tháng có số liệu cuối cùng trong quý. Kết quả năm gộp bốn quý theo cùng quy tắc; tỷ lệ gộp tử số/mẫu số quý, cộng dồn cộng giá trị quý, giá trị gần nhất lấy quý có số liệu cuối cùng. Mẫu số bằng 0 được ghi là không phát sinh, không tính kết quả.
- Phương pháp tổng hợp cho tiêu chí CSV được hệ thống suy ra tạm thời từ các trường trong tệp, chưa được phê duyệt; cần đối chiếu trước khi sử dụng chính thức. Các chỉ tiêu tích lũy hoặc tính theo ngày cần đặc biệt rà soát để tránh tổng hợp sai hoặc gộp trùng.
- Điểm theo ngưỡng CSV được tính tự động nhưng số liệu chưa được xác nhận hoặc khóa kỳ; chưa tính điểm cộng/trừ. Ngưỡng dạng chữ hoặc theo tiến độ từng quý, ví dụ CME và chênh lệch thu–chi, chưa được tự chấm.
- Sau thay đổi, cập nhật Firestore Rules từ `firestore.rules` và kiểm thử quyền, bao gồm tiêu chí chênh lệch thu–chi có thể âm; tải tệp lên GitHub không tự công bố quy tắc.

## 📊 Thang điểm

| Điểm | Mức đánh giá |
|---|---|
| 90–100 | Xuất sắc |
| 85–dưới 90 | Rất tốt |
| 75–dưới 85 | Khá tốt |
| 50–dưới 75 | Hoàn thành |
| Dưới 50 | Chưa hoàn thành |

## 📞 Liên hệ

**Phòng Tổ chức Cán bộ - Bệnh viện Đa khoa Thủ Đức**

- 📧 Email: phongtccb@bvdktd.vn
- 🏢 Văn phòng: Trung tâm Hành chính - Đào tạo, Bệnh viện Đa khoa Thủ Đức

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
