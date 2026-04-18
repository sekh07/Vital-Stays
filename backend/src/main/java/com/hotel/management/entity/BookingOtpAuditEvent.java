package com.hotel.management.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_otp_audit_events", indexes = {
        @Index(name = "idx_booking_otp_audit_ts", columnList = "occurred_at"),
        @Index(name = "idx_booking_otp_audit_operation", columnList = "operation"),
        @Index(name = "idx_booking_otp_audit_actor", columnList = "actor")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingOtpAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(nullable = false, length = 40)
    private String operation;

    @Column(nullable = false, length = 255)
    private String actor;

    @Column(name = "booking_id_ref", nullable = false, length = 32)
    private String bookingIdRef;

    @Column(name = "guest_id_mask", nullable = false, length = 16)
    private String guestIdMask;

    @Column(nullable = false)
    private Boolean success;

    @Column(nullable = false, length = 500)
    private String detail;
}
