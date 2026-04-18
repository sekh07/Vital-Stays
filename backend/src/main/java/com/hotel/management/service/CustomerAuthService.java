package com.hotel.management.service;

import com.hotel.management.dto.CustomerAuthResponse;
import com.hotel.management.dto.CustomerChangePasswordRequest;
import com.hotel.management.dto.CustomerLoginRequest;
import com.hotel.management.dto.CustomerProfileUpdateRequest;
import com.hotel.management.dto.CustomerSignupRequest;
import com.hotel.management.dto.GoogleAuthRequest;
import com.hotel.management.dto.VerifySignupOtpRequest;
import com.hotel.management.entity.Customer;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

@Service
public class CustomerAuthService {
    private static final Logger logger = LoggerFactory.getLogger(CustomerAuthService.class);

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final SignupOtpService signupOtpService;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    @Value("${google.oauth.client-id:}")
    private String googleClientId;

    public CustomerAuthService(
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            SignupOtpService signupOtpService,
            JwtTokenProvider jwtTokenProvider,
            ObjectMapper objectMapper
    ) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.signupOtpService = signupOtpService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.objectMapper = objectMapper;
    }

    public CustomerAuthResponse signup(CustomerSignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();

        if (customerRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        if (customerRepository.existsByPhone(phone)) {
            throw new IllegalArgumentException("Phone already registered");
        }

        boolean otpValid = signupOtpService.verifyOtp(VerifySignupOtpRequest.builder()
                .email(email)
                .otp(request.getOtp())
                .build());

        if (!otpValid) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        Customer customer = Customer.builder()
                .name(request.getName().trim())
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode(request.getPassword()))
                .verified(true)
                .build();

        Customer saved = customerRepository.save(customer);
        logger.info("Customer created successfully: {}", saved.getEmail());

        return toResponse(saved);
    }

    public CustomerAuthResponse login(CustomerLoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String rawPassword = request.getPassword() == null ? "" : request.getPassword();

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new IllegalArgumentException("Account is disabled. Contact support.");
        }

        if (!passwordEncoder.matches(rawPassword, customer.getPassword())) {
            // Google-created accounts are initialized without a user-known password.
            if (customer.getPhone() == null || customer.getPhone().isBlank()) {
                throw new IllegalArgumentException("This account uses Google sign-in. Use Google login or reset password first.");
            }
            throw new IllegalArgumentException("Invalid credentials");
        }

        return toResponse(customer);
    }

    public CustomerAuthResponse googleLogin(GoogleAuthRequest request) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new IllegalStateException("Google sign-in is not configured");
        }

        JsonNode profile = fetchGoogleProfile(request.getCredential());
        String audience = textValue(profile, "aud");
        if (!googleClientId.equals(audience)) {
            throw new IllegalArgumentException("Google sign-in token audience mismatch");
        }

        String emailVerified = textValue(profile, "email_verified");
        if (!Boolean.parseBoolean(emailVerified)) {
            throw new IllegalArgumentException("Google account email is not verified");
        }

        String email = textValue(profile, "email").trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) {
            throw new IllegalArgumentException("Google sign-in did not return an email address");
        }

        String name = normalizeName(textValue(profile, "name"), email);

        Customer customer = customerRepository.findByEmail(email)
                .map(existing -> {
                    if (!Boolean.TRUE.equals(existing.getActive())) {
                        throw new IllegalArgumentException("Account is disabled. Contact support.");
                    }

                    boolean needsUpdate = false;
                    if (existing.getName() == null || existing.getName().isBlank()) {
                        existing.setName(name);
                        needsUpdate = true;
                    }

                    if (!Boolean.TRUE.equals(existing.getVerified())) {
                        existing.setVerified(true);
                        needsUpdate = true;
                    }

                    return needsUpdate ? customerRepository.save(existing) : existing;
                })
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .name(name)
                        .email(email)
                        .phone("")
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .verified(true)
                        .active(true)
                        .build()));

        logger.info("Google sign-in completed for customer: {}", customer.getEmail());
        return toResponse(customer);
    }

    public CustomerAuthResponse getProfile(String requesterEmail) {
        Customer customer = customerRepository.findByEmail(requesterEmail.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new IllegalArgumentException("Account is disabled. Contact support.");
        }

        return toResponse(customer);
    }

    @Transactional
    public CustomerAuthResponse updateProfile(String requesterEmail, CustomerProfileUpdateRequest request) {
        Customer customer = customerRepository.findByEmail(requesterEmail.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new IllegalArgumentException("Account is disabled. Contact support.");
        }

        String name = request.getName() == null ? "" : request.getName().trim();
        if (name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }

        customer.setName(name);

        if (request.getPhone() != null) {
            String normalizedPhone = request.getPhone().trim().replaceAll("\\D", "");
            if (!normalizedPhone.isEmpty()) {
                if (normalizedPhone.length() < 10 || normalizedPhone.length() > 15) {
                    throw new IllegalArgumentException("Phone must be 10 to 15 digits");
                }

                if (customerRepository.existsByPhoneAndIdNot(normalizedPhone, customer.getId())) {
                    throw new IllegalArgumentException("Phone already registered");
                }
            }
            customer.setPhone(normalizedPhone);
        }

        String profileImageUrl = request.getProfileImageUrl();
        if (profileImageUrl != null) {
            String normalized = profileImageUrl.trim();
            if (normalized.isEmpty()) {
                customer.setProfileImageUrl(null);
            } else {
                if (!normalized.startsWith("data:image/")) {
                    throw new IllegalArgumentException("Profile image must be a valid image data URL");
                }
                customer.setProfileImageUrl(normalized);
            }
        }

        Customer saved = customerRepository.saveAndFlush(customer);
        Customer reloaded = customerRepository.findById(saved.getId()).orElse(saved);
        logger.info("Customer profile updated: email={}, phone={}", reloaded.getEmail(), reloaded.getPhone());
        return toResponse(reloaded);
    }

    public void changePassword(String requesterEmail, CustomerChangePasswordRequest request) {
        Customer customer = customerRepository.findByEmail(requesterEmail.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new IllegalArgumentException("Account is disabled. Contact support.");
        }

        String currentPassword = request.getCurrentPassword() == null ? "" : request.getCurrentPassword();
        String newPassword = request.getNewPassword() == null ? "" : request.getNewPassword();

        if (!passwordEncoder.matches(currentPassword, customer.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }

        if (passwordEncoder.matches(newPassword, customer.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        customer.setPassword(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);
    }

    private CustomerAuthResponse toResponse(Customer customer) {
        String token = jwtTokenProvider.generateToken(customer.getEmail(), "ROLE_CUSTOMER");
        long expiresIn = jwtTokenProvider.getJwtExpiration();

        return CustomerAuthResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .profileImageUrl(customer.getProfileImageUrl())
            .token(token)
            .expiresIn(expiresIn)
                .build();
    }

    private JsonNode fetchGoogleProfile(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new IllegalArgumentException("Google credential is required");
        }

        try {
            String response = WebClient.create("https://oauth2.googleapis.com")
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/tokeninfo")
                            .queryParam("id_token", credential)
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(5));

            if (response == null || response.isBlank()) {
                throw new IllegalArgumentException("Google sign-in verification failed");
            }

            return objectMapper.readTree(response);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            logger.warn("Google token verification failed: {}", ex.getMessage());
            throw new IllegalArgumentException("Invalid Google sign-in token");
        }
    }

    private String textValue(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return field == null || field.isNull() ? "" : field.asText("");
    }

    private String normalizeName(String name, String email) {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }

        String localPart = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        if (localPart.isBlank()) {
            return "Google User";
        }

        return Character.toUpperCase(localPart.charAt(0)) + localPart.substring(1);
    }
}
