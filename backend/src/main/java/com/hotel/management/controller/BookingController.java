package com.hotel.management.controller;

import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.BookingOtpAuditEventDTO;
import com.hotel.management.dto.BookingOtpVerificationRequest;
import com.hotel.management.dto.ApiResponse;
import com.hotel.management.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/bookings")
public class BookingController {
    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);

    @Autowired
    private BookingService bookingService;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<BookingDTO>> createBooking(
            @Valid @RequestBody BookingDTO bookingDTO,
            Authentication authentication) {
        logger.info("Creating booking for customer: {}", bookingDTO.getCustomerName());
        BookingDTO created = bookingService.createBooking(bookingDTO, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Booking created successfully", created));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<BookingDTO>> confirmBooking(
            @PathVariable Long id,
            @RequestParam String paymentId) {
        logger.info("Confirming booking: {}", id);
        BookingDTO confirmed = bookingService.confirmBooking(id, paymentId);
        return ResponseEntity.ok(ApiResponse.success("Booking confirmed", confirmed));
    }

    @PutMapping("/{id}/checkout")
    public ResponseEntity<ApiResponse<BookingDTO>> checkoutBooking(
            @PathVariable Long id,
            @RequestParam String guestAccessId,
            @RequestParam String otp,
            Authentication authentication) {
        logger.info("Checking out booking: {}", id);
        BookingDTO checkedOut = bookingService.checkoutBooking(id, guestAccessId, otp, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Booking checked out", checkedOut));
    }

    @PutMapping("/{id}/checkin")
    public ResponseEntity<ApiResponse<BookingDTO>> checkInBooking(
            @PathVariable Long id,
            @RequestParam String guestAccessId,
            @RequestParam String otp,
            Authentication authentication) {
        logger.info("Checking in booking: {}", id);
        BookingDTO checkedIn = bookingService.checkInBooking(id, guestAccessId, otp, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Booking checked in", checkedIn));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<BookingDTO>> verifyBookingOtp(
            @Valid @RequestBody BookingOtpVerificationRequest request,
            Authentication authentication) {
        logger.info("Verifying booking OTP for operation: {}", request.getOperation());
        BookingDTO booking = bookingService.verifyBookingForOperation(
                request.getGuestAccessId(),
                request.getOtp(),
                request.getOperation(),
                authentication.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Booking verification successful", booking));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingDTO>> cancelBooking(
            @PathVariable Long id,
            Authentication authentication) {
        logger.info("Cancelling booking: {}", id);
        BookingDTO cancelled = bookingService.cancelBooking(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled", cancelled));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingDTO>> getBookingById(@PathVariable Long id) {
        logger.info("Fetching booking: {}", id);
        BookingDTO booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.success("Booking fetched successfully", booking));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingDTO>>> getAllBookings() {
        logger.info("Fetching all bookings");
        List<BookingDTO> bookings = bookingService.getAllBookings();
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", bookings));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<ApiResponse<List<BookingDTO>>> getBookingsByRoomId(@PathVariable Long roomId) {
        logger.info("Fetching bookings for room: {}", roomId);
        List<BookingDTO> bookings = bookingService.getBookingsByRoomId(roomId);
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", bookings));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BookingDTO>>> getMyBookings(Authentication authentication) {
        String email = authentication.getName();
        logger.info("Fetching bookings for authenticated customer: {}", email);
        List<BookingDTO> bookings = bookingService.getBookingsByCustomerEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", bookings));
    }

    @GetMapping("/status/confirmed")
    public ResponseEntity<ApiResponse<List<BookingDTO>>> getConfirmedBookings() {
        logger.info("Fetching confirmed bookings");
        List<BookingDTO> bookings = bookingService.getConfirmedBookings();
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", bookings));
    }

    @GetMapping("/otp-audit")
    public ResponseEntity<ApiResponse<List<BookingOtpAuditEventDTO>>> getOtpAuditEvents(
            @RequestParam(defaultValue = "25") int limit) {
        logger.info("Fetching booking OTP audit events, limit={}", limit);
        List<BookingOtpAuditEventDTO> events = bookingService.getRecentOtpAuditEvents(limit);
        return ResponseEntity.ok(ApiResponse.success("OTP audit events fetched successfully", events));
    }
}
