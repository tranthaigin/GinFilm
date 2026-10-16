package com.Cinema.movie_backend.exception;

public class NotWatchedEnoughException extends RuntimeException {
    public NotWatchedEnoughException(String message) {
        super(message);
    }
}
