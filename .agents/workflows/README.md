# 🔄 Mẫu Quy Trình Tự Động Của Trợ Lý Trí Tuệ Nhân Tạo

*(Tài liệu này định nghĩa các quy trình làm việc tự động gồm nhiều bước dành cho AI Agent)*

## 1. Quy Trình Kiểm Tra Mã Nguồn (Code Review)
1. **Điều Kiện Kích Hoạt:** Khi có một yêu cầu hợp nhất mới (PR) hoặc người dùng yêu cầu kiểm tra mã.
2. **Các Bước Thực Hiện:**
   - Quét mã nguồn tìm lỗ hổng bảo mật hoặc vi phạm quy chuẩn viết mã.
   - So sánh với tài liệu `PROJECT-RULES.md`.
   - Lập báo cáo lỗi và đề xuất cách sửa (tạo tập tin khác biệt - diff).

## 2. Quy Trình Sửa Lỗi (Fix Bug)
1. **Điều Kiện Kích Hoạt:** Người dùng cung cấp bản ghi Lỗi (Error Log).
2. **Các Bước Thực Hiện:**
   - Đọc và phân tích Chuỗi Lỗi Dây Chuyền (Stack Trace).
   - Khoanh vùng tập tin gây lỗi bằng cách dùng công cụ tìm kiếm mã.
   - Đề xuất giải pháp và xin phép người dùng để tiến hành sửa.
   - Chạy thử kiểm thử đơn vị (Unit Test) sau khi sửa xong.

## 3. Quy Trình Triển Khai (Deployment)
- Các bước cần thiết để đóng gói Giao Diện (Vite build) và Máy Chủ (Maven build).
- Hướng dẫn cấu hình môi trường khởi chạy phần mềm mảng (Docker).
