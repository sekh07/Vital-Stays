package com.hotel.management.controller;

import com.hotel.management.dto.RazorpayOrderDTO;
import com.hotel.management.dto.PaymentVerificationDTO;
import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.ApiResponse;
import com.hotel.management.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/payments")
public class PaymentController {
    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<RazorpayOrderDTO>> createOrder(
            @RequestParam Long bookingId,
            Authentication authentication) {
        logger.info("Creating payment order for booking: {}", bookingId);
        RazorpayOrderDTO order = paymentService.createOrder(bookingId, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Order created successfully", order));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<BookingDTO>> verifyPayment(
            @Valid @RequestBody PaymentVerificationDTO verificationDTO,
            Authentication authentication) {
        logger.info("Verifying payment for booking: {}", verificationDTO.getBookingId());
        BookingDTO confirmedBooking = paymentService.verifyPaymentAndConfirmBooking(verificationDTO, authentication.getName());

        if (confirmedBooking == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Payment verification failed. In Razorpay Test Mode, confirm RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are valid test keys from the same Razorpay account."
            );
        }

        String message = Boolean.TRUE.equals(confirmedBooking.getConfirmationEmailSent())
                ? "Payment verified successfully. Booking confirmation email sent."
                : "Payment verified successfully, but booking confirmation email could not be sent. Please contact support if needed.";

        return ResponseEntity.ok(ApiResponse.success(message, confirmedBooking));
    }
}
