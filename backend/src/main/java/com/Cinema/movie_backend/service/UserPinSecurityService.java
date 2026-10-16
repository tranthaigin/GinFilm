package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Otptype;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.UserPinSecurity;
import com.Cinema.movie_backend.repository.UserPinSecurityRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.Cinema.movie_backend.entity.NotificationType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserPinSecurityService {

    private final UserPinSecurityRepository userPinSecurityRepository;
    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public boolean hasPinSetup(String email) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        return userPinSecurityRepository.findByUserId(user.getId()).isPresent();
    }

    @Transactional
    public void setupPin(String email, String pin, String confirmPin) {
        if (!pin.equals(confirmPin)) {
            throw new RuntimeException("Mã PIN không khớp.");
        }
        if (pin.length() != 6 || !pin.matches("\\d+")) {
            throw new RuntimeException("Mã PIN phải bao gồm 6 chữ số.");
        }

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        if (userPinSecurityRepository.findByUserId(user.getId()).isPresent()) {
            throw new RuntimeException("Bạn đã thiết lập mã PIN rồi.");
        }

        UserPinSecurity pinSecurity = UserPinSecurity.builder()
                .user(user)
                .pinCode(passwordEncoder.encode(pin))
                .failedPinAttempts(0)
                .build();
        userPinSecurityRepository.save(pinSecurity);
        
        String notifMsg = "Bạn đã thiết lập mã PIN bảo mật thành công. Vui lòng bảo mật mã PIN của mình.";
        notificationService.sendNotification(user, "Thiết lập mã PIN thành công", notifMsg, "/profile", NotificationType.SYSTEM);
        emailService.sendSimpleEmail(email, "Thiết lập mã PIN thành công - GinFilm", notifMsg);
    }

    @Transactional
    public void requestForgotPin(String email) {
        otpService.generateAndSendOtp(email, Otptype.PIN_RESET);
    }

    @Transactional
    public void resetPin(String email, String otp, String newPin, String confirmPin) {
        if (!newPin.equals(confirmPin)) {
            throw new RuntimeException("Mã PIN mới không khớp.");
        }
        if (newPin.length() != 6 || !newPin.matches("\\d+")) {
            throw new RuntimeException("Mã PIN phải bao gồm 6 chữ số.");
        }

        // Validate OTP (OtpService throws exception if invalid)
        var otpToken = otpService.validateOtp(email, otp, Otptype.PIN_RESET);

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        UserPinSecurity pinSecurity = userPinSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Chưa thiết lập mã PIN, không thể reset."));

        pinSecurity.setPinCode(passwordEncoder.encode(newPin));
        pinSecurity.setFailedPinAttempts(0);
        pinSecurity.setPinLockedUntil(null);
        userPinSecurityRepository.save(pinSecurity);

        // Delete OTP after successful reset
        otpService.deleteOtp(otpToken);

        String notifMsg = "Bạn đã đặt lại mã PIN thành công. Vui lòng bảo mật mã PIN của mình.";
        notificationService.sendNotification(user, "Đặt lại mã PIN thành công", notifMsg, "/profile", NotificationType.SYSTEM);
        emailService.sendSimpleEmail(email, "Đặt lại mã PIN thành công - GinFilm", notifMsg);
    }

    @Transactional
    public void changePin(String email, String otp, String oldPin, String newPin, String confirmPin) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        UserPinSecurity pinSecurity = userPinSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Chưa thiết lập mã PIN."));

        if (!passwordEncoder.matches(oldPin, pinSecurity.getPinCode())) {
            throw new RuntimeException("Mã PIN hiện tại không chính xác.");
        }

        if (!newPin.equals(confirmPin)) {
            throw new RuntimeException("Mã PIN mới không khớp.");
        }
        if (newPin.length() != 6 || !newPin.matches("\\d+")) {
            throw new RuntimeException("Mã PIN mới phải bao gồm 6 chữ số.");
        }

        // Validate OTP (throws exception if invalid)
        var otpToken = otpService.validateOtp(email, otp, Otptype.PIN_RESET);

        pinSecurity.setPinCode(passwordEncoder.encode(newPin));
        userPinSecurityRepository.save(pinSecurity);

        // Delete OTP after successful reset
        otpService.deleteOtp(otpToken);

        String notifMsg = "Bạn đã thay đổi mã PIN thành công. Vui lòng bảo mật mã PIN của mình.";
        notificationService.sendNotification(user, "Thay đổi mã PIN thành công", notifMsg, "/profile", NotificationType.SYSTEM);
        emailService.sendSimpleEmail(email, "Thay đổi mã PIN thành công - GinFilm", notifMsg);
    }

    public boolean verifyPin(String email, String pin) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        UserPinSecurity pinSecurity = userPinSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Chưa thiết lập mã PIN."));

        return passwordEncoder.matches(pin, pinSecurity.getPinCode());
    }

    public boolean verifyOtp(String email, String otp) {
        try {
            otpService.validateOtp(email, otp, Otptype.PIN_RESET);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
