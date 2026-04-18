package com.hotel.management.repository;

import com.hotel.management.entity.OtpChallenge;
import com.hotel.management.entity.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {
    Optional<OtpChallenge> findByEmailAndPurpose(String email, OtpPurpose purpose);
    void deleteByEmailAndPurpose(String email, OtpPurpose purpose);
    long deleteByExpiresAtBefore(LocalDateTime timestamp);
}
