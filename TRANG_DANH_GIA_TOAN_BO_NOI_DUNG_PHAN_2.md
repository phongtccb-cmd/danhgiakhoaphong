## VII. CHI TIẾT TRẠNG THÁI TỪNG TỆP (PLAN A + PLAN B)

### PLAN A - 6 Tệp (79 KB)

#### 1. FORM_01 - Thu thập dữ liệu từ phòng khoa
- **Kích thước:** 8 KB
- **Mục đích:** 5 phòng chức năng tự báo cáo 6 lĩnh vực (KHÔNG yêu cầu khoa lâm sàng đánh giá chính họ)
- **Nội dung:** Dữ liệu định lượng từ HIS, tài chính, HR, khảo sát
- **Hạn chót:** Thứ 5, 17.11.2026
- **Cách dùng:** In ra, phòng chức năng điền, hoặc nhập vào sheet
- **Trạng thái:** ✅ HOÀN THÀNH, sẵn gửi

#### 2. FORM_02 - Khảo sát 5 BV tham khảo
- **Kích thước:** 7 KB
- **Mục đích:** Hỏi các BV khác dùng trọng số gì cho đánh giá phòng khoa?
- **Đối tượng:** 5 BV Grade I tương đồng (Chợ Rẫy, Bạch Mai, Bệnh viện C, Bệnh viện Y học Dự phòng, BV Thừa Thiên Huế)
- **Hạn chót:** Thứ 2, 19.11.2026 (8 ngày chờ đợi)
- **Dự tính phản hồi:** 3/5 = 60% (tùy mối quan hệ)
- **Trạng thái:** ✅ HOÀN THÀNH, sẵn gửi
- **Trigger decision:** Nếu <3 phản hồi → Chuyển PLAN B

#### 3. TEMPLATE_03_Phan_1 - Phân tích & điều chỉnh trọng số
- **Kích thước:** 18 KB
- **Mục đích:** Phân tích dữ liệu từ FORM_02 (5 BV) + so sánh với Ban A
- **Nội dung:**
  - Bảng so sánh 5 BV: Trọng số từng lĩnh vực
  - Tính toán hệ số điều chỉnh (adjustment coefficient)
  - Giải thích: tại sao điều chỉnh An toàn từ 10% → 15% (dựa trên 5 BV)
- **Dùng khi nào:** Nếu ≥3 FORM_02 phản hồi → Sử dụng TEMPLATE_03_Phan_1 (tuần 2)
- **Trạng thái:** ✅ HOÀN THÀNH
- **Lưu ý:** Bảng dữ liệu từ 5 BV sẽ được điền vào khi nhận phản hồi

#### 4. TEMPLATE_03_Phan_2 - Tính toán chi tiết + công thức
- **Kích thước:** 22 KB
- **Mục đích:** Chuyển đổi dữ liệu FORM_01 (5 phòng) thành điểm cuối cùng
- **Nội dung:**
  - Công thức tính từng lĩnh vực (ví dụ: Quản lý = Tuân thủ% + Vắng% × trọng số)
  - Bảng scoreboard thống kê (tóm tắt 5 phòng)
  - Phân loại nhóm A/B/C (20%-30%-50%)
  - Quy trình khiếu nại (nếu phòng phàn nàn)
- **Dùng khi nào:** Nếu ≥3 FORM_02 phản hồi → Sử dụng TEMPLATE_03_Phan_2 (tuần 2)
- **Trạng thái:** ✅ HOÀN THÀNH
- **Lưu ý:** Công thức có thể tự động hóa bằng Excel/Google Sheet

#### 5. PHUONG_PHAP_Benchmarking_va_Dieu_chinh_Trong_so
- **Kích thước:** 12 KB
- **Mục đích:** Giải thích phương pháp Benchmarking cho BGĐ
- **Nội dung:**
  - Lý thuyết Benchmarking (so sánh với BV tương đồng để tìm best practice)
  - Tại sao chọn 5 BV này (tiêu chí chọn lựa)
  - Cách tính adjustment coefficient (nếu 5 BV đặt An toàn 15% → chúng ta cũng 15%)
  - Q&A: "Tại sao không dùng trọng số từ BV khác?"
  - Biện luận: Benchmarking vs WHO (ưu/nhược điểm)
- **Dùng khi nào:** Trình bày BGĐ ngày 27.11 (Phần 1: Lý thuyết)
- **Trạng thái:** ✅ HOÀN THÀNH

#### 6. LICH_TRINH_Hanh_dong_Tuan_nay
- **Kích thước:** 10 KB
- **Mục đích:** Lịch trình chi tiết tuần 1-3 (khi nào làm gì, ai làm, hạn chót)
- **Nội dung:**
  - Tuần 1 (13-17.11): Gửi FORM + Nhắc nhở
  - Tuần 2 (18-24.11): Kiểm email + Quyết định + Tính toán
  - Tuần 3 (25-30.11): Trình BGĐ + Công bố kết quả
  - Daily checklist: 21 ngày × 1 task/ngày
