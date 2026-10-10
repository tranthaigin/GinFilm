# Hướng dẫn Sử dụng: Tính năng Đánh giá, Báo cáo & Thông báo

Tài liệu này mô tả chi tiết luồng hoạt động của hệ thống Đánh giá phim và Báo cáo vi phạm, dành cho cả người dùng (User) và quản trị viên (Admin).

---

## 1. Dưới góc độ Người dùng (User)

### A. Viết và Tương tác Đánh giá
1. **Đăng đánh giá:** Khi bạn đang xem một bộ phim, bạn có thể để lại số sao (từ 1 đến 5) và viết nội dung đánh giá của mình. Ngay khi bấm Gửi, đánh giá sẽ lập tức hiện lên màn hình của bạn và tất cả mọi người đang xem phim đó (Real-time).
2. **Thích / Không thích (Like/Dislike):** Bạn có thể bấm Like hoặc Dislike cho các đánh giá của người khác. Số lượng Like/Dislike sẽ được cập nhật tức thời (Real-time).
3. **Đánh giá của chính mình:** Bạn luôn xem được nội dung đánh giá do chính mình viết một cách bình thường (không bao giờ bị làm mờ hay gắn cờ, trừ khi bị Admin gỡ bỏ hoàn toàn).

### B. Báo cáo Vi phạm và Spoil (Tiết lộ nội dung)
Nếu bạn thấy một đánh giá của người khác có vấn đề, bạn có 2 nút hành động:

**1. Báo cáo Vi phạm (Biểu tượng Cờ):**
- **Khi nào dùng:** Khi đánh giá có lời lẽ thô tục, chửi thề, spam, hoặc xúc phạm.
- **Thao tác:** Bấm vào biểu tượng cờ 🚩 -> Nhập lý do -> Gửi báo cáo.
- **Kết quả:** 
  - Đánh giá vẫn hiển thị bình thường.
  - Một báo cáo được gửi ngầm đến Admin. Nút cờ sẽ bị vô hiệu hóa để tránh spam báo cáo.

**2. Báo lỗi Spoil (Biểu tượng Mắt gạch chéo):**
- **Khi nào dùng:** Khi đánh giá tiết lộ trước nội dung phim làm ảnh hưởng trải nghiệm người xem sau.
- **Thao tác:** Bấm vào biểu tượng mắt gạch chéo 👁️‍🗨️.
- **Kết quả:** 
  - Gửi báo cáo đến Admin. 
  - **Đặc biệt:** Ngay lập tức, nội dung đánh giá đó sẽ **bị làm mờ đi đối với riêng màn hình của bạn**. Hệ thống hiểu rằng bạn không muốn đọc nó nữa. Các người dùng khác vẫn xem bình thường.
  - Nút báo spoil cũng bị mờ đi và không bấm được nữa.

### C. Nhận Thông báo (Notifications)
Bạn sẽ nhận được chuông thông báo trong các trường hợp sau:
- Ai đó trả lời (nếu có tính năng reply), like hoặc tương tác với đánh giá của bạn.
- Báo cáo bạn gửi đi đã được Admin xử lý. Hệ thống sẽ thông báo: *"Báo cáo của bạn đã được xử lý..."* (kèm kết quả là có vi phạm hay không).
- Nếu đánh giá do chính bạn viết bị Admin gỡ hoặc bị gắn cờ Spoil, bạn sẽ nhận được một cảnh báo: *"Một đánh giá của bạn đã bị gỡ bỏ do vi phạm..."* hoặc *"Đánh giá đã bị ẩn do Spoiler"*.

---

## 2. Dưới góc độ Quản trị viên (Admin)

Khi có người dùng báo cáo một đánh giá (dù là Vi phạm hay Spoil), hệ thống sẽ lập tức nhảy thông báo (chuông) cho Admin. 

### A. Quản lý Báo cáo
Admin truy cập vào trang **Quản lý báo cáo**. Giao diện chia làm 2 Tab rõ ràng:
- **Tab Báo cáo Vi phạm:** Chứa các báo cáo về nội dung thô tục, spam.
- **Tab Báo cáo Spoil:** Chứa các báo cáo về tiết lộ nội dung phim.

### B. Xử lý Báo cáo
Khi bấm **Xem chi tiết** một báo cáo, Admin có thể đọc nội dung đánh giá bị tố cáo và đưa ra quyết định:

**1. Đối với Tab Báo cáo Vi phạm:**
- **Từ chối báo cáo:** Báo cáo sai sự thật. Đánh giá của user bị tố cáo vẫn giữ nguyên. Người tố cáo sẽ nhận được thông báo là *"Báo cáo bị từ chối"*.
- **Xác nhận vi phạm & Ẩn đánh giá:** Báo cáo đúng. Đánh giá lập tức bị chuyển sang trạng thái `HIDDEN`. 
  - Ngay lập tức, đánh giá đó **biến mất khỏi màn hình** của tất cả mọi người đang xem phim đó (Real-time).
  - Người viết đánh giá sẽ bị nhận 1 thông báo cảnh cáo.
  - Người đi tố cáo nhận được thông báo cảm ơn.

**2. Đối với Tab Báo cáo Spoil:**
- **Từ chối báo cáo:** Giống như trên.
- **Đánh dấu Spoil & Ẩn:** Báo cáo đúng. Đánh giá bị gắn cờ `hasSpoiler`.
  - Ngay lập tức, trên màn hình của tất cả mọi người đang xem phim đó, đánh giá này sẽ **bị làm mờ đi** và hiện nhãn đỏ **SPOILER** (Real-time).
  - Người viết đánh giá nhận thông báo nhắc nhở. (Tuy nhiên, với chính họ, đánh giá của họ vẫn hiển thị rõ ràng, không bị làm mờ).

---

## 3. Trải nghiệm Real-time (Đồng bộ thời gian thực)
Điểm nhấn của toàn bộ luồng này là không ai cần phải F5 (tải lại trang):
- User A vừa viết đánh giá -> User B thấy ngay lập tức.
- User A vừa gửi báo cáo -> Admin thấy chuông thông báo ngay lập tức.
- Admin vừa ấn "Xác nhận vi phạm" -> Đánh giá vi phạm bốc hơi khỏi màn hình User A, B, C ngay lập tức.
- Admin vừa ấn "Đánh dấu Spoil" -> Đánh giá lập tức bị che mờ trên màn hình của tất cả mọi người.
