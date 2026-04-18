package com.hotel.management.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import com.hotel.management.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFound(
            ResourceNotFoundException ex, WebRequest request) {
        logger.error("Resource not found: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error("Resource not found: " + ex.getMessage()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(BookingConflictException.class)
    public ResponseEntity<ApiResponse<Object>> handleBookingConflict(
            BookingConflictException ex, WebRequest request) {
        logger.error("Booking conflict: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error("Booking conflict: " + ex.getMessage()),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationError(
            MethodArgumentNotValidException ex, WebRequest request) {
        BindingResult result = ex.getBindingResult();
        String message = result.getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .reduce((a, b) -> a + ", " + b)
                .orElse("Validation error");
        logger.error("Validation error: {}", message);
        return new ResponseEntity<>(
                ApiResponse.error(message),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgument(
            IllegalArgumentException ex, WebRequest request) {
        logger.error("Illegal argument: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error("Invalid request: " + ex.getMessage()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Object>> handleResponseStatus(
            ResponseStatusException ex, WebRequest request) {
        logger.error("Request failed: {}", ex.getReason());
        String reason = ex.getReason() != null ? ex.getReason() : "Request failed";
        return new ResponseEntity<>(
                ApiResponse.error(reason),
                ex.getStatusCode()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGlobalException(
            Exception ex, WebRequest request) {
        logger.error("Unexpected error: {}", ex.getMessage(), ex);
        return new ResponseEntity<>(
                ApiResponse.error("An unexpected error occurred. Please try again."),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
