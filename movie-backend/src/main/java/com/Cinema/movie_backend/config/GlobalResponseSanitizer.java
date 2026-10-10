package com.Cinema.movie_backend.config;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalResponseSanitizer implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {

        if (body instanceof Map) {
            Map<?, ?> bodyMap = (Map<?, ?>) body;
            if (bodyMap.containsKey("message") || bodyMap.containsKey("error")) {
                Object messageObj = bodyMap.get("message");
                Object errorObj = bodyMap.get("error");
                String message = messageObj != null ? messageObj.toString() : "";
                String error = errorObj != null ? errorObj.toString() : "";
                String contentToCheck = message + " " + error;

                if (isTechnicalError(contentToCheck)) {
                    Map<Object, Object> newMap = new HashMap<>(bodyMap);
                    if (messageObj != null && isTechnicalError(message)) {
                        newMap.put("message", sanitizeMessage(message));
                    }
                    if (errorObj != null && isTechnicalError(error)) {
                        newMap.put("error", sanitizeMessage(error));
                    }
                    return newMap;
                }
            }
        } else if (body instanceof String) {
            String bodyStr = (String) body;
            if (isTechnicalError(bodyStr)) {
                return sanitizeMessage(bodyStr);
            }
        }
        return body;
    }

    private boolean isTechnicalError(String msg) {
        if (msg == null) return false;
        return msg.contains("Unexpected row count") ||
               msg.contains("StaleStateException") ||
               msg.contains("OptimisticLockException") ||
               msg.contains("foreign key constraint") ||
               msg.contains("DataIntegrityViolationException") ||
               msg.contains("com.Cinema.movie_backend") ||
               msg.contains("hibernate") ||
               msg.contains("SQL") ||
               msg.contains("java.") ||
               msg.contains("org.springframework.") ||
               msg.contains("Exception") ||
               msg.contains("JWT") ||
               msg.contains("could not execute") ||
               msg.contains("Cannot invoke") ||
               msg.contains("IndexOutOfBounds");
    }

    private String sanitizeMessage(String originalMsg) {
        if (originalMsg == null || originalMsg.isEmpty()) return originalMsg;

        if (originalMsg.contains("Unexpected row count") || originalMsg.contains("StaleStateException") || originalMsg.contains("OptimisticLockException")) {
            return "Dữ liệu đã thay đổi hoặc đang được xử lý, vui lòng tải lại trang và thử lại.";
        }
        if (originalMsg.contains("foreign key constraint") || originalMsg.contains("DataIntegrityViolationException")) {
            return "Không thể thực hiện vì dữ liệu này đang được liên kết với dữ liệu khác trong hệ thống.";
        }
        return "Đã có lỗi xảy ra trong hệ thống, vui lòng thử lại sau.";
    }
}
