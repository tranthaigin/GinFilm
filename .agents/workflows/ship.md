# 🚀 Workflow: Bàn Giao & Đóng Gói (Ship Feature)

*(Quy trình kiểm duyệt bắt buộc trước khi hợp nhất (merge) code lên nhánh chính để phát hành)*

## Bước 1: Tự Rà Soát (Self-Review)
- Dọn dẹp code rác: Xóa bỏ các dòng `console.log()` hoặc biến không sử dụng.
- Kiểm tra lại theo quy chuẩn trong file `ui-conventions.md` và `PROJECT-RULES.md`.

## Bước 2: Chạy Công Cụ (Build & Lint)
- Chạy lệnh kiểm tra cú pháp (VD: `npm run lint`) để bảo đảm không có lỗi cảnh báo.
- Chạy lệnh đóng gói (VD: `npm run build` hoặc `mvn clean install`) để xem tiến trình compile có thành công không.

## Bước 3: Cập Nhật Tài Liệu
- Nếu có cấu hình mới (như thêm biến môi trường `.env`), bắt buộc ghi chú lại vào tài liệu.
- Cập nhật tài liệu API nếu có thêm Endpoints mới.

## Bước 4: Đóng Gói Bàn Giao (Commit)
- Tạo câu lệnh Git Commit tự động theo chuẩn Conventional Commits. (Ví dụ: `feat: tích hợp xong cổng thanh toán VNPay`).
