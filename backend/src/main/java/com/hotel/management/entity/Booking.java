package com.hotel.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "bookings",
    indexes = {
        @Index(name = "idx_booking_customer_email_created", columnList = "customerEmail,created_at"),
        @Index(name = "idx_booking_status_dates", columnList = "status,check_in,check_out"),
        @Index(name = "idx_booking_room_dates_status", columnList = "room_id,check_in,check_out,status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String customerPhone;

    @Column(nullable = false)
    private String customerEmail;

    @Column(nullable = false, name = "check_in")
    private LocalDate checkIn;

    @Column(nullable = false, name = "check_out")
    private LocalDate checkOut;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String status; // PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "payment_status")
    private String paymentStatus; // PENDING, PAID, FAILED

    @Column(name = "guest_access_id", length = 7, unique = true)
    private String guestAccessId;

    @Column(name = "check_in_otp", length = 6)
    private String checkInOtp;

    @Column(name = "check_out_otp", length = 6)
    private String checkOutOtp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = "PENDING";
        this.paymentStatus = "PENDING";
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
