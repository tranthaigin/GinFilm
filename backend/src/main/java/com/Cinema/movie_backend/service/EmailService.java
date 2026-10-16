package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.util.EmailBranding;
import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.entity.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailService {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.contact.email:${spring.mail.username:}}")
    private String supportEmail;

    private final BrevoEmailSender brevoEmailSender;

    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

    @Async
    public void sendCinemaTicketEmail(String email, String fullName, Booking booking, List<Ticket> tickets) {
        try {

            String ticketCode = (booking.getTicketCode() != null) ? booking.getTicketCode() :
                    (tickets.isEmpty() ? "N/A" : tickets.get(0).getTicketCode());

            String seats = tickets.stream()
                    .map(t -> t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber())
                    .collect(Collectors.joining(", "));

            String combos = "Không có";
            if (booking.getBookingCombos() != null && !booking.getBookingCombos().isEmpty()) {
                combos = booking.getBookingCombos().stream()
                        .map(c -> c.getQuantity() + "x " + c.getCombo().getName())
                        .collect(Collectors.joining(", "));
            }
            
            String movieName = booking.getShowtime().getMovie().getTitle();
            String cinemaName = booking.getShowtime().getTheater().getName();
            String roomName = booking.getShowtime().getRoom().getName();
            String showDate = booking.getShowtime().getShowDate().format(dateFormatter);
            String showTime = booking.getShowtime().getStartTime().format(timeFormatter);
            String format = booking.getShowtime().getFormat();
            String totalAmount = String.format("%,.0f VNĐ", booking.getTotalAmount());

            String htmlContent = buildCinemaTicketHtml(fullName, ticketCode, movieName, cinemaName, roomName, format, showDate, showTime, seats, combos, totalAmount);
            brevoEmailSender.sendEmail(email, "Xác nhận đặt vé trực tuyến để xem phim tại rạp - GinFilm", htmlContent);
        } catch (Exception e) {
            System.err.println("Gửi email vé rạp thất bại: " + e.getMessage());
        }
    }

    @Async
    public void sendSimpleEmail(String email, String subject, String text) {
        sendSystemEmail(email, "Quý khách", subject, text);
    }

    @Async
    public void sendSystemEmail(String email, String fullName, String subject, String text) {
        try {
            String html = buildSystemNotificationHtml(fullName != null ? fullName : "Quý khách", subject, text);
            brevoEmailSender.sendEmail(email, subject, html);
        } catch (Exception e) {
            System.err.println("Gửi email thất bại: " + e.getMessage());
        }
    }

    @Async
    public void sendOnlineMovieTicketEmail(String email, String fullName, OnlineTicket ticket) {
        try {

            String movieName = ticket.getMovie().getTitle();
            String ticketCode = ticket.getTicketCode();
            String purchaseDate = ticket.getPurchaseTime().format(dateFormatter) + " " + ticket.getPurchaseTime().format(timeFormatter);
            String duration = ticket.getTimeLimitMinutes() + " phút";
            String totalAmount = String.format("%,.0f VNĐ", ticket.getPrice());

            String htmlContent = buildOnlineTicketHtml(fullName, ticketCode, movieName, purchaseDate, duration, totalAmount);
            brevoEmailSender.sendEmail(email, "Xác nhận mua vé phim trực tuyến - GinFilm", htmlContent);
        } catch (Exception e) {
            System.err.println("Gửi email vé online thất bại: " + e.getMessage());
        }
    }

    private String buildCinemaTicketHtml(String fullName, String ticketCode, String movieName, String cinemaName, String roomName, String format, String showDate, String showTime, String seats, String combos, String totalAmount) {
        String qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + frontendUrl + "/scan/offline/" + ticketCode;


        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Xác nhận đặt vé xem phim - GinFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Cảm ơn bạn đã đặt vé xem phim tại rạp <a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a>.</p>" +
                
                "<p style='margin:0 0 16px 0;'>Vui lòng đưa mã vé hoặc mã QR này cho nhân viên tại quầy để nhận vé cứng hoặc vào rạp:</p>" +

                // QR Code and Barcode Box
                "<div style='text-align:center;margin:24px 0;'>" +
                    "<div style='border:1px solid #c0392b; border-radius:12px; padding:20px; display:inline-block; background-color:#fffaf9; width:100%; max-width:400px; box-sizing:border-box;'>" +
                        "<p style='margin:0 0 10px 0;font-weight:bold;color:#c0392b;font-size:14px;letter-spacing:1px;'>MÃ XÁC NHẬN (QR)</p>" +
                        "<img src='" + qrCodeUrl + "' alt='QR Code' width='200' height='200' style='display:inline-block; margin-bottom:20px;' />" +
                    "</div>" +
                "</div>" +

                // Ticket Details Box
                "<div style='background-color:#f9f9f9;padding:20px;border-radius:8px;border:1px dashed #c0392b;margin-bottom:20px;'>" +
                "<table width='100%' cellpadding='6' cellspacing='0' style='font-size:15px;'>" +
                "<tr><td width='40%' style='color:#555;'><strong>Phim:</strong></td><td style='font-weight:bold;font-size:16px;color:#c0392b;'>" + movieName + "</td></tr>" +
                "<tr><td style='color:#555;'><strong>Ngày chiếu:</strong></td><td><strong>" + showDate + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Giờ chiếu:</strong></td><td><strong>" + showTime + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Phòng chiếu:</strong></td><td><strong>" + roomName + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Loại rạp:</strong></td><td><strong>" + (format != null ? format : "2D") + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Rạp chiếu:</strong></td><td><strong>" + cinemaName + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Ghế ngồi:</strong></td><td><strong style='color:#2980b9;'>" + seats + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Combo:</strong></td><td>" + combos + "</td></tr>" +
                "<tr><td style='color:#555;'><strong>Tổng thanh toán:</strong></td><td style='color:#c0392b;font-weight:bold;font-size:18px;'>" + totalAmount + "</td></tr>" +
                "</table></div>" +
                
                "<p style='margin:0 0 16px 0;'>Chúc bạn xem phim vui vẻ!</p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    private String buildSystemNotificationHtml(String fullName, String title, String message) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>" + title + "</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<h2 style='color:#c0392b;margin:0 0 20px 0;font-size:20px;'>" + title + "</h2>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>" + message + "</p>" +
                "<p style='margin:0 0 16px 0;'>Chúc bạn luôn có những trải nghiệm tuyệt vời.</p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    private String buildOnlineTicketHtml(String fullName, String ticketCode, String movieName, String purchaseDate, String duration, String totalAmount) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Xác nhận mua vé Online - GinFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Cảm ơn bạn đã mua vé xem phim trực tuyến trên web của <a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a>.</p>" +
                
                "<p style='margin:0 0 16px 0;'>Để xem phim hãy nhập mã xác nhận bên dưới:</p>" +
                "<div style='text-align:center;margin:24px 0;'>" +
                "<span style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:32px;" +
                "font-weight:bold;letter-spacing:10px;padding:16px 36px;border-radius:8px;" +
                "font-family:monospace;'>" + ticketCode + "</span>" +
                "</div>" +

                "<div style='background-color:#f9f9f9;padding:15px;border-radius:8px;border:1px dashed #c0392b;margin-bottom:20px;'>" +
                "<table width='100%'>" +
                "<tr><td width='40%'><strong>Phim:</strong></td><td>" + movieName + "</td></tr>" +
                "<tr><td><strong>Ngày mua:</strong></td><td>" + purchaseDate + "</td></tr>" +
                "<tr><td><strong>Thời lượng xem:</strong></td><td>" + duration + "</td></tr>" +
                "<tr><td><strong>Tổng thanh toán:</strong></td><td style='color:#c0392b;font-weight:bold;'>" + totalAmount + "</td></tr>" +
                "</table></div>" +
                "<p style='margin:0 0 16px 0;text-align:center;'><a href='" + frontendUrl + "/enter-ticket-code?ticket=" + ticketCode + "&activated=true' style='display:inline-block;background-color:#c0392b;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:5px;'>Xem phim ngay</a></p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }
    @Async
    public void sendActivationEmail(String email, String fullName, OnlineTicket ticket) {
        sendActivationEmail(email, fullName, ticket, email, "Máy tính Windows (Edge)");
    }

    @Async
    public void sendActivationEmail(String email, String fullName, OnlineTicket ticket, String activatingEmail, String deviceInfo) {
        try {
            String movieName = ticket.getMovie() != null ? ticket.getMovie().getTitle() : "";
            String ticketCode = ticket.getTicketCode();
            String duration = ticket.getTimeLimitMinutes() != null ? ticket.getTimeLimitMinutes().toString() : "0";
            String activationDate = ticket.getActivatedAt() != null ? ticket.getActivatedAt().format(dateFormatter) + " " + ticket.getActivatedAt().format(timeFormatter) : "";
            String expiryDate = ticket.getExpiresAt() != null ? ticket.getExpiresAt().format(dateFormatter) + " " + ticket.getExpiresAt().format(timeFormatter) : "";
            String actEmail = activatingEmail != null ? activatingEmail : (email != null ? email : "N/A");
            String devInfo = deviceInfo != null ? deviceInfo : "Máy tính Windows (Edge)";

            String html = buildActivationEmailHtml(fullName, ticketCode, movieName, duration, activationDate, expiryDate, actEmail, devInfo);
            brevoEmailSender.sendEmail(email, "Kích hoạt vé xem phim trực tuyến thành công - GinFilm", html);
        } catch (Exception e) {
            System.err.println("Gửi email kích hoạt thất bại: " + e.getMessage());
        }
    }

    private String buildActivationEmailHtml(String fullName, String ticketCode, String movieName, String duration, String activationDate, String expiryDate, String actEmail, String devInfo) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Kích hoạt vé thành công - GinFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Vé xem phim trực tuyến của bạn đã được kích hoạt thành công trên hệ thống của <a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a>.</p>" +
                
                "<div style='text-align:center;margin:24px 0;'>" +
                "<div style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:32px;" +
                "font-weight:bold;letter-spacing:14px;padding:16px 20px 16px 34px;border-radius:8px;" +
                "font-family:monospace;white-space:nowrap;'>" + ticketCode + "</div>" +
                "</div>" +

                "<div style='background-color:#f9f9f9;padding:20px;border-radius:8px;border:1px dashed #c0392b;margin-bottom:24px;'>" +
                "<table width='100%' cellpadding='6' cellspacing='0' style='font-size:15px;'>" +
                "<tr><td width='40%'><strong>Phim:</strong></td><td>" + movieName + "</td></tr>" +
                "<tr><td><strong>Thời lượng xem:</strong></td><td>" + duration + " phút</td></tr>" +
                "<tr><td><strong>Ngày kích hoạt:</strong></td><td>" + activationDate + "</td></tr>" +
                "<tr><td><strong>Hạn sử dụng:</strong></td><td style='color:#c0392b;font-weight:bold;'>" + expiryDate + "</td></tr>" +
                "<tr><td><strong>Email kích hoạt:</strong></td><td>" + actEmail + "</td></tr>" +
                "<tr><td><strong>Thiết bị kích hoạt:</strong></td><td>" + devInfo + "</td></tr>" +
                "</table></div>" +
                
                "<div style='text-align:center;margin:0 0 24px 0;'>" +
                "<a href='" + frontendUrl + "/enter-ticket-code?ticket=" + ticketCode + "&activated=true' style='display:inline-block;background-color:#c0392b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:5px;font-weight:bold;font-size:16px;'>Xem phim ngay</a>" +
                "</div>" +

                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    @Async
    public void sendPromotionEmail(String email, String fullName, com.Cinema.movie_backend.entity.Promotion promotion) {
        try {
            String code = promotion.getCode() != null ? promotion.getCode() : "Không có";
            String discount = promotion.getDiscount() != null ? promotion.getDiscount() + "%" : "0%";
            String duration;
            if (promotion.getStartDate() == null && promotion.getEnd() == null) {
                duration = "Vô thời hạn";
            } else {
                String startDate = promotion.getStartDate() != null ? promotion.getStartDate().format(dateFormatter) : "?";
                String endDate = promotion.getEnd() != null ? promotion.getEnd().format(dateFormatter) : "?";
                duration = startDate + " - " + endDate;
            }
            String description = promotion.getDescription() != null ? promotion.getDescription() : "";

            String html = buildPromotionHtml(fullName, promotion.getTitle(), code, discount, duration, description);
            brevoEmailSender.sendEmail(email, "Ưu đãi mới từ GinFilm: " + promotion.getTitle(), html);
        } catch (Exception e) {
            System.err.println("Gửi email khuyến mãi thất bại: " + e.getMessage());
        }
    }

    private String buildPromotionHtml(String fullName, String title, String code, String discount, String duration, String description) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Khuyến mãi mới - GinFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>Bạn vừa nhận được một ưu đãi mới hấp dẫn từ hệ thống của <a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a>.</p>" +
                
                "<div style='text-align:center;margin:24px 0;'>" +
                "<div style='display:inline-block;background-color:#c0392b;color:#ffffff;font-size:28px;" +
                "font-weight:bold;letter-spacing:8px;padding:16px 20px 16px 28px;border-radius:8px;" +
                "font-family:monospace;white-space:nowrap;'>" + code + "</div>" +
                "</div>" +

                "<div style='background-color:#f9f9f9;padding:20px;border-radius:8px;border:1px dashed #c0392b;margin-bottom:24px;'>" +
                "<table width='100%' cellpadding='6' cellspacing='0' style='font-size:15px;'>" +
                "<tr><td width='40%'><strong>Tên ưu đãi:</strong></td><td>" + title + "</td></tr>" +
                "<tr><td><strong>Mức giảm:</strong></td><td style='color:#c0392b;font-weight:bold;'>" + discount + "</td></tr>" +
                "<tr><td><strong>Thời gian ưu đãi:</strong></td><td>" + duration + "</td></tr>" +
                "<tr><td><strong>Nội dung chi tiết:</strong></td><td>" + description + "</td></tr>" +
                "</table></div>" +
                
                "<div style='text-align:center;margin:0 0 24px 0;'>" +
                "<a href='" + frontendUrl + "/offers' style='display:inline-block;background-color:#c0392b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:5px;font-weight:bold;font-size:16px;'>Xem chi tiết ưu đãi</a>" +
                "</div>" +

                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }
    @Async
    public void sendShowtimeReminderEmail(Booking booking, String subject, String message) {
        try {
            String fullName = booking.getUser().getFullName() != null ? booking.getUser().getFullName() : "Quý khách";
            String movieName = booking.getShowtime().getMovie().getTitle();
            String showDate = booking.getShowtime().getShowDate().format(dateFormatter);
            String showTime = booking.getShowtime().getStartTime().format(timeFormatter);
            String roomName = booking.getShowtime().getRoom().getName();
            String cinemaName = booking.getShowtime().getTheater().getName();
            String ticketCode = booking.getTicketCode() != null ? booking.getTicketCode() : "N/A";
            
            String seats = booking.getTickets() != null && !booking.getTickets().isEmpty() ? booking.getTickets().stream()
                    .map(t -> t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber())
                    .collect(Collectors.joining(", ")) : "N/A";

            String html = buildShowtimeReminderHtml(fullName, subject, message, movieName, showDate, showTime, roomName, cinemaName, seats, ticketCode);
            brevoEmailSender.sendEmail(booking.getUser().getEmail(), subject, html);
        } catch (Exception e) {
            System.err.println("Gửi email nhắc nhở suất chiếu thất bại: " + e.getMessage());
        }
    }

    private String buildShowtimeReminderHtml(String fullName, String title, String message, String movieName, String showDate, String showTime, String roomName, String cinemaName, String seats, String ticketCode) {
        return "<!DOCTYPE html>" +
                "<html lang='vi'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>" + title + " - GinFilm</title></head>" +
                "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;'>" +
                "<tr><td align='center' style='padding:20px 0;'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr><td style='padding:0;'>" + EmailBranding.BANNER_HTML + "</td></tr>" +
                "<tr><td style='padding:30px 40px;color:#222222;font-size:15px;line-height:1.8;'>" +
                "<h2 style='color:#c0392b;margin:0 0 20px 0;font-size:20px;text-align:center;'>" + title + "</h2>" +
                "<p style='margin:0 0 16px 0;'>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin:0 0 16px 0;'>" + message + "</p>" +
                
                "<div style='background-color:#f9f9f9;padding:20px;border-radius:8px;border:1px dashed #c0392b;margin-bottom:20px;'>" +
                "<table width='100%' cellpadding='6' cellspacing='0' style='font-size:15px;'>" +
                "<tr><td width='40%' style='color:#555;'><strong>Mã vé:</strong></td><td style='font-weight:bold;font-size:18px;color:#c0392b;letter-spacing:2px;'>" + ticketCode + "</td></tr>" +
                "<tr><td style='color:#555;'><strong>Phim:</strong></td><td style='font-weight:bold;font-size:16px;color:#333;'>" + movieName + "</td></tr>" +
                "<tr><td style='color:#555;'><strong>Ngày chiếu:</strong></td><td><strong>" + showDate + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Giờ chiếu:</strong></td><td><strong>" + showTime + "</strong></td></tr>" +
                "<tr><td style='color:#555;'><strong>Rạp:</strong></td><td>" + cinemaName + " (" + roomName + ")</td></tr>" +
                "<tr><td style='color:#555;'><strong>Ghế:</strong></td><td><strong style='color:#2980b9;'>" + seats + "</strong></td></tr>" +
                "</table></div>" +
                
                "<p style='margin:0 0 16px 0;text-align:center;'><a href='" + frontendUrl + "/my-tickets' style='display:inline-block;background-color:#c0392b;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;'>Mở Vé Của Tôi</a></p>" +
                "<p style='margin:0 0 16px 0;'>Chúc bạn có những trải nghiệm xem phim tuyệt vời cùng GinFilm.</p>" +
                "<p style='margin:0 0 4px 0;'>Trân trọng,</p>" +
                "<p style='margin:0 0 16px 0;'>Đội ngũ <a href='" + frontendUrl + "/about' style='color:#c0392b; text-decoration:none;'><strong>GinFilm</strong></a></p>" +
                "<p style='margin:0 0 4px 0;'><a href='" + frontendUrl + "/home' style='color:#c0392b; text-decoration:none;'>Website</a></p>" +
                "</td></tr>" +
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    // ==================== CONTACT FORM EMAIL ====================

    @Async
    public void sendContactFormEmail(String senderName, String senderEmail, String phone, String message) {
        try {
            String htmlContent = buildContactFormHtml(senderName, senderEmail, phone, message);
            brevoEmailSender.sendEmail(supportEmail, "[LIÊN HỆ] " + senderName + " - " + senderEmail, htmlContent);
        } catch (Exception e) {
            System.err.println("Gửi email liên hệ thất bại: " + e.getMessage());
            throw new RuntimeException("Không thể gửi email: " + e.getMessage());
        }
    }

    private String buildContactFormHtml(String name, String email, String phone, String message) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;padding:30px 0;'>" +
                "<tr><td align='center'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>" +

                // Header
                "<tr><td style='background:linear-gradient(135deg,#e61a27,#9b1216);padding:28px 32px;text-align:center;'>" +
                "<h1 style='margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;'>📩 TIN NHẮN LIÊN HỆ MỚI</h1>" +
                "<p style='margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;'>Có khách hàng liên hệ qua website GinFilm</p>" +
                "</td></tr>" +

                // Body
                "<tr><td style='padding:32px;color:#333333;font-size:15px;'>" +

                // Info table
                "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;margin-bottom:24px;'>" +
                "<tr><td style='padding:10px 14px;background:#fef2f2;border-left:4px solid #e61a27;border-radius:0 4px 4px 0;font-weight:bold;color:#9b1216;width:120px;'>Họ tên</td>" +
                "<td style='padding:10px 14px;border-bottom:1px solid #f0f0f0;'>" + name + "</td></tr>" +
                "<tr><td style='padding:10px 14px;background:#fef2f2;border-left:4px solid #e61a27;border-radius:0 4px 4px 0;font-weight:bold;color:#9b1216;'>Email</td>" +
                "<td style='padding:10px 14px;border-bottom:1px solid #f0f0f0;'><a href='mailto:" + email + "' style='color:#e61a27;text-decoration:none;'>" + email + "</a></td></tr>" +
                "<tr><td style='padding:10px 14px;background:#fef2f2;border-left:4px solid #e61a27;border-radius:0 4px 4px 0;font-weight:bold;color:#9b1216;'>Điện thoại</td>" +
                "<td style='padding:10px 14px;border-bottom:1px solid #f0f0f0;'>" + (phone != null && !phone.isBlank() ? phone : "<em style='color:#999'>Không cung cấp</em>") + "</td></tr>" +
                "</table>" +

                // Message
                "<p style='font-weight:bold;color:#9b1216;margin:0 0 8px;font-size:14px;'>💬 NỘI DUNG:</p>" +
                "<div style='background:#f8f8f8;border:1px solid #eeeeee;border-radius:6px;padding:16px 18px;line-height:1.7;color:#444;white-space:pre-wrap;'>" + message + "</div>" +

                "<hr style='border:none;border-top:1px solid #eeeeee;margin:28px 0;'/>" +
                "<p style='margin:0;color:#999;font-size:12px;text-align:center;'>Bạn có thể trả lời trực tiếp email này để phản hồi đến <strong>" + name + "</strong>.</p>" +
                "</td></tr>" +

                // Footer
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:16px;color:#999999;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table>" +
                "</td></tr></table></body></html>";
    }

    // ==================== NEWSLETTER NOTIFICATION EMAIL ====================

    @Async
    public void sendNewsletterNotification(String subscriberEmail) {
        try {
            String htmlContent = buildNewsletterNotificationHtml(subscriberEmail);
            brevoEmailSender.sendEmail(supportEmail, "📬 Đăng ký nhận tin mới: " + subscriberEmail, htmlContent);
        } catch (Exception e) {
            System.err.println("Gửi email thông báo newsletter thất bại: " + e.getMessage());
        }
    }

    private String buildNewsletterNotificationHtml(String email) {
        String now = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy"));
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;padding:30px 0;'>" +
                "<tr><td align='center'>" +
                "<table width='560' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);'>" +

                // Header
                "<tr><td style='background:linear-gradient(135deg,#e61a27,#9b1216);padding:28px 32px;text-align:center;'>" +
                "<h1 style='margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;'>📬 ĐĂNG KÝ NHẬN TIN MỚI</h1>" +
                "<p style='margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;'>Có người vừa đăng ký nhận bản tin từ GinFilm</p>" +
                "</td></tr>" +

                // Body
                "<tr><td style='padding:32px;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0f0f0;margin-bottom:24px;'>" +
                "<tr><td style='padding:14px 18px;background:#fef2f2;border-left:4px solid #e61a27;font-weight:bold;color:#9b1216;width:140px;'>📧 Email</td>" +
                "<td style='padding:14px 18px;font-size:15px;color:#222;'><a href='mailto:" + email + "' style='color:#e61a27;text-decoration:none;font-weight:bold;'>" + email + "</a></td></tr>" +
                "<tr><td style='padding:14px 18px;background:#fef2f2;border-left:4px solid #e61a27;font-weight:bold;color:#9b1216;'>🕐 Thời gian</td>" +
                "<td style='padding:14px 18px;font-size:15px;color:#555;'>" + now + "</td></tr>" +
                "</table>" +
                "<p style='color:#666;font-size:13px;text-align:center;margin:0;'>Thêm email này vào danh sách gửi bản tin định kỳ của hệ thống.</p>" +
                "</td></tr>" +

                // Footer
                "<tr><td style='background-color:#f9f9f9;text-align:center;padding:14px;color:#aaaaaa;font-size:12px;border-top:1px solid #eeeeee;'>© 2026 GinFilm. All rights reserved.</td></tr>" +
                "</table></td></tr></table></body></html>";
    }
}
