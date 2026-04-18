package com.hotel.management.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingOtpVerificationRequest {
    @NotBlank(message = "Guest ID is required")
    @Pattern(regexp = "^\\d{7}$", message = "Guest ID must be exactly 7 digits")
    private String guestAccessId;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^\\d{6}$", message = "OTP must be exactly 6 digits")
    private String otp;

    @NotBlank(message = "Operation is required")
    @Pattern(regexp = "^(?i)(CHECKIN|CHECKOUT)$", message = "Operation must be CHECKIN or CHECKOUT")
    private String operation; // CHECKIN or CHECKOUT
}
