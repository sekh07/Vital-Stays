package com.hotel.management.service;

import com.hotel.management.dto.SendSignupOtpRequest;
import com.hotel.management.dto.VerifySignupOtpRequest;
import com.hotel.management.entity.OtpChallenge;
import com.hotel.management.entity.OtpPurpose;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.repository.OtpChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class SignupOtpService {
    private static final Logger logger = LoggerFactory.getLogger(SignupOtpService.class);

    private final JavaMailSender mailSender;
    private final OtpChallengeRepository otpChallengeRepository;
    private final CustomerRepository customerRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${otp.expiry-seconds:300}")
    private long otpExpirySeconds;

    @Value("${otp.max-attempts:5}")
    private int otpMaxAttempts;

    @Value("${otp.mail.from:}")
    private String otpMailFrom;

    @Value("${otp.mail.subject:Vital Stays verification code}")
    private String otpMailSubject;

    public SignupOtpService(
            JavaMailSender mailSender,
            OtpChallengeRepository otpChallengeRepository,
            CustomerRepository customerRepository
    ) {
        this.mailSender = mailSender;
        this.otpChallengeRepository = otpChallengeRepository;
        this.customerRepository = customerRepository;
    }

    public void sendOtp(SendSignupOtpRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (customerRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered. Please login.");
        }

        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(otpExpirySeconds);

        otpChallengeRepository.deleteByExpiresAtBefore(LocalDateTime.now());

        OtpChallenge challenge = otpChallengeRepository.findByEmailAndPurpose(email, OtpPurpose.SIGNUP)
                .orElseGet(() -> OtpChallenge.builder()
                        .email(email)
                        .purpose(OtpPurpose.SIGNUP)
                        .build());

        challenge.setOtpCode(otp);
        challenge.setExpiresAt(expiresAt);
        challenge.setAttempts(0);
        challenge.setMaxAttempts(otpMaxAttempts);
        otpChallengeRepository.save(challenge);

        sendOtpEmail(email, otp, otpExpirySeconds);
        logger.info("Signup OTP generated and sent to {}", email);
    }

    public boolean verifyOtp(VerifySignupOtpRequest request) {
        String email = normalizeEmail(request.getEmail());
        OtpChallenge challenge = otpChallengeRepository
                .findByEmailAndPurpose(email, OtpPurpose.SIGNUP)
                .orElse(null);

        if (challenge == null) {
            return false;
        }

        if (LocalDateTime.now().isAfter(challenge.getExpiresAt())) {
            otpChallengeRepository.delete(challenge);
            return false;
        }

        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            otpChallengeRepository.delete(challenge);
            return false;
        }

        if (!challenge.getOtpCode().equals(request.getOtp())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            otpChallengeRepository.save(challenge);
            return false;
        }

        otpChallengeRepository.delete(challenge);
        return true;
    }

    private void sendOtpEmail(String to, String otp, long expirySeconds) {
        String from = otpMailFrom == null ? "" : otpMailFrom.trim();
        if (from.isEmpty() || from.contains("your_email@gmail.com")) {
            throw new IllegalStateException("Mail sender is not configured. Set MAIL_USERNAME/OTP_MAIL_FROM.");
        }

        String body = "Your Vital Stays verification code is: " + otp + "\n\n"
                + "This code will expire in " + (expirySeconds / 60) + " minutes."
                + "\n\nIf you did not request this, please ignore this email.";

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(otpMailSubject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException ex) {
            logger.error("Failed to send OTP email to {}", to, ex);
            throw new IllegalStateException("Failed to send OTP email. Please try again.");
        }
    }

    private String generateOtp() {
        int value = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(value);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