- **Dùng khi nào:** Phòng TCCB tham khảo để follow-up hàng ngày
- **Trạng thái:** ✅ HOÀN THÀNH
- **Lưu ý:** Sử dụng chung cho PLAN A và PLAN B (tuần 1 & 3 giống)

### PLAN B - 7 Tệp (88.8 KB)

#### 1. README_PLAN_B_Huong_dan_Nhanh
- **Kích thước:** 6.7 KB
- **Mục đích:** Hướng dẫn nhanh PLAN B cho người mới (BGĐ, TCCB)
- **Nội dung:**
  - PLAN B là gì? Tại sao cần?
  - 6 tệp PLAN B: kích thước, mục đích, thời gian đọc
  - Trigger date: 19-20.11 (khi nào activate)
  - Q&A 3 câu thường gặp + trả lời
  - Action checklist hôm nay (13.11)
- **Dùng khi nào:** Hôm nay (13.11) để hiểu PLAN B là gì
- **Trạng thái:** ✅ HOÀN THÀNH

#### 2. PLAN_B_TOM_TAT_NHANH_1_TRANG
- **Kích thước:** 5.5 KB
- **Mục đích:** 1-trang quick reference (in ra, dán tường, mang theo)
- **Nội dung:**
  - Trọng số cuối cùng (PLAN B)
  - Lý do tăng An toàn 10% → 20% (WHO standard)
  - 3 câu hỏi khoa + trả lời
  - Trigger date & action
  - Liên hệ tài liệu (cần chi tiết → đọc file nào)
- **Dùng khi nào:** Trong cuộc họp BGĐ (ngày 27.11) nếu ai hỏi
- **Trạng thái:** ✅ HOÀN THÀNH

#### 3. PLAN_B_Chuan_WHO_va_Tieu_chuan_Quoc_te_Phan_1
- **Kích thước:** 15.8 KB
- **Mục đích:** Lý thuyết WHO + JCI + so sánh BV Thủ Đức
- **Nội dung:**
  - WHO Patient Safety Manual 2023-2024 (An toàn <0.5/1000 lượt BN)
  - JCI v7.1 standards (An toàn 20-25%)
  - ISO 9001 (quản lý chất lượng)
  - Bộ Y tế Thông tư 36/2015 (báo cáo an toàn bắt buộc)
  - So sánh: BV Thủ Đức vs WHO chuẩn (45 tai nạn/năm = 20.4X VƯỢT)
  - Đề xuất: điều chỉnh An toàn từ 10% → 20% để bắt kịp WHO
- **Dùng khi nào:** Trình bày BGĐ ngày 27.11 (Phần 1: Lý thuyết)
- **Trạng thái:** ✅ HOÀN THÀNH
- **Lưu ý:** Chỉ dùng nếu PLAN B được kích hoạt (20.11)

#### 4. PLAN_B_Chuan_WHO_Phan_2_Template
- **Kích thước:** 20.5 KB
- **Mục đích:** Data entry + tính toán trọng số theo WHO
- **Nội dung:**
  - Bảng data entry từ FORM_01 (5 phòng)
  - Công thức chuyển đổi sang WHO chuẩn
  - Constraint validation (An toàn ≥10%, Chất lượng ≥20%, etc.)
  - Summary scorecard với bar chart (🟢🟡🔴 status)
  - Q&A 4 scenario: "Tại sao An toàn 20?", "WHO quá cao?", "Có thể gian lận?", "Phòng sẽ phàn nàn?"
  - Execution roadmap nếu chuyển PLAN B (ngày 20-23.11 làm gì)
- **Dùng khi nào:** Nếu PLAN B được kích hoạt (20.11) → Nhập dữ liệu & tính toán (20-23.11)
- **Trạng thái:** ✅ HOÀN THÀNH
- **Lưu ý:** Template này là thực thi = phải điền dữ liệu vào

#### 5. PLAN_B_Chuan_WHO_Phan_3_Bang_Du_lieu_Thanh_khong
- **Kích thước:** 15.3 KB
- **Mục đích:** Tài liệu tham khảo chi tiết (WHO số liệu, JCI trọng số, Bộ Y tế tiêu chí)
- **Nội dung:**
  - WHO indicators chi tiết: Medication errors <0.1%, Surgical errors <0.01%, Falls <1.5/1000, SSI <2%, CLABSI <1, CAUTI <1
  - JCI weighting breakdown (An toàn 20-25%, Chất lượng 40-50%, Leadership 10-15%, Finance 10-15%)
  - Bộ Y tế mandatory indicators (safety reporting, quality thresholds, ROI <10%)
  - Bảng so sánh: BV vs WHO vs JCI vs Bộ Y tế
  - Tài liệu tham khảo (WHO, JCI, ISO, BV tham khảo URLs)
  - Hướng dẫn: trang nào dùng khi trình BGĐ (mỗi câu hỏi → trang mấy)
