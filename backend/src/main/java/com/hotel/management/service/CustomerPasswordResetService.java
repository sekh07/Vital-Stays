package com.hotel.management.service;

import com.hotel.management.dto.CustomerResetPasswordRequest;
import com.hotel.management.entity.Customer;
import com.hotel.management.entity.OtpChallenge;
import com.hotel.management.entity.OtpPurpose;
import com.hotel.management.exception.RateLimitException;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.repository.OtpChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CustomerPasswordResetService {
    private static final Logger logger = LoggerFactory.getLogger(CustomerPasswordResetService.class);

    private final JavaMailSender mailSender;
    private final CustomerRepository customerRepository;
    private final OtpChallengeRepository otpChallengeRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Long> emailCooldownUntil = new ConcurrentHashMap<>();
    private final Map<String, Long> ipCooldownUntil = new ConcurrentHashMap<>();
    private final Map<String, RateWindow> emailRateWindow = new ConcurrentHashMap<>();
    private final Map<String, RateWindow> ipRateWindow = new ConcurrentHashMap<>();
    private final Object rateLimitLock = new Object();

    @Value("${password.reset.otp.expiry-seconds:300}")
    private long otpExpirySeconds;

    @Value("${password.reset.otp.max-attempts:5}")
    private int otpMaxAttempts;

    @Value("${password.reset.otp.cooldown-seconds:60}")
    private long otpCooldownSeconds;

    @Value("${password.reset.otp.max-requests-per-window:5}")
    private int maxRequestsPerEmailWindow;

    @Value("${password.reset.otp.max-requests-per-ip-window:20}")
    private int maxRequestsPerIpWindow;

    @Value("${password.reset.otp.window-seconds:900}")
    private long otpWindowSeconds;

    @Value("${otp.mail.from:}")
    private String otpMailFrom;

    @Value("${password.reset.mail.subject:Vital Stays password reset code}")
    private String resetMailSubject;

    public CustomerPasswordResetService(
            JavaMailSender mailSender,
            CustomerRepository customerRepository,
            OtpChallengeRepository otpChallengeRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.mailSender = mailSender;
        this.customerRepository = customerRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void sendResetOtp(String email, String requesterIp) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedIp = normalizeIp(requesterIp);

        enforceSendRateLimit(normalizedEmail, normalizedIp);

        Customer customer = customerRepository.findByEmail(normalizedEmail).orElse(null);
        if (customer == null || !Boolean.TRUE.equals(customer.getActive())) {
            logger.info("Password reset OTP requested for unknown or inactive account: {}", normalizedEmail);
            return;
        }

        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(otpExpirySeconds);

        otpChallengeRepository.deleteByExpiresAtBefore(LocalDateTime.now());

        OtpChallenge challenge = otpChallengeRepository.findByEmailAndPurpose(normalizedEmail, OtpPurpose.PASSWORD_RESET)
                .orElseGet(() -> OtpChallenge.builder()
                        .email(normalizedEmail)
                        .purpose(OtpPurpose.PASSWORD_RESET)
                        .build());

        challenge.setOtpCode(otp);
        challenge.setExpiresAt(expiresAt);
        challenge.setAttempts(0);
        challenge.setMaxAttempts(otpMaxAttempts);
        otpChallengeRepository.save(challenge);

        sendOtpEmail(normalizedEmail, otp, otpExpirySeconds);
        logger.info("Password reset OTP generated for {}", normalizedEmail);
    }

    private void enforceSendRateLimit(String email, String requesterIp) {
        long now = System.currentTimeMillis();
        long cooldownMs = Math.max(0, otpCooldownSeconds) * 1000L;
        long windowMs = Math.max(60, otpWindowSeconds) * 1000L;
        int emailWindowMax = Math.max(1, maxRequestsPerEmailWindow);
        int ipWindowMax = Math.max(1, maxRequestsPerIpWindow);

        synchronized (rateLimitLock) {
            if (now < emailCooldownUntil.getOrDefault(email, 0L)
                    || now < ipCooldownUntil.getOrDefault(requesterIp, 0L)) {
                throw new RateLimitException("Too many OTP requests. Please wait before trying again.");
            }

            if (!recordWithinWindow(emailRateWindow, email, now, windowMs, emailWindowMax)
                    || !recordWithinWindow(ipRateWindow, requesterIp, now, windowMs, ipWindowMax)) {
                throw new RateLimitException("Too many OTP requests. Please try again later.");
            }

            emailCooldownUntil.put(email, now + cooldownMs);
            ipCooldownUntil.put(requesterIp, now + cooldownMs);
        }
    }

    private boolean recordWithinWindow(
            Map<String, RateWindow> windowMap,
            String key,
            long now,
            long windowMs,
            int maxRequests
    ) {
        RateWindow existing = windowMap.get(key);
        if (existing == null || now >= existing.windowStartMs + windowMs) {
            windowMap.put(key, new RateWindow(now, 1));
            return true;
        }

        if (existing.count >= maxRequests) {
            return false;
        }

        existing.count++;
        return true;
    }

    public void resetPassword(CustomerResetPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        OtpChallenge challenge = otpChallengeRepository
                .findByEmailAndPurpose(email, OtpPurpose.PASSWORD_RESET)
                .orElse(null);
        if (challenge == null) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        if (LocalDateTime.now().isAfter(challenge.getExpiresAt())) {
            otpChallengeRepository.delete(challenge);
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            otpChallengeRepository.delete(challenge);
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        if (!challenge.getOtpCode().equals(request.getOtp())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
                otpChallengeRepository.delete(challenge);
            } else {
                otpChallengeRepository.save(challenge);
            }
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        customer.setPassword(passwordEncoder.encode(request.getNewPassword()));
        customerRepository.save(customer);
        otpChallengeRepository.delete(challenge);
        logger.info("Password reset completed for {}", email);
    }

    private void sendOtpEmail(String to, String otp, long expirySeconds) {
        String from = otpMailFrom == null ? "" : otpMailFrom.trim();
        if (from.isEmpty() || from.contains("your_email@gmail.com")) {
            throw new IllegalStateException("Mail sender is not configured. Set MAIL_USERNAME/OTP_MAIL_FROM.");
        }

        String body = "Your Vital Stays password reset code is: " + otp + "\n\n"
                + "This code will expire in " + (expirySeconds / 60) + " minutes."
                + "\n\nIf you did not request this, please ignore this email.";

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(resetMailSubject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException ex) {
            logger.error("Failed to send password reset OTP email to {}", to, ex);
            throw new IllegalStateException("Failed to send reset OTP email. Please try again.");
        }
    }

    private String generateOtp() {
        int value = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(value);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String normalizeIp(String ip) {
        return ip == null || ip.isBlank() ? "unknown" : ip.trim();
    }
    private static class RateWindow {
        private final long windowStartMs;
        private int count;

        private RateWindow(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
