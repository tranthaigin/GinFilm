package com.Cinema.movie_backend.entity;

public enum Otptype {
    PASSWORD_RESET, // Dùng để reset mật khẩu khi user quên mật khẩu
    ACCOUNT_VERIFICATION, // Dùng để gửi mã otp khi user đăng ký tài khoản mới và cần xác thực email (Dùng
                          // GG luôn ACTIVTE status)
    PIN_RESET, // Dùng để reset mã PIN 6 số
    UNLOCK_ACCOUNT // Dùng để gửi otp mở khóa khi đăng nhập sai 5 lần
}
