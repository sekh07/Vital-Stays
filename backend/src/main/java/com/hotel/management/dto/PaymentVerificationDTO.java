package com.hotel.management.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentVerificationDTO {
    @NotBlank(message = "razorpayPaymentId is required")
    private String razorpayPaymentId;

    @NotBlank(message = "razorpayOrderId is required")
    private String razorpayOrderId;

    @NotBlank(message = "razorpaySignature is required")
    private String razorpaySignature;

    @NotNull(message = "bookingId is required")
    private Long bookingId;
}
