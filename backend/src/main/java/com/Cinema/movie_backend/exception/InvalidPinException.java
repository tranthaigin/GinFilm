package com.Cinema.movie_backend.exception;

/** Only a failed PIN attempt commits its counter; activation failures still roll back. */
public class InvalidPinException extends RuntimeException {
    public InvalidPinException(String message) { super(message); }
}
