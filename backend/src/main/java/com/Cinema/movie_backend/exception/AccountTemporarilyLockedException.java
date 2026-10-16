package com.Cinema.movie_backend.exception;

public class AccountTemporarilyLockedException extends RuntimeException {
    public AccountTemporarilyLockedException(String message) {
        super(message);
    }
}
