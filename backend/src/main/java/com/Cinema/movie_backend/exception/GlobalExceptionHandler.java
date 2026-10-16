package com.Cinema.movie_backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<Object> handleConcurrentUpdate(Exception ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.CONFLICT,
                "Thông tin tài khoản vừa thay đổi. Vui lòng tải lại và thử lại giao dịch.", request);
    }

    private ResponseEntity<Object> buildErrorResponse(Exception ex, HttpStatus status, String message, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message != null ? message : ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return new ResponseEntity<>(body, status);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(Exception ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.FORBIDDEN, "Access denied", request);
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Object> handleStatus(org.springframework.web.server.ResponseStatusException ex, WebRequest request) {
        return buildErrorResponse(ex, HttpStatus.valueOf(ex.getStatusCode().value()), ex.getReason(), request);
    }

    // Handle Custom Domain Exceptions (Logged as WARNING)

    @ExceptionHandler({
            AccountTemporarilyLockedException.class,
            AuthFailedException.class,
            DuplicateReviewException.class,
            MovieNotFoundException.class,
            NotPurchasedException.class,
            NotWatchedEnoughException.class,
            ReviewNotFoundException.class,
            UnauthorizedException.class
    })
    public ResponseEntity<Object> handleCustomExceptions(Exception ex, WebRequest request) {
        log.warn("Business Exception: {} - Path: {}", ex.getMessage(), request.getDescription(false), ex);

        HttpStatus status = HttpStatus.BAD_REQUEST;

        if (ex instanceof AccountTemporarilyLockedException) {
            status = HttpStatus.LOCKED;
            return ResponseEntity.status(status).body(Map.of(
                "timestamp", LocalDateTime.now(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", ex.getMessage(),
                "locked", true,
                "path", request.getDescription(false).replace("uri=", "")
            ));
        } else if (ex instanceof UnauthorizedException || ex instanceof AuthFailedException) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (ex instanceof MovieNotFoundException || ex instanceof ReviewNotFoundException) {
            status = HttpStatus.NOT_FOUND;
        }

        return buildErrorResponse(ex, status, ex.getMessage(), request);
    }

    @ExceptionHandler({
            NullPointerException.class,
            IndexOutOfBoundsException.class,
            ClassCastException.class,
            org.springframework.dao.DataAccessException.class,
            org.springframework.transaction.TransactionException.class
    })
    public ResponseEntity<Object> handleTechnicalExceptions(Exception ex, WebRequest request) {
        log.error("Technical Exception: {} - Path: {}", ex.getMessage(), request.getDescription(false), ex);
        return buildErrorResponse(ex, HttpStatus.INTERNAL_SERVER_ERROR, "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.", request);
    }

    // Handle RuntimeExceptions (which were previously caught in controllers as 400 Bad Request)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleRuntimeException(RuntimeException ex, WebRequest request) {
        log.warn("Runtime Exception: {} - Path: {}", ex.getMessage(), request.getDescription(false), ex);
        return buildErrorResponse(ex, HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    // Handle Generic/Unexpected Exceptions (Logged as ERROR)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleAllUncaughtException(Exception ex, WebRequest request) {
        log.error("Unhandled Exception: {} - Path: {}", ex.getMessage(), request.getDescription(false), ex);
        return buildErrorResponse(ex, HttpStatus.INTERNAL_SERVER_ERROR, "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.", request);
    }
}
