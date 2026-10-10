package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.StaffCreationRequest;
import com.Cinema.movie_backend.DTO.StaffUpdateRequest;
import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.UserStatus;
import com.Cinema.movie_backend.repository.RoleRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminStaffService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BrevoEmailSender brevoEmailSender;

    private static final String BANNER_URL = "https://res.cloudinary.com/sgfguxxl/image/upload/v1783493002/720805192_1541674700994423_2054380490015214293_n_paokop.jpg?v=1";

    public java.util.List<User> getAllStaff() {
        return userRepository.findAllStaff();
    }

    public java.util.List<User> getDeletedStaff() {
        return userRepository.findAllDeletedStaff();
    }

    @Transactional
    public User softDeleteStaff(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với ID này"));

        boolean isStaff = staff.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_STAFF"));
        if (!isStaff) {
            throw new RuntimeException("Người dùng này không phải là Staff!");
        }

        staff.setIsDeleted(true);
        staff.setStatus(UserStatus.LOCKED); // Optional: also lock the user
        return userRepository.save(staff);
    }

    @Transactional
    public User restoreStaff(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với ID này"));

        staff.setIsDeleted(false);
        staff.setStatus(UserStatus.ACTIVE); // Optional: reactivate
        return userRepository.save(staff);
    }

    @Transactional
    public User createStaffAccount(StaffCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email này đã tồn tại");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username này đã tồn tại");
        }

        Role staffRole = (Role) roleRepository.findByName("ROLE_STAFF")
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quyền STAFF trong hệ thống"));

        User newStaff = new User();
        newStaff.setUsername(request.getUsername());
        newStaff.setEmail(request.getEmail().toLowerCase());
        newStaff.setPassword(passwordEncoder.encode(request.getPassword()));
        newStaff.setFullName(request.getFullName());
        newStaff.setPhoneNumber(request.getPhoneNumber());
        newStaff.setDateOfBirth(request.getDateOfBirth());

        newStaff.setStatus(UserStatus.ACTIVE);
        newStaff.getRoles().add(staffRole);

        User savedStaff = userRepository.save(newStaff);

        // Gửi email thông tin tài khoản cho nhân viên mới
        try {
            sendStaffWelcomeEmail(savedStaff.getEmail(), savedStaff.getFullName(), request.getUsername(), request.getPassword());
        } catch (Exception e) {
            // Không rollback nếu gửi mail thất bại, chỉ log lỗi
            System.err.println("Không thể gửi email chào mừng cho nhân viên: " + e.getMessage());
        }

        return savedStaff;
    }


    @Transactional
    public User updateStaffAccount(UUID staffId, StaffUpdateRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID này"));

        boolean isStaff = staff.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_STAFF"));
        if (!isStaff) {
            throw new RuntimeException("Người dùng này không phải là Staff!");
        }

        staff.setFullName(request.getFullName());
        staff.setPhoneNumber(request.getPhoneNumber());
        staff.setDateOfBirth(request.getDateOfBirth());

        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(staff.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email này đã tồn tại");
            }
            staff.setEmail(request.getEmail());
        }

        if (request.getStatus() != null) {
            staff.setStatus(request.getStatus());
        }

        return userRepository.save(staff);
    }


    @Transactional
    public User toggleStaffLockStatus(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));

        boolean isStaff = staff.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_STAFF"));

        if (!isStaff) {
            throw new RuntimeException("Tài khoản này không phải là Nhân viên. Xin vui lòng dùng chức năng khác!");
        }

        if (staff.getStatus() == UserStatus.LOCKED) {
            staff.setStatus(UserStatus.ACTIVE);
        } else {
            staff.setStatus(UserStatus.LOCKED);
        }

        return userRepository.save(staff);
    }

    // ===== GỬI EMAIL CHÀO MỪNG NHÂN VIÊN MỚI =====
    private void sendStaffWelcomeEmail(String email, String fullName, String username, String rawPassword) {
        try {
            String htmlContent = buildStaffWelcomeEmailHtml(fullName, username, rawPassword);
            brevoEmailSender.sendEmail(email, "Thông tin tài khoản nhân viên - RapLoFilm", htmlContent);
        } catch (Exception e) {
            throw new RuntimeException("Gửi email thất bại: " + e.getMessage(), e);
        }
    }

    // ===== HTML TEMPLATE: CHÀO MỪNG NHÂN VIÊN MỚI =====
    private String buildStaffWelcomeEmailHtml(String fullName, String username, String rawPassword) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Thông tin tài khoản nhân viên - RapLoFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +

                // Banner
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />" +
                "</td></tr>" +

                // Nội dung
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +

                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Chào mừng bạn gia nhập đội ngũ <a href='https://raplofilm.com/home' style='color:#c0392b;text-decoration:none;'><strong>RapLoFilm</strong></a>!</p>" +
                "<p style='margin:0 0 16px 0;'>Tài khoản nhân viên của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập của bạn:</p>" +

                // Thông tin tài khoản
                "<div style='background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:8px;padding:20px 24px;margin:20px 0;'>" +
                "<p style='margin:0 0 12px 0;font-size:14px;'><strong style='color:#555555;'>Tên đăng nhập:</strong></p>" +
                "<div style='background-color:#ffffff;border:1px solid #dddddd;border-radius:6px;padding:10px 16px;margin:0 0 16px 0;'>" +
                "<span style='font-family:monospace;font-size:16px;font-weight:bold;color:#c0392b;letter-spacing:1px;'>" + username + "</span>" +
                "</div>" +
                "<p style='margin:0 0 12px 0;font-size:14px;'><strong style='color:#555555;'>Mật khẩu:</strong></p>" +
                "<div style='background-color:#ffffff;border:1px solid #dddddd;border-radius:6px;padding:10px 16px;margin:0;'>" +
                "<span style='font-family:monospace;font-size:16px;font-weight:bold;color:#c0392b;letter-spacing:1px;'>" + rawPassword + "</span>" +
                "</div>" +
                "</div>" +

                "<p style='margin:0 0 16px 0;color:#E22753;font-weight:bold;'>⚠ Lưu ý bảo mật: Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này!</p>" +
                "<p style='margin:0 0 16px 0;'>Nếu bạn cần hỗ trợ, vui lòng liên hệ quản trị viên hoặc gửi email đến <a href='mailto:support@raplofilm.com' style='color:#c0392b;text-decoration:none;'>support@raplofilm.com</a>.</p>" +

                // Footer
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='https://raplofilm.com/home' style='color:#c0392b; text-decoration:none;'><strong>RapLoFilm</strong></a></p>" +

                "</td></tr>" +

                // Copyright
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>" +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +

                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }

    // ===== GỬI EMAIL THÔNG BÁO CHO NHÂN VIÊN =====
    public void sendEmailToStaff(UUID staffId, String subject, String content) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên!"));
        
        boolean isStaff = staff.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_STAFF"));
        
        if (!isStaff) {
            throw new RuntimeException("Tài khoản này không phải là Nhân viên!");
        }

        try {
            String htmlContent = buildEmailToStaffHtml(staff.getFullName(), subject, content);
            brevoEmailSender.sendEmail(staff.getEmail(), subject + " - RapLoFilm", htmlContent);
        } catch (Exception e) {
            throw new RuntimeException("Gửi email thất bại: " + e.getMessage(), e);
        }
    }

    private String buildEmailToStaffHtml(String fullName, String subject, String content) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>" + subject + "</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" +
                "<img src='" + BANNER_URL + "' alt='RapLoFilm Banner' width='600' style='display:block;width:100%;max-width:600px;height:auto;' />" +
                "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Bạn có một thông báo mới từ Ban Quản Trị hệ thống <strong style='color:#c0392b;'>RapLoFilm</strong>:</p>" +
                "<div style='background-color:#f9f9f9;border-left:4px solid #E22753;padding:16px;margin:20px 0;color:#333;font-style:italic;white-space:pre-wrap;'>" +
                content +
                "</div>" +
                "<p style='margin:0 0 16px 0;'>Vui lòng kiểm tra và thực hiện nếu có yêu cầu trong nội dung trên.</p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Ban Quản Trị <strong>RapLoFilm</strong></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>" +
                "© 2026 RapLoFilm. All rights reserved." +
                "</td></tr>" +
                "</table>" +
                "</td></tr>" +
                "</table>" +
                "</body></html>";
    }
}