# 🛡️ Các Quy Tắc & Hướng Dẫn Dự Án

## 1. Chiến Lược Quản Lý Mã Nguồn (Git & Branching)
- **Đặt Tên Nhánh:** 
  - Tính năng mới: `feature/tên-tính-năng`
  - Sửa lỗi: `bugfix/tên-lỗi`
  - Sửa lỗi khẩn cấp: `hotfix/tên-lỗi`
- **Thông Điệp Lưu (Commit Messages):** Sử dụng chuẩn chung:
  - `feat: [Mô tả]` cho tính năng mới
  - `fix: [Mô tả]` cho vá lỗi
  - `refactor: [Mô tả]` cho cấu trúc lại mã
- **Nhánh Chính:** Sử dụng `main` cho repository cá nhân. Tự rà soát thay đổi và chạy các kiểm tra phù hợp trước khi gộp nhánh hoặc push.

## 2. Tiêu Chuẩn Viết Mã
### 🖥️ Giao Diện (Frontend - React)
- Sử dụng Functional Components và Hooks. Không dùng Class Components.
- Tạo Kiểu (Styling): Sử dụng TailwindCSS, hạn chế viết CSS tùy chỉnh trừ khi thật sự cần thiết.
- Cấu trúc thư mục phân chia theo từng tính năng (Feature-based structure).

### ⚙️ Máy Chủ (Backend - Spring Boot)
- Tuân thủ nguyên tắc thiết kế SOLID.
- Kiến trúc chuẩn 3 lớp: `Bộ Điều Khiển (Controller)` -> `Dịch Vụ (Service)` -> `Kho Lưu Trữ (Repository)`.
- Bộ điều khiển chỉ xử lý luồng yêu cầu/phản hồi, toàn bộ logic nghiệp vụ cốt lõi phải nằm ở lớp Dịch Vụ.

## 3. Quy Tắc Đặt Tên (Naming Conventions)
- **Thư mục/Tập tin:** Dùng chữ thường có dấu gạch ngang (`kebab-case`) cho thư mục, viết hoa chữ cái đầu (`PascalCase`) cho tập tin React Component.
- **Biến/Hàm:** Viết hoa chữ cái đầu của từ thứ 2 trở đi (`camelCase`).
- **Hằng số:** Viết hoa toàn bộ và phân cách bằng gạch dưới (`UPPER_SNAKE_CASE`).
- **Cơ Sở Dữ Liệu:** Bảng và cột dùng chữ thường phân cách bằng gạch dưới (`snake_case`).

## 4. Nguyên Tắc Bảo Mật
- **KHÔNG BAO GIỜ** tải tập tin `.env` hoặc các mã khóa bí mật lên Github.
- Xác thực toàn bộ dữ liệu đầu vào từ người dùng (ở cả frontend và backend).
- Đảm bảo các đường dẫn nhạy cảm đều được bảo vệ bởi rào chắn xác thực.
