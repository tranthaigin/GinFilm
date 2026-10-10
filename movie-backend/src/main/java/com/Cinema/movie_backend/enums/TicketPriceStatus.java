package com.Cinema.movie_backend.enums;

public enum TicketPriceStatus {
    ACTIVE,   // Đang áp dụng – hiển thị và có hiệu lực
    INACTIVE, // Không áp dụng – ngừng hiệu lực
    HIDDEN    // Ẩn – không hiển thị nhưng vẫn lưu trong DB (thay thế is_hidden)
}
