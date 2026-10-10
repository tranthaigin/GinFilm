# 🐛 Workflow: Quy Trình Gỡ Lỗi (Fix Bug)

*(Hướng dẫn các bước phân tích và sửa lỗi một cách bài bản)*

## Bước 1: Tái Tạo Lỗi (Reproduction)
- Thu thập Logs, Stack Trace hoặc thông báo lỗi (Error Message) từ màn hình Console.
- Xác định môi trường xảy ra lỗi (Local, Production, hay ở thiết bị nào).

## Bước 2: Khoanh Vùng Vấn Đề (Isolation)
- Dùng công cụ tìm kiếm mã nguồn (Search/Grep) để tìm file hoặc hàm nghi ngờ.
- Đọc kĩ logic bên trong các luồng gọi API hoặc nơi cập nhật trạng thái (State).

## Bước 3: Đề Xuất & Sửa Lỗi (Resolution)
- Đưa ra giải pháp an toàn, ít gây hiệu ứng phụ (side-effects) lên các thành phần khác nhất.
- Thực hiện sửa code. Kiểm tra xem các thẻ import có bị vỡ hay thiếu không.

## Bước 4: Kiểm Thử Đóng Gói (Verification)
- Lưu file và Refresh lại ứng dụng.
- Đề xuất bổ sung 1 Unit Test hoặc thêm bình luận (comment) tại khu vực vừa sửa để ngăn ngừa đồng đội phá vỡ (regression) trong tương lai.
