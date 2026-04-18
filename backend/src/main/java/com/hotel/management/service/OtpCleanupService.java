package com.hotel.management.service;

import com.hotel.management.repository.OtpChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class OtpCleanupService {
    private static final Logger logger = LoggerFactory.getLogger(OtpCleanupService.class);

    private final OtpChallengeRepository otpChallengeRepository;

    public OtpCleanupService(OtpChallengeRepository otpChallengeRepository) {
        this.otpChallengeRepository = otpChallengeRepository;
    }

    @Transactional
    @Scheduled(fixedDelayString = "${otp.cleanup.interval-ms:300000}")
    public void deleteExpiredOtpChallenges() {
        long deleted = otpChallengeRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        if (deleted > 0) {
            logger.info("OTP cleanup removed {} expired challenge(s)", deleted);
        }
    }
}
