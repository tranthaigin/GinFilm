package com.Cinema.movie_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM Encryption Service cho nội dung tin nhắn chat.
 *
 * Cơ chế hoạt động:
 *  - Mỗi tin nhắn được mã hóa bằng AES-256-GCM với IV ngẫu nhiên 12 bytes.
 *  - Chuỗi lưu DB = Base64(IV) + ":" + Base64(ciphertext+authTag)
 *  - Giải mã: tách IV và ciphertext, dùng key từ application.properties.
 *
 * Ưu điểm AES-256-GCM:
 *  - Authenticated encryption (phát hiện tampering)
 *  - IV random mỗi tin → cùng nội dung cho ciphertext khác nhau
 *  - Chuẩn công nghiệp, được dùng bởi TLS 1.3
 */
@Service
public class ChatEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int IV_LENGTH = 12;        // bytes (96-bit IV chuẩn GCM)
    private static final String DELIMITER = ":";

    private final SecretKey secretKey;

    public ChatEncryptionService(@Value("${chat.encryption.key}") String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException(
                "chat.encryption.key phải là 32 bytes (256 bits) được encode Base64. " +
                "Hiện tại: " + keyBytes.length + " bytes."
            );
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Mã hóa plaintext → chuỗi lưu DB.
     * Format: Base64(IV) + ":" + Base64(ciphertext)
     *
     * @param plaintext nội dung tin nhắn gốc
     * @return chuỗi đã mã hóa, an toàn để lưu DB
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return plaintext;
        }
        try {
            // Tạo IV ngẫu nhiên mỗi lần encrypt
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes("UTF-8"));

            String ivBase64 = Base64.getEncoder().encodeToString(iv);
            String cipherBase64 = Base64.getEncoder().encodeToString(ciphertext);

            return ivBase64 + DELIMITER + cipherBase64;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi mã hóa tin nhắn chat", e);
        }
    }

    /**
     * Giải mã chuỗi từ DB → plaintext gốc.
     *
     * @param encryptedText chuỗi đã mã hóa từ DB
     * @return nội dung tin nhắn gốc
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isBlank()) {
            return encryptedText;
        }
        // Nếu dữ liệu cũ (plaintext chưa được mã hóa) → trả về nguyên bản
        if (!encryptedText.contains(DELIMITER)) {
            return encryptedText;
        }
        try {
            String[] parts = encryptedText.split(DELIMITER, 2);
            if (parts.length != 2) {
                return encryptedText; // fallback: dữ liệu cũ
            }

            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, "UTF-8");
        } catch (Exception e) {
            // Nếu giải mã thất bại (dữ liệu cũ không encrypted), trả về nguyên bản
            return encryptedText;
        }
    }

    /**
     * Kiểm tra xem một chuỗi có phải dạng đã mã hóa chưa.
     */
    public boolean isEncrypted(String text) {
        if (text == null) return false;
        String[] parts = text.split(DELIMITER, 2);
        if (parts.length != 2) return false;
        try {
            Base64.getDecoder().decode(parts[0]);
            Base64.getDecoder().decode(parts[1]);
            return parts[0].length() == 16; // IV 12 bytes → Base64 = 16 chars
        } catch (Exception e) {
            return false;
        }
    }
}
