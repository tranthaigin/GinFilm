# 🎨 Tài Liệu Thiết Kế Giao Diện / Trải Nghiệm (UI/UX)

## 1. Hệ Thống Thiết Kế (Design System)
- **Bản Vẽ Figma:** [Đường dẫn tới bản vẽ Figma nếu có]
- **Chủ Đề Chính:** Chế độ tối (Dark Mode) kết hợp hiệu ứng kính mờ (Glassmorphism).

## 2. Bảng Màu (Color Palette)
- **Màu Nền Chính:** `#131313` (Đen nhám)
- **Màu Chủ Đạo:** `#e61a27` (Đỏ GinFilm)
- **Màu Chữ (Chính):** `#ffffff` (Trắng)
- **Màu Chữ (Phụ):** `#a1a1aa` (Xám nhạt)

## 3. Kiểu Chữ (Typography)
- **Phông Chữ:** Inter, Roboto.
- **Kích Thước Chuẩn:** 
  - Tiêu đề 1: 32px
  - Tiêu đề 2: 24px
  - Chữ nội dung: 14px / 15px

## 4. Nguyên Tắc Thiết Kế Thành Phần
- **Nút Bấm (Buttons):** Luôn có hiệu ứng khi rà chuột (`hover:brightness-110`, `hover:scale-105`), bo góc `rounded-xl` hoặc `rounded-[2px]` cho nút kiểu cứng cáp.
- **Khung Nổi / Thẻ (Cards/Modals):** Bắt buộc dùng hiệu ứng nền kính mờ `backdrop-blur-xl`, nền trong suốt `bg-white/10` kết hợp viền mờ `border-white/20`.
- **Thông Báo (Toasts):** Hiện ở góc phải trên cùng, tự động ẩn sau 3 giây.
