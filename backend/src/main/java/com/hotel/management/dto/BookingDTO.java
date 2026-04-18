package com.hotel.management.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDTO {
    private Long id;

    @NotNull(message = "Room ID is required")
    private Long roomId;

    private String roomNumber;

    @NotBlank(message = "Customer name is required")
    @Size(max = 255, message = "Customer name must be <= 255 characters")
    private String customerName;

    @NotBlank(message = "Customer phone is required")
    @Size(min = 10, max = 15, message = "Customer phone must be between 10 and 15 digits")
    private String customerPhone;

    @NotBlank(message = "Customer email is required")
    @Email(message = "Customer email is invalid")
    private String customerEmail;

    @NotNull(message = "Check-in date is required")
    @Future(message = "Check-in date must be in the future")
    private LocalDate checkIn;

    @NotNull(message = "Check-out date is required")
    @Future(message = "Check-out date must be in the future")
    private LocalDate checkOut;

    @Positive(message = "Total amount must be positive")
    private Double totalAmount;

    private String status;
    private String paymentId;
    private String paymentStatus;
    private String guestAccessId;
    private String checkInOtp;
    private String checkOutOtp;
    private LocalDateTime createdAt;
    private Boolean confirmationEmailSent;
}
