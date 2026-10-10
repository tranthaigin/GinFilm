package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OtpToken;
import com.Cinema.movie_backend.entity.Otptype;
import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.UserStatus;
import com.Cinema.movie_backend.repository.RoleRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.Cinema.movie_backend.exception.AuthFailedException;
import com.Cinema.movie_backend.exception.AccountTemporarilyLockedException;

// Package đăng nhập bằng Google
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final JavaMailSender mailSender;
    private static final String GOOGLE_CLIENT_ID = "571685413836-tdi3srocqi1ptk1nmqcdt73l6dbo3bou.apps.googleusercontent.com";
    private static final String BANNER_URL = "https://res.cloudinary.com/sgfguxxl/image/upload/v1783493002/720805192_1541674700994423_2054380490015214293_n_paokop.jpg?v=1";

    @Transactional
    public User register(User newUser) {

        // Normalize email: Gmail và các nhà cung cấp email không phân biệt hoa/thường
        if (newUser.getEmail() != null) {
            newUser.setEmail(newUser.getEmail().trim().toLowerCase());
        }

        if (userRepository.findByUsernameManual(newUser.getUsername()).isPresent()) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        if (userRepository.findByEmailManual(newUser.getEmail()).isPresent()) {
            throw new RuntimeException("Email này đã được sử dụng");
        }

        if (userRepository.findByPhoneManual(newUser.getPhoneNumber()).isPresent()) {
            throw new RuntimeException("Số điện thoại này đã được liên kết với một tài khoản khác");
        }

        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));

        if (newUser.getStatus() == null) {
            newUser.setStatus(UserStatus.UNVERIFIED); // Mặc định là UNVERIFIED, phải xác thực email mới ACTIVE
        }

        Role userRole = roleRepository.findByNameManual("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy quyền trong hệ thống"));

        newUser.getRoles().add(userRole);
        User savedUser = userRepository.save(newUser);
        otpService.generateAndSendOtp(savedUser.getEmail(), Otptype.ACCOUNT_VERIFICATION); // Gửi mã OTP để xác thực tài
                                                                                           // khoản ngay sau khi đăng ký
                                                                                           // thành công

        return savedUser;
    }

    @Transactional
    public void verifyAccount(String email, String otp) {
        // Normalize email trước khi tìm OTP
        if (email != null)
            email = email.trim().toLowerCase();
        OtpToken otpToken = otpService.validateOtp(email, otp, Otptype.ACCOUNT_VERIFICATION);
        User user = otpToken.getUser();
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        otpService.deleteOtp(otpToken); // Xoá mã OTP sau khi xác thực thành công
    }

    @Transactional(noRollbackFor = {AuthFailedException.class, AccountTemporarilyLockedException.class})
    public User login(String email, String rawPassword) {

        // Normalize email: không phân biệt hoa/thường
        if (email != null)
            email = email.trim().toLowerCase();

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new AuthFailedException("Email này chưa được đăng ký"));

        if (user.getIsDeleted() != null && user.getIsDeleted()) {
            throw new AuthFailedException("Tài khoản này đã bị xoá");
        }

        if (user.getStatus() == UserStatus.LOCKED) {
            throw new AuthFailedException("Tài khoản này đã bị khóa vĩnh viễn");
        }

        // Kiểm tra tự động reset vi phạm sau 24 giờ không đăng nhập
        if (user.getLastLoginSuccessTime() != null &&
                user.getLastLoginSuccessTime().isBefore(LocalDateTime.now().minusHours(24))) {
            user.setSpamViolationLevel(0);
            user.setSpamLoginCount(0);
        }

        // Kiểm tra xem có đang bị khóa tạm thời do sai mật khẩu hoặc spam login không
        if (user.getAccountLocked() != null && user.getAccountLocked()) {
            if (user.getLockUntil() != null && LocalDateTime.now().isBefore(user.getLockUntil())) {
                long minutesLeft = Duration.between(LocalDateTime.now(), user.getLockUntil()).toMinutes() + 1;
                throw new AccountTemporarilyLockedException(
                        "Tài khoản của bạn bị tạm khóa do tiếp tục spam đăng nhập/đăng xuất. Vui lòng chờ khoảng "
                                + minutesLeft + " phút trước khi nhận OTP mở khóa.");
            }
            // Nếu đã hết thời gian khóa phạt -> sinh và gửi OTP mở khóa để người dùng đăng nhập tiếp
            if (user.getLockUntil() != null && !LocalDateTime.now().isBefore(user.getLockUntil())) {
                otpService.generateAndSendOtp(user.getEmail(), Otptype.UNLOCK_ACCOUNT);
                throw new AccountTemporarilyLockedException(
                        "Tài khoản của bạn đã bị khóa tạm thời. Chúng tôi vừa gửi lại mã OTP mở khóa vào email của bạn.");
            }
            throw new AccountTemporarilyLockedException("Tài khoản của bạn đã bị khóa tạm thời. Vui lòng kiểm tra email để lấy mã OTP mở khóa.");
        }

        if (user.getStatus() == UserStatus.UNVERIFIED) {
            throw new AuthFailedException("Vui lòng xác thực tài khoản trước khi đăng nhập");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            int attempts = user.getFailedAttempt() == null ? 0 : user.getFailedAttempt();
            attempts++;
            user.setFailedAttempt(attempts);
            
            if (attempts >= 5) {
                user.setAccountLocked(true);
                userRepository.save(user);
                // Sinh và gửi OTP
                otpService.generateAndSendOtp(user.getEmail(), Otptype.UNLOCK_ACCOUNT);
                throw new AccountTemporarilyLockedException("Tài khoản của bạn đã bị khóa tạm thời do nhập sai quá 5 lần. Vui lòng kiểm tra email để lấy mã OTP mở khóa.");
            } else {
                userRepository.save(user);
                throw new AuthFailedException("Sai mật khẩu. Bạn còn " + (5 - attempts) + " lần thử.");
            }
        }

        // Đăng nhập đúng mật khẩu -> xử lý đếm spam đăng nhập/đăng xuất
        LocalDateTime now = LocalDateTime.now();
        int spamCount = user.getSpamLoginCount() == null ? 0 : user.getSpamLoginCount();
        int violationLevel = user.getSpamViolationLevel() == null ? 0 : user.getSpamViolationLevel();

        if (user.getLastLoginSuccessTime() != null && user.getLastLoginSuccessTime().isAfter(now.minusMinutes(5))) {
            spamCount++;
        } else {
            spamCount = 1;
        }
        user.setLastLoginSuccessTime(now);
        user.setSpamLoginCount(spamCount);

        // Phát hiện vi phạm:
        // - Lần 1: Nhập đúng mật khẩu lần thứ 6 trong vòng 5 phút -> Khóa, gửi OTP ngay
        // - Lần 2+: Sau khi đã từng vi phạm (violationLevel >= 1) và vừa mở khóa xong mà log out và tiếp tục đăng nhập nữa (spamCount >= 2) -> Khóa lũy tiến ngay lập tức!
        boolean shouldLock = false;
        if (violationLevel == 0 && spamCount >= 6) {
            violationLevel = 1;
            shouldLock = true;
        } else if (violationLevel >= 1 && spamCount >= 2) {
            violationLevel++;
            shouldLock = true;
        }

        if (shouldLock) {
            user.setSpamViolationLevel(violationLevel);
            user.setAccountLocked(true);

            if (violationLevel == 1) {
                user.setLockUntil(null);
                userRepository.save(user);
                otpService.generateAndSendOtp(user.getEmail(), Otptype.UNLOCK_ACCOUNT);
                throw new AccountTemporarilyLockedException(
                        "Tài khoản bị khóa do phát hiện thao tác đăng nhập/đăng xuất liên tục 6 lần trong vòng 5 phút. Vui lòng sử dụng mã OTP trong email để mở khóa.");
            } else {
                int lockMinutes = (violationLevel - 1) * 10;
                user.setLockUntil(now.plusMinutes(lockMinutes));
                userRepository.save(user);
                throw new AccountTemporarilyLockedException(
                        "Tài khoản bị tạm khóa " + lockMinutes + " phút do tiếp tục spam đăng nhập/đăng xuất. Sau "
                                + lockMinutes + " phút hệ thống mới gửi OTP mở khóa cho bạn.");
            }
        }

        // Đăng nhập thành công và không vi phạm -> reset failed attempt
        if (user.getFailedAttempt() != null && user.getFailedAttempt() > 0) {
            user.setFailedAttempt(0);
        }
        userRepository.save(user);

        return user;
    }

    @Transactional
    public void unlockAccount(String email, String otp) {
        if (email != null) email = email.trim().toLowerCase();

        OtpToken otpToken = otpService.validateOtp(email, otp, Otptype.UNLOCK_ACCOUNT);

        User user = otpToken.getUser();
        user.setAccountLocked(false);
        user.setFailedAttempt(0);
        user.setSpamLoginCount(0);
        user.setLockUntil(null);
        userRepository.save(user);

        otpService.deleteOtp(otpToken);
    }

    @Transactional
    public void checkAndResendUnlockOtp(String email) {
        if (email != null) email = email.trim().toLowerCase();
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new AuthFailedException("Email này chưa được đăng ký"));

        if (user.getLockUntil() != null && LocalDateTime.now().isBefore(user.getLockUntil())) {
            long minutesLeft = Duration.between(LocalDateTime.now(), user.getLockUntil()).toMinutes() + 1;
            throw new AccountTemporarilyLockedException(
                    "Tài khoản đang trong thời gian bị phạt tạm khóa do spam đăng nhập/đăng xuất. Vui lòng chờ khoảng "
                            + minutesLeft + " phút nữa trước khi yêu cầu gửi lại OTP.");
        }

        otpService.generateAndSendOtp(user.getEmail(), Otptype.UNLOCK_ACCOUNT);
    }

    @Transactional
    public User loginWithGoogle(String idTokenString) {

        try {

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(GOOGLE_CLIENT_ID))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken == null) {
                throw new RuntimeException("Token Google không hợp lệ");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            String email = payload.getEmail();
            String fullName = (String) payload.get("name");
            String avatarUrl = (String) payload.get("picture");

            User user = userRepository.findByEmailManual(email)
                    .orElseGet(() -> {

                        Role userRole = roleRepository.findByNameManual("ROLE_USER")
                                .orElseThrow(() -> new RuntimeException(
                                        "Lỗi hệ thống: Không tìm thấy quyền trong hệ thống"));
                        User newUser = new User();

                        String baseUsername = email.split("@")[0]
                                .replaceAll("[^a-zA-Z0-9._-]", "")
                                .toLowerCase();
                        if (baseUsername.isEmpty())
                            baseUsername = "user";

                        String username = baseUsername;
                        int suffix = 1;
                        while (userRepository.findByUsernameManual(username).isPresent()) {
                            username = baseUsername + suffix;
                            suffix++;
                        }

                        newUser.setUsername(username);
                        newUser.setEmail(email);
                        newUser.setPassword(
                                passwordEncoder.encode(UUID.randomUUID().toString()));
                        newUser.setFullName(fullName);
                        newUser.setAvatar(avatarUrl);
                        newUser.setStatus(UserStatus.ACTIVE);

                        newUser.getRoles().add(userRole);

                        return userRepository.save(newUser);
                    });

            if (user.getIsDeleted() != null && user.getIsDeleted()) {
                throw new AuthFailedException("Tài khoản này đã bị xoá");
            }

            if (user.getStatus() == UserStatus.LOCKED) {
                throw new AuthFailedException("Tài khoản này đã bị khóa vĩnh viễn");
            }

            if (user.getAccountLocked() != null && user.getAccountLocked()) {
                if (user.getLockUntil() != null && LocalDateTime.now().isBefore(user.getLockUntil())) {
                    long minutesLeft = Duration.between(LocalDateTime.now(), user.getLockUntil()).toMinutes() + 1;
                    throw new AccountTemporarilyLockedException(
                            "Tài khoản của bạn bị tạm khóa do tiếp tục spam đăng nhập/đăng xuất. Vui lòng chờ khoảng "
                                    + minutesLeft + " phút trước khi nhận OTP mở khóa.");
                }
                if (user.getLockUntil() != null && !LocalDateTime.now().isBefore(user.getLockUntil())) {
                    otpService.generateAndSendOtp(user.getEmail(), Otptype.UNLOCK_ACCOUNT);
                    throw new AccountTemporarilyLockedException(
                            "Tài khoản của bạn đã bị khóa tạm thời. Chúng tôi vừa gửi lại mã OTP mở khóa vào email của bạn.");
                }
                throw new AccountTemporarilyLockedException("Tài khoản của bạn đã bị khóa tạm thời. Vui lòng kiểm tra email để lấy mã OTP mở khóa.");
            }

            return user;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Lỗi xác thực Google: " + e.getMessage(), e);
        }
    }

    @Transactional
    public User resetPassword(String email, String otp, String newPassword) {
        // Normalize email trước khi xử lý
        if (email != null)
            email = email.trim().toLowerCase();
        // Tìm token hợp lệ theo email, mã và type
        OtpToken otpToken = otpService.validateOtp(email, otp, Otptype.PASSWORD_RESET);
        User user = otpToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpService.deleteOtp(otpToken);
        return user;
    }

    @Transactional
    public User changePassword(String email, String oldPassword, String newPassword) {
        if (email != null) email = email.trim().toLowerCase();
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác.");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        return userRepository.save(user);
    }

    public java.util.List<User> getCustomers() {
        return userRepository.findAllCustomers();
    }

    public java.util.List<User> getDeletedCustomers() {
        return userRepository.findAllDeletedCustomers();
    }

    /**
     * Tạo tài khoản user bởi staff:
     * - Username tự động lấy phần trước "@" của email (xử lý trùng bằng hậu tố số)
     * - Mật khẩu tự động sinh ngẫu nhiên mạnh (8+ ký tự, hoa, thường, số, ký tự đặc
     * biệt)
     * - Tài khoản kích hoạt ngay (ACTIVE), gửi thông tin đăng nhập qua email
     */
    @Transactional
    public User createUserByStaff(com.Cinema.movie_backend.DTO.StaffCreateUserRequest request) {
        if (request.getEmail() != null) {
            request.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (userRepository.findByEmailManual(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email này đã được sử dụng");
        }
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            if (userRepository.findByPhoneManual(request.getPhoneNumber()).isPresent()) {
                throw new RuntimeException("Số điện thoại này đã được liên kết với tài khoản khác");
            }
        }

        // 1. Tự động sinh username từ phần trước "@" của email
        String baseUsername = request.getEmail().split("@")[0]
                .replaceAll("[^a-zA-Z0-9._-]", "") // chỉ giữ ký tự hợp lệ
                .toLowerCase();
        if (baseUsername.isEmpty())
            baseUsername = "user";

        String username = baseUsername;
        int suffix = 1;
        while (userRepository.findByUsernameManual(username).isPresent()) {
            username = baseUsername + suffix;
            suffix++;
        }

        // 2. Tự động sinh mật khẩu mạnh ngẫu nhiên
        String rawPassword = generateStrongPassword();

        Role userRole = roleRepository.findByNameManual("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy quyền ROLE_USER"));

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setEmail(request.getEmail());
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        newUser.setFullName(request.getFullName());
        newUser.setPhoneNumber(request.getPhoneNumber());
        newUser.setDateOfBirth(request.getDateOfBirth());
        // Staff tạo hộ → kích hoạt thẳng, không cần OTP
        newUser.setStatus(UserStatus.ACTIVE);
        newUser.getRoles().add(userRole);

        User savedUser = userRepository.save(newUser);

        // 3. Gửi email thông báo thông tin đăng nhập
        try {
            sendUserWelcomeEmail(savedUser.getEmail(), savedUser.getFullName(), username, rawPassword);
        } catch (Exception e) {
            System.err.println("Không thể gửi email chào mừng cho người dùng: " + e.getMessage());
        }

        return savedUser;
    }

    /**
     * Sinh mật khẩu ngẫu nhiên mạnh:
     * - Ít nhất 8 ký tự
     * - Ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số, 1 ký tự đặc biệt
     */
    private String generateStrongPassword() {
        final String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        final String lower = "abcdefghijklmnopqrstuvwxyz";
        final String digits = "0123456789";
        final String special = "@#$%!&*";
        final String all = upper + lower + digits + special;

        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();

        // Đảm bảo tối thiểu mỗi loại có 1 ký tự
        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(digits.charAt(random.nextInt(digits.length())));
        sb.append(special.charAt(random.nextInt(special.length())));

        // Thêm 4 ký tự ngẫu nhiên từ tất cả bộ ký tự (tổng = 8)
        for (int i = 0; i < 4; i++) {
            sb.append(all.charAt(random.nextInt(all.length())));
        }

        // Trộn ngẫu nhiên để không lộ pattern
        char[] chars = sb.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }

    /**
     * Gửi email chào mừng kèm thông tin đăng nhập cho user mới do staff tạo.
     */
    private void sendUserWelcomeEmail(String email, String fullName, String username, String rawPassword) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject("Tài khoản RapLoFilm đã được tạo thành công!");
            helper.setText(buildUserWelcomeEmailHtml(fullName, username, rawPassword), true);
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            throw new RuntimeException("Gửi email thất bại: " + e.getMessage(), e);
        }
    }

    /**
     * HTML template email chào mừng user mới.
     */
    private String buildUserWelcomeEmailHtml(String fullName, String username, String rawPassword) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Tài khoản RapLoFilm của bạn</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"
                +

                // Banner
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL
                + "' alt='RapLoFilm' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />" +
                "</td></tr>" +

                // Body
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Tài khoản <a href='https://raplofilm.com/home' style='color:#c0392b;text-decoration:none;'><strong>RapLoFilm</strong></a> của bạn đã được nhân viên tạo thành công. Bạn có thể đăng nhập ngay bằng thông tin bên dưới:</p>"
                +

                // Credentials box
                "<div style='background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;padding:20px 24px;margin:20px 0;'>"
                +
                "<p style='margin:0 0 8px 0;font-size:14px;color:#555555;'><strong>Tên đăng nhập:</strong></p>" +
                "<div style='background:#fff;border:1px solid #ddd;border-radius:6px;padding:10px 16px;margin:0 0 16px 0;'>"
                +
                "<span style='font-family:monospace;font-size:17px;font-weight:bold;color:#c0392b;letter-spacing:1px;'>"
                + username + "</span>" +
                "</div>" +
                "<p style='margin:0 0 8px 0;font-size:14px;color:#555555;'><strong>Mật khẩu:</strong></p>" +
                "<div style='background:#fff;border:1px solid #ddd;border-radius:6px;padding:10px 16px;margin:0;'>" +
                "<span style='font-family:monospace;font-size:17px;font-weight:bold;color:#c0392b;letter-spacing:1px;'>"
                + rawPassword + "</span>" +
                "</div>" +
                "</div>" +

                "<p style='margin:0 0 16px 0;color:#E22753;font-weight:bold;'>⚠ Lưu ý: Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận email này để bảo vệ tài khoản!</p>"
                +
                "<p style='margin:0 0 16px 0;'>Nếu bạn cần hỗ trợ, vui lòng liên hệ nhân viên hoặc gửi email tới <a href='mailto:support@raplofilm.com' style='color:#c0392b;text-decoration:none;'>support@raplofilm.com</a>.</p>"
                +

                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.com/home' style='color:#c0392b;text-decoration:none;'><strong>RapLoFilm</strong></a></p>"
                +
                "</td></tr>" +

                // Footer
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>"
                +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +

                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }

    /**
     * Khoá hoặc mở khoá tài khoản user (toggle ACTIVE ↔ LOCKED)
     */
    @Transactional
    public User toggleUserLockStatus(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
            user.setIsDeleted(false);
        } else {
            user.setStatus(UserStatus.LOCKED);
        }
        return userRepository.save(user);
    }

    @Transactional
    public User restoreUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        user.setIsDeleted(false);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    @Transactional
    public User softDeleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        user.setIsDeleted(true);
        user.setStatus(UserStatus.LOCKED);
        return userRepository.save(user);
    }

    @Transactional
    public User updateUserByAdmin(UUID id, com.Cinema.movie_backend.DTO.AdminUpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (request.getEmail() != null)
            user.setEmail(request.getEmail());
        if (request.getPhoneNumber() != null)
            user.setPhoneNumber(request.getPhoneNumber());
        if (request.getStatus() != null) {
            try {
                user.setStatus(UserStatus.valueOf(request.getStatus()));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Trạng thái không hợp lệ");
            }
        }
        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        return userRepository.findByEmailManual(email).orElse(null);
    }

    @Transactional
    public User updateProfile(String email, com.Cinema.movie_backend.DTO.UpdateProfileRequest request) {
        if (email != null)
            email = email.trim().toLowerCase();

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Cập nhật họ và tên
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        // Cập nhật số điện thoại (kiểm tra trùng với user khác)
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            String newPhone = request.getPhoneNumber().trim();
            userRepository.findByPhoneManual(newPhone).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new RuntimeException("Số điện thoại này đã được liên kết với một tài khoản khác");
                }
            });
            user.setPhoneNumber(newPhone);
        }

        // Cập nhật ngày sinh (phải trên 13 tuổi)
        if (request.getDateOfBirth() != null) {
            java.time.LocalDate minDob = java.time.LocalDate.now().minusYears(13);
            if (request.getDateOfBirth().isAfter(minDob)) {
                throw new RuntimeException("Bạn phải từ 13 tuổi trở lên để sử dụng dịch vụ");
            }
            user.setDateOfBirth(request.getDateOfBirth());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(String email, String oldPassword, String newPassword, String confirmPassword) {
        if (email != null)
            email = email.trim().toLowerCase();

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new RuntimeException("Xác nhận mật khẩu mới không khớp");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public String uploadAvatar(UUID userId, MultipartFile file, String serverBaseUrl) {
        // Validate: chỉ chấp nhận ảnh
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP, ...)");
        }

        // Validate: kích thước tối đa 5MB
        long maxSizeBytes = 5L * 1024 * 1024;
        if (file.getSize() > maxSizeBytes) {
            throw new RuntimeException("Kích thước ảnh không được vượt quá 5MB");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        try {
            // Dùng thư mục uploads có sẵn
            Path avatarDir = Paths.get("uploads");

            // Xoá avatar cũ (nếu là file local, không xoá URL từ Google)
            String oldAvatar = user.getAvatar();
            if (oldAvatar != null && oldAvatar.contains("/uploads/") && !oldAvatar.contains("/uploads/posters/")) {
                String oldFilename = oldAvatar.substring(oldAvatar.lastIndexOf("/uploads/") + "/uploads/".length());
                Path oldFile = avatarDir.resolve(oldFilename);
                Files.deleteIfExists(oldFile);
            }

            // Tạo tên file duy nhất: <userId>_<timestamp>.<ext>
            String originalFilename = file.getOriginalFilename();
            String ext = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : ".jpg";
            String newFilename = userId.toString() + "_" + System.currentTimeMillis() + ext;

            // Lưu file
            Path dest = avatarDir.resolve(newFilename);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            // Tạo URL public
            String avatarUrl = serverBaseUrl + "/uploads/" + newFilename;

            // Cập nhật DB
            user.setAvatar(avatarUrl);
            userRepository.save(user);

            return avatarUrl;
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu ảnh: " + e.getMessage(), e);
        }
    }

    public User searchByPhone(String phone) {
        return userRepository.findByPhoneManual(phone).orElse(null);
    }

    @Transactional
    public User quickRegisterByPOS(String fullName, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new RuntimeException("Số điện thoại không được để trống");
        }
        if (userRepository.findByPhoneManual(phoneNumber).isPresent()) {
            throw new RuntimeException("Số điện thoại này đã được sử dụng");
        }

        String dummyEmail = phoneNumber + "@pos.local";
        if (userRepository.findByEmailManual(dummyEmail).isPresent()) {
            dummyEmail = phoneNumber + "_" + System.currentTimeMillis() + "@pos.local";
        }

        String username = "pos_" + phoneNumber;
        int suffix = 1;
        while (userRepository.findByUsernameManual(username).isPresent()) {
            username = "pos_" + phoneNumber + "_" + suffix;
            suffix++;
        }

        Role userRole = roleRepository.findByNameManual("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy quyền ROLE_USER"));

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setEmail(dummyEmail);
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setFullName(fullName);
        newUser.setPhoneNumber(phoneNumber);
        newUser.setStatus(UserStatus.ACTIVE);
        newUser.getRoles().add(userRole);

        return userRepository.save(newUser);
    }

}