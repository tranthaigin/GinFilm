# 🔄 Workflow: Bắt Nhịp Dự Án (Catch Up)

*(Quy trình dùng khi một thành viên mới hoặc AI cần nắm bắt bối cảnh toàn dự án một cách nhanh chóng nhất)*

## Bước 1: Quét Cấu Trúc Tổng Quan
- Khảo sát các file hệ thống (như `package.json` hoặc `pom.xml`) để biết các thư viện cốt lõi đang dùng.
- Duyệt cây thư mục từ ngoài vào trong.

## Bước 2: Đọc Tài Liệu Lõi
- Đọc file `docs/ARCHITECTURE.md` để lấy góc nhìn bao quát toàn hệ thống.
- Đọc file `docs/PROJECT-RULES.md` để ghi nhớ luật lệ viết code của team.

## Bước 3: Tìm Hiểu Trạng Thái Hiện Tại
- (Tùy chọn) Chạy lệnh Git để xem các commit gần nhất: `git log -n 5`.
- Tìm hiểu thư mục chứa mã nguồn chính (VD: `src/features/` trong frontend) để thấy cấu trúc module.
