# 🗄️ Cấu Trúc & Tài Liệu Dữ Liệu

## 1. Sơ Đồ Cơ Sở Dữ Liệu (Database Schema)
*(Mô tả hoặc đính kèm đường dẫn đến Sơ Đồ Thực Thể - Liên Kết)*

### Bảng: `users` (Người Dùng)
| Cột | Kiểu dữ liệu | Ràng buộc | Ghi chú |
|-----|-------------|-----------|---------|
| id | UUID/Long | Khóa chính | Số định danh |
| username | VARCHAR | Độc nhất | Tên đăng nhập |
| password | VARCHAR | | Đã mã hóa bcrypt |
| role | VARCHAR | | Khách hàng / Quản trị viên |

### Bảng: `movies` (Phim)
*(Mô tả tương tự)*

## 2. Dữ Liệu Giả / Mẫu (Mock Data)
- Tập tin JSON chứa dữ liệu mẫu để thử nghiệm giao diện nằm ở đâu?
  - VD: `src/features/user/api/mocks/mockIndex.js`

## 3. Luồng Dữ Liệu (Data Flow)
- Cách dữ liệu chạy từ Cơ Sở Dữ Liệu -> Backend (Spring Boot) -> Dữ liệu JSON -> Trạng thái giao diện (Zustand).
