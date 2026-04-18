package com.hotel.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingOtpAuditEventDTO {
    private LocalDateTime timestamp;
    private String operation;
    private String actor;
    private String bookingId;
    private String guestIdMask;
    private boolean success;
    private String detail;
}