- **Dùng khi nào:** Chuẩn bị slide (tuần 2) + Trình bày BGĐ (tuần 3)
- **Trạng thái:** ✅ HOÀN THÀNH

#### 6. SO_SANH_PLAN_A_vs_PLAN_B
- **Kích thước:** 14.5 KB
- **Mục đích:** So sánh A/B + trigger decision + timeline
- **Nội dung:**
  - Comparison matrix (data source, time, risk, credibility, complexity)
  - PLAN A chi tiết (ưu/nhược điểm)
  - PLAN B chi tiết (ưu/nhược điểm)
  - Event trigger timeline: 19.11 9am kiểm email → 20.11 noon quyết định
  - Integrated 3-week execution (tuần 1 & 3 giống, tuần 2 khác nhau)
  - Defense strategies: nếu BGĐ hỏi "tại sao chuyển sang WHO?"
  - Recommendation: luôn chuẩn bị cả A & B
  - Checklist: 17 tệp cần có (10 PLAN A + 5 PLAN B + 2 lý thuyết)
- **Dùng khi nào:** BGĐ decide ngày 20.11 (bảng so sánh)
- **Trạng thái:** ✅ HOÀN THÀNH

#### 7. INDEX_COMPLETE_PLAN_A_B_2027
- **Kích thước:** 10.5 KB
- **Mục đích:** Master index (tất cả 17 tệp + lịch trình + quick lookup)
- **Nội dung:**
  - Inventory 17 tệp (6 PLAN A + 5 PLAN B + 4 lý thuyết + 2 support)
  - Day-by-day reading schedule (tuần 1: đọc INDEX + LICH_TRINH; tuần 2: đọc TEMPLATE; tuần 3: đọc Phan_1,3 khi defend)
  - PLAN A vs B comparison matrix (quyết định khi nào dùng)
  - Quick-lookup by question: 15 câu hỏi → file nào + section mấy
  - Support contact matrix: nếu cần giúp → liên hệ ai
  - Checklist hàng ngày (21 ngày)
- **Dùng khi nào:** Hôm nay (13.11) để xác định "cần đọc file nào?"
- **Trạng thái:** ✅ HOÀN THÀNH

### Support Files
- PLAN_B_Executive_Summary_EN.md (6.8 KB) - Tóm tắt tiếng Anh cho nước ngoài/quốc tế

---

## VIII. CHI TIẾT CÔNG VIỆC HÔM NAY (13.11.2026)

### Buổi sáng (30 phút)
- [ ] Đọc file này: TRANG_DANH_GIA_TOAN_BO_NOI_DUNG (15 phút)
- [ ] Đọc README_PLAN_B_Huong_dan_Nhanh.md (5 phút)
- [ ] Đọc SO_SANH_PLAN_A_vs_PLAN_B phần I-II (10 phút)
- ✅ Hiểu rõ: PLAN A & B là gì, khi nào dùng

### Buổi chiều (2 giờ)
- [ ] Chuẩn bị email gửi FORM_01 (5 phòng) - 30 phút
  - Email template: "Yêu cầu tự báo cáo 6 lĩnh vực theo form đính kèm"
  - Hạn chót: Thứ 5, 17.11
  - Người gửi: Phòng TCCB
  
- [ ] Chuẩn bị email gửi FORM_02 (5 BV) - 1 giờ
  - Email template: "Hỏi BV khác dùng trọng số gì cho đánh giá phòng khoa?"
  - Người gửi: Phòng TCCB / Giám đốc (tùy mối quan hệ)
  - Hạn chót: Thứ 2, 19.11 (8 ngày)
  
- [ ] Draft slide ngắn (15-20 slides) - 30 phút
  - Slide 1-5: Lý thuyết 6 lĩnh vực + Balanced Scorecard
  - Slide 6-10: PLAN A (Benchmarking) + dữ liệu từ 5 BV (placeholder)
  - Slide 11-15: PLAN B (WHO) + so sánh An toàn
  - Slide 16-20: Kết quả & Q&A

### Buổi tối (optional)
- [ ] Gửi email FORM_01 & FORM_02 (nếu cấp trên chấp thuận)
- [ ] Chuẩn bị slide chi tiết (có thể kéo dài vào tuần 2)


*Trang này sẽ được cập nhật khi có thay đổi (cuối tuần mỗi tuần)*
*Liên hệ: Phòng Tổ chức cán bộ (TCCB)*
*Ngày cập nhật: 13.11.2026 14:53*
