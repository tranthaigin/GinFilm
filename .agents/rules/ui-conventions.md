# 🎨 Quy Chuẩn Giao Diện (UI Conventions)

*(Dành cho Developer điền quy chuẩn thiết kế của dự án vào đây để AI làm theo)*

## 1. Hệ Thống Màu (Color Tokens)
- **Primary:** Màu thương hiệu chính của dự án (VD: Đỏ `#e61a27`).
- **Secondary:** Màu phụ.
- **Background:** Nền chính của web (VD: Đen nhám `#131313`).

## 2. Typography (Cấu Hình Font)
- Font chữ chính: [Tên font - VD: Inter, Roboto]
- Cỡ chữ chuẩn: Tiêu đề H1 (32px), Nội dung (14-15px).

## 3. Quy Tắc Viết TailwindCSS
- **Thứ tự class:** Xếp các class theo trật tự logic: Bố cục (Layout) -> Khoảng cách (Spacing) -> Chữ (Typography) -> Thẩm mỹ (Visuals - màu, viền, bóng).
- **Trạng thái (Hover/Active):** Mọi nút bấm đều phải có hiệu ứng.

## 4. Các Thành Phần Đặc Trưng (Specific UI Patterns)
- **Glassmorphism:** Hướng dẫn cách code hiệu ứng kính mờ chuẩn của dự án (VD: `bg-white/10 backdrop-blur-md border border-white/20`).
