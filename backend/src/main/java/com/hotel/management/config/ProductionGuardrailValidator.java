package com.hotel.management.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class ProductionGuardrailValidator {
    private static final Logger logger = LoggerFactory.getLogger(ProductionGuardrailValidator.class);

    private final Environment environment;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:}")
    private String razorpayKeySecret;

    @Value("${auth.dev.plaintext-fallback-enabled:false}")
    private boolean devPlaintextFallbackEnabled;

    @Value("${payment.mock-signature-enabled:false}")
    private boolean mockSignatureEnabled;

    public ProductionGuardrailValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean isDev = environment.acceptsProfiles(Profiles.of("dev"));

        if (!isDev) {
            if (jwtSecret == null || jwtSecret.length() < 64) {
                throw new IllegalStateException("jwt.secret must be at least 64 characters outside dev profile");
            }

            if (isPlaceholder(razorpayKeyId) || isPlaceholder(razorpayKeySecret)) {
                throw new IllegalStateException("Razorpay credentials must be configured outside dev profile");
            }

            if (devPlaintextFallbackEnabled) {
                throw new IllegalStateException("auth.dev.plaintext-fallback-enabled must be false outside dev profile");
            }

            if (mockSignatureEnabled) {
                throw new IllegalStateException("payment.mock-signature-enabled must be false outside dev profile");
            }
        } else {
            if (devPlaintextFallbackEnabled) {
                logger.warn("Development plaintext auth fallback is enabled");
            }
            if (mockSignatureEnabled) {
                logger.warn("Development mock payment signature mode is enabled");
            }
        }
    }

    private boolean isPlaceholder(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.contains("your_key_");
    }
}
