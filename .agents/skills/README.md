# 🧰 Danh Mục Kỹ Năng (Skills) Của Trợ Lý Trí Tuệ Nhân Tạo

*(Tài liệu này liệt kê các kỹ năng (skills) thực tế đã được cấu hình cho AI Agent để tương tác với dự án **frontend** (React, Vite, TailwindCSS, Zustand))*

## 1. Nhóm Kỹ Năng Phân Tích & Giải Thích
- **`ai-lookup`**: Kỹ năng tra cứu nhanh tài liệu nội bộ, tìm kiếm cấu trúc thư mục hoặc cách hoạt động của các Components cốt lõi.
- **`explain`**: Phân tích và giải thích các luồng dữ liệu phức tạp trong state management (Zustand), hoặc cách các thành phần gọi API (Axios).

## 2. Nhóm Kỹ Năng Giao Diện (UI/UX)
- **`setup-ui-foundation`**: Khởi tạo cấu hình gốc cho giao diện (Theme, cấu hình biến màu TailwindCSS) theo đúng chuẩn phong cách của dự án.
- **`compact-ui`**: Kỹ năng tự động tối ưu hóa và làm gọn các chuỗi class dài dòng của TailwindCSS trong các file JSX.
- **`setup-sidepanel`**: Kỹ năng tự động sinh mã nguồn tạo khung giao diện Sidepanel (thanh trượt bên hông) chuẩn với hiệu ứng trượt.
- **`fix-popup-isolation-and-toggle`**: Chuyên xử lý và vá các lỗi phổ biến của hệ thống Popup/Modal như: bị che khuất (z-index), lỗi click ra ngoài không tự đóng (click-outside), hoặc đè chéo giao diện.

## 3. Nhóm Kỹ Năng Phát Triển (Development)
- **`build-feature`**: Tự động tạo bộ khung mã nguồn (scaffolding) cho một tính năng (feature) hoàn toàn mới, phân chia sẵn thư mục `components`, `pages`, API logic theo chuẩn dự án.
- **`write-test`**: Tự động đọc file và sinh mã kiểm thử (Unit Test/Component Test) tương ứng.

## 4. Khả Năng Gọi Terminal Lệnh
Trong quá trình làm việc, AI nhận thức được dự án sử dụng Vite và có thể chạy các lệnh NPM sau ở thư mục `frontend`:
- `npm run dev`: Chạy máy chủ cục bộ (dev server).
- `npm run lint`: Chạy kiểm tra chuẩn mã (ESLint).
- `npm run build`: Đóng gói ứng dụng (Production Build).
