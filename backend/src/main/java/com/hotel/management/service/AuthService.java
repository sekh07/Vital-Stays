package com.hotel.management.service;

import com.hotel.management.dto.LoginRequest;
import com.hotel.management.dto.AuthResponse;
import com.hotel.management.entity.Admin;
import com.hotel.management.exception.ResourceNotFoundException;
import com.hotel.management.repository.AdminRepository;
import com.hotel.management.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private Environment environment;

    @Value("${auth.dev.plaintext-fallback-enabled:false}")
    private boolean devPlaintextFallbackEnabled;

    public AuthResponse login(LoginRequest request) {
        logger.info("Login attempt for email: {}", request.getEmail());
        
        Admin admin = adminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with email: " + request.getEmail()));

        boolean bcryptMatch = false;
        try {
            bcryptMatch = passwordEncoder.matches(request.getPassword(), admin.getPassword());
        } catch (IllegalArgumentException ex) {
            logger.warn("Stored password for {} is not BCrypt.", request.getEmail());
        }

        boolean isDevProfile = environment.acceptsProfiles(Profiles.of("dev"));
        boolean devPlainTextFallback = isDevProfile
                && devPlaintextFallbackEnabled
                && request.getPassword().equals(admin.getPassword());

        if (devPlainTextFallback) {
            logger.warn("Using dev plaintext password fallback for {}", request.getEmail());
        }

        boolean validPassword = bcryptMatch || devPlainTextFallback;

        if (!validPassword) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtTokenProvider.generateToken(admin.getEmail(), "ROLE_ADMIN");
        long expiresIn = jwtTokenProvider.getJwtExpiration();

        logger.info("Login successful for email: {}", request.getEmail());
        
        return AuthResponse.builder()
                .token(token)
                .email(admin.getEmail())
                .name(admin.getName())
                .expiresIn(expiresIn)
                .build();
    }

    public void register(Admin admin) {
        logger.info("Attempting to register admin with email: {}", admin.getEmail());
        
        if (adminRepository.existsByEmail(admin.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        adminRepository.save(admin);
        
        logger.info("Admin registered successfully: {}", admin.getEmail());
    }
}
