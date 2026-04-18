package com.hotel.management.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "otp_challenges",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_otp_email_purpose", columnNames = {"email", "purpose"})
        },
        indexes = {
                @Index(name = "idx_otp_purpose_expires", columnList = "purpose,expires_at"),
                @Index(name = "idx_otp_email_purpose", columnList = "email,purpose")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpChallenge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private OtpPurpose purpose;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private Integer attempts;

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
