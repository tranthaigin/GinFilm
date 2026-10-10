package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OtpToken;
import com.Cinema.movie_backend.entity.Otptype;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.OtpTokenRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;
    private final UserRepository userRepository;
    private final BrevoEmailSender brevoEmailSender;

    private static final int COOLDOWN_SECONDS = 60; // Chờ 1 phút để gửi lại
    private static final int EXPIRY_MINUTES = 5; // Hạn sử dụng 5 phút

    private static final String BANNER_URL = "https://res.cloudinary.com/sgfguxxl/image/upload/v1783493002/720805192_1541674700994423_2054380490015214293_n_paokop.jpg"; // TODO:
    // Thay
    // bằng
    // URL
    // banner
    // thật

    // TẠO VÀ GỬI MÃ OTP RANDOM
    @Transactional
    public void generateAndSendOtp(String email, Otptype type) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống!"));

        Optional<OtpToken> existingTokenOpt = otpTokenRepository.findByUserAndType(user, type);

        if (existingTokenOpt.isPresent()) {
            OtpToken existingToken = existingTokenOpt.get();

            // Chặn lại chống Spam và thông báo thời gian còn lại nếu chưa đủ 60 giây để tạo
            // mã mới
            if (existingToken.getCreatedAt().plusSeconds(COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration
                        .between(LocalDateTime.now(), existingToken.getCreatedAt().plusSeconds(COOLDOWN_SECONDS))
                        .toSeconds();
                throw new RuntimeException("Vui lòng đợi " + secondsLeft + " giây trước khi yêu cầu gửi lại mã !");
            }

            // Nếu đã qua 60 giây, xóa mã cũ đi để tạo mã mới
            otpTokenRepository.deleteByUserAndType(user, type);
        }

        String otpCode = String.format("%06d", new Random().nextInt(1000000)); // Tạo mã OTP 6 chữ số random
        OtpToken newToken = new OtpToken();
        newToken.setToken(otpCode);
        newToken.setUser(user);
        newToken.setType(type);
        newToken.setExpiryTime(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));

        otpTokenRepository.save(newToken);
        sendOtpEmail(email, user.getFullName(), otpCode, type);
    }

    // XÁC THỰC MÃ OTP
    public OtpToken validateOtp(String email, String otpCode, Otptype type) {
        // Tìm OTP dựa theo Email
        OtpToken otpToken = otpTokenRepository.findByEmailAndTokenAndType(email, otpCode, type)
                .orElseThrow(() -> new RuntimeException("Mã OTP không chính xác!"));

        // Kiểm tra hết hạn
        if (otpToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn! Vui lòng yêu cầu mã mới.");
        }
        return otpToken;
    }

    // Xoá mã OTP sau khi kích hoạt/đổi mật khẩu thành công
    @Transactional
    public void deleteOtp(OtpToken otpToken) {
        otpTokenRepository.delete(otpToken);
    }

    // Gửi email OTP cho XÁC THỰC TÀI KHOẢN hoặc KHÔI PHỤC MẬT KHẨU
    private void sendOtpEmail(String email, String fullName, String otpCode, Otptype type) {
        try {
            String subject = "";
            String htmlContent = "";

            switch (type) {
                case ACCOUNT_VERIFICATION:
                    subject = "Xác nhận đăng ký tài khoản - RapLoFilm";
                    htmlContent = buildVerificationEmailHtml(fullName, otpCode);
                    break;
                case PASSWORD_RESET:
                    subject = "Mã OTP Khôi phục mật khẩu - RapLoFilm";
                    htmlContent = buildPasswordResetEmailHtml(fullName, otpCode);
                    break;
                case PIN_RESET:
                    subject = "Mã OTP Đặt lại mã PIN - RapLoFilm";
                    htmlContent = buildPinResetEmailHtml(fullName, otpCode);
                    break;
                case UNLOCK_ACCOUNT:
                    subject = "Mã OTP Mở khóa tài khoản - RapLoFilm";
                    htmlContent = buildUnlockAccountEmailHtml(fullName, otpCode);
                    break;
            }

            brevoEmailSender.sendEmail(email, subject, htmlContent);
        } catch (Exception e) {
            throw new RuntimeException("Gửi email thất bại: " + e.getMessage(), e);
        }
    }

    // ===== HTML TEMPLATE: MỞ KHÓA TÀI KHOẢN =====
    private String buildUnlockAccountEmailHtml(String fullName, String otpCode) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Mở khóa tài khoản - RapLoFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"
                +
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL
                + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />"
                +
                "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Tài khoản của bạn đã bị khóa tạm thời do đăng nhập sai quá nhiều lần.</p>"
                +
                "<p style='margin:0 0 16px 0;'>Vui lòng sử dụng mã OTP dưới đây để mở khóa tài khoản của bạn:</p>"
                +
                "<tr><td align='center' style='padding:10px 0 30px 0;'>" +
                "<div style='display:inline-block;padding:15px 30px;background-color:#f9f9f9;border:2px dashed #c0392b;border-radius:8px;font-size:28px;font-weight:bold;color:#c0392b;letter-spacing:5px;'>"
                + otpCode + "</div>" +
                "</td></tr>" +
                "<tr><td style='padding:0 40px 30px 40px;color:#222222;font-size:14px;line-height:1.6;'>" +
                "<p style='margin:0 0 10px 0;color:#666666;'><em>Lưu ý: Mã OTP này sẽ hết hạn sau " + EXPIRY_MINUTES
                + " phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</em></p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a></p>"
                +
                "<p style='margin:0 0 4px 0;'><a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'>Website</a></p>"
                +
                "<p style='margin:0 0 0 0;'><a href='mailto:support@raplofilm.com' style='color:#c0392b; text-decoration:none;'>Email hỗ trợ</a></p>"
                +
                "</td></tr>" +
                "<tr><td style='background-color:#222222;padding:20px;text-align:center;color:#888888;font-size:12px;'>"
                +
                "© 2024 RapLoFilm. All rights reserved.<br>Đây là email tự động, vui lòng không trả lời." +
                "</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    // ===== HTML TEMPLATE: XÁC NHẬN TÀI KHOẢN =====
    private String buildVerificationEmailHtml(String fullName, String otpCode) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Xác nhận tài khoản - RapLoFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"
                +

                // Banner
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL
                + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />"
                +
                "</td></tr>" +

                // Nội dung
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +

                "<p style='margin:0 0 16px 0;'>Chào mừng bạn đến với <a href='https://raplofilm.com/home' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a>!</p>"
                +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Cảm ơn bạn đã đăng ký tài khoản tại <strong>RapLoFilm</strong>.</p>" +
                "<p style='margin:0 0 16px 0;'>Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng sử dụng mã xác nhận (OTP) bên dưới:</p>"
                +

                // OTP box
                "<div style='text-align:center;margin:24px 0;'>" +
                "<span style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:32px;" +
                "font-weight:bold;letter-spacing:10px;padding:16px 36px;border-radius:8px;" +
                "font-family:monospace;'>" + otpCode + "</span>" +
                "</div>" +

                "<p style='margin:0 0 16px 0;'>Lưu ý: Mã xác nhận có hiệu lực trong vòng <strong>5 phút</strong> kể từ thời điểm email được gửi.</p>"
                +
                "<p style='margin:0 0 32px 0;'>Nếu bạn không thực hiện yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.</p>"
                +

                // Footer
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a></p>"
                +
                "<p style='margin:0 0 4px 0;'><a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'>Website</a></p>"
                +
                "<p style='margin:0 0 0 0;'><a href='mailto:support@raplofilm.com' style='color:#c0392b; text-decoration:none;'>Email hỗ trợ</a></p>"
                +
                "</td></tr>" +

                // Copyright
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>"
                +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +

                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }

    // ===== HTML TEMPLATE: KHÔI PHỤC MẬT KHẨU =====
    private String buildPasswordResetEmailHtml(String fullName, String otpCode) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Khôi phục mật khẩu - RapLoFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"
                +

                // Banner
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL
                + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />"
                +
                "</td></tr>" +

                // Nội dung
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +

                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <a href='https://raplofilm.com/home' style='color:#c0392b;text-decoration:none'><strong>RapLoFilm</strong></a>.</p>"
                +
                "<p style='margin:0 0 16px 0;'>Để tạo mật khẩu mới, vui lòng sử dụng mã xác nhận (OTP) bên dưới:</p>" +

                // OTP box
                "<div style='text-align:center;margin:24px 0;'>" +
                "<span style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:32px;" +
                "font-weight:bold;letter-spacing:10px;padding:16px 36px;border-radius:8px;" +
                "font-family:monospace;'>" + otpCode + "</span>" +
                "</div>" +

                "<p style='margin:0 0 16px 0;'>Lưu ý: Mã này sẽ hết hạn sau <strong>5 phút</strong>.</p>" +
                "<p style='margin:0 0 32px 0;'>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn sẽ không bị thay đổi và tài khoản của bạn vẫn an toàn.</p>"
                +

                // Footer
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a></p>"
                +
                "<p style='margin:0 0 4px 0;'><a href='https://raplofilm.com' style='color:#c0392b; text-decoration:none;'>Website</a></p>"
                +
                "<p style='margin:0 0 0 0;'><a href='mailto:support@raplofilm.com' style='color:#c0392b; text-decoration:none;'>Email hỗ trợ</a></p>"
                +
                "</td></tr>" +

                // Copyright
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>"
                +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +

                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }

    // ===== HTML TEMPLATE: KHÔI PHỤC MÃ PIN =====
    private String buildPinResetEmailHtml(String fullName, String otpCode) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Đặt lại mã PIN - RapLoFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"
                +

                // Banner
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL
                + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />"
                +
                "</td></tr>" +

                // Nội dung
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +

                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Chúng tôi đã nhận được yêu cầu đặt lại mã PIN bảo mật cho tài khoản của bạn tại <a href='https://raplofilm.is-a.dev/home' style='color:#c0392b;text-decoration:none'><strong>RapLoFilm</strong></a>.</p>"
                +
                "<p style='margin:0 0 16px 0;'>Để tạo mã PIN mới, vui lòng sử dụng mã xác nhận (OTP) bên dưới:</p>" +

                // OTP box
                "<div style='text-align:center;margin:24px 0;'>" +
                "<span style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:32px;" +
                "font-weight:bold;letter-spacing:10px;padding:16px 36px;border-radius:8px;" +
                "font-family:monospace;'>" + otpCode + "</span>" +
                "</div>" +

                "<p style='margin:0 0 16px 0;'>Lưu ý: Mã này sẽ hết hạn sau <strong>5 phút</strong>.</p>" +
                "<p style='margin:0 0 32px 0;'>Nếu bạn không yêu cầu đặt lại mã PIN, vui lòng bỏ qua email này.</p>"
                +

                // Footer
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.is-a.dev/about' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a></p>"
                +
                "</td></tr>" +
                "<tr><td style='background-color:#f1f1f1;padding:20px;text-align:center;color:#666666;font-size:13px;'>"
                +
                "<p style='margin:0 0 4px 0;'> <a href='https://raplofilm.is-a.dev/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>"
                +
                "</td></tr>" +
                "<p style='margin:0 0 0 0;'><a href='mailto:support@raplofilm.com' style='color:#c0392b; text-decoration:none;'>Email hỗ trợ</a></p>"
                +

                "</td></tr>" +

                // Copyright
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>"
                +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +

                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }
}