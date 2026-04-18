package com.hotel.management.controller;

import com.hotel.management.dto.LoginRequest;
import com.hotel.management.dto.AuthResponse;
import com.hotel.management.dto.ApiResponse;
import com.hotel.management.dto.CustomerAuthResponse;
import com.hotel.management.dto.CustomerChangePasswordRequest;
import com.hotel.management.dto.CustomerForgotPasswordRequest;
import com.hotel.management.dto.GoogleAuthRequest;
import com.hotel.management.dto.CustomerLoginRequest;
import com.hotel.management.dto.CustomerProfileUpdateRequest;
import com.hotel.management.dto.CustomerResetPasswordRequest;
import com.hotel.management.dto.CustomerSignupRequest;
import com.hotel.management.dto.SendSignupOtpRequest;
import com.hotel.management.dto.VerifySignupOtpRequest;
import com.hotel.management.service.AuthService;
import com.hotel.management.service.CustomerAuthService;
import com.hotel.management.service.CustomerPasswordResetService;
import com.hotel.management.service.SignupOtpService;
import com.hotel.management.exception.RateLimitException;
import com.hotel.management.entity.Admin;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    @Autowired
    private SignupOtpService signupOtpService;

    @Autowired
    private CustomerAuthService customerAuthService;

    @Autowired
    private CustomerPasswordResetService customerPasswordResetService;

    @Value("${auth.allow-public-admin-register:false}")
    private boolean allowPublicAdminRegister;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        logger.info("Login request for: {}", request.getEmail());
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (Exception e) {
            logger.error("Login failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@RequestBody Admin admin) {
        logger.info("Registration request for: {}", admin.getEmail());
        if (!allowPublicAdminRegister) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin registration is disabled"));
        }
        try {
            authService.register(admin);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration successful", "Admin created"));
        } catch (Exception e) {
            logger.error("Registration failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/signup/send-otp")
    public ResponseEntity<ApiResponse<String>> sendSignupOtp(@Valid @RequestBody SendSignupOtpRequest request) {
        logger.info("Signup OTP request for: {}", request.getEmail());
        try {
            signupOtpService.sendOtp(request);
            return ResponseEntity.ok(ApiResponse.success("OTP sent successfully", null));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/signup/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifySignupOtp(@Valid @RequestBody VerifySignupOtpRequest request) {
        logger.info("Signup OTP verify request for: {}", request.getEmail());
        boolean valid = signupOtpService.verifyOtp(request);

        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid or expired OTP"));
        }

        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully", null));
    }

    @PostMapping("/customer/signup")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> customerSignup(
            @Valid @RequestBody CustomerSignupRequest request) {
        logger.info("Customer signup request for: {}", request.getEmail());
        CustomerAuthResponse response = customerAuthService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Customer registered successfully", response));
    }

    @PostMapping("/customer/login")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> customerLogin(
            @Valid @RequestBody CustomerLoginRequest request) {
        logger.info("Customer login request for: {}", request.getEmail());
        CustomerAuthResponse response = customerAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Customer login successful", response));
    }

    @PostMapping("/customer/google")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> customerGoogleLogin(
            @Valid @RequestBody GoogleAuthRequest request) {
        logger.info("Customer Google sign-in request received");
        try {
            CustomerAuthResponse response = customerAuthService.googleLogin(request);
            return ResponseEntity.ok(ApiResponse.success("Customer Google sign-in successful", response));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Customer Google sign-in failed: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Google sign-in failed"));
        }
    }

    @PostMapping("/customer/forgot-password/send-otp")
    public ResponseEntity<ApiResponse<String>> sendCustomerForgotPasswordOtp(
            @Valid @RequestBody CustomerForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        logger.info("Customer forgot-password OTP request received");
        try {
            customerPasswordResetService.sendResetOtp(request.getEmail(), resolveClientIp(httpRequest));
        } catch (RateLimitException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(ex.getMessage()));
        } catch (Exception ex) {
            logger.warn("Forgot-password OTP send attempt completed with internal error");
        }
        return ResponseEntity.ok(ApiResponse.success(
                "If an account exists for this email, a reset OTP has been sent.",
                null
        ));
    }

    @PostMapping("/customer/forgot-password/reset")
    public ResponseEntity<ApiResponse<String>> resetCustomerPassword(
            @Valid @RequestBody CustomerResetPasswordRequest request) {
        logger.info("Customer password reset attempt received");
        try {
            customerPasswordResetService.resetPassword(request);
            return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid or expired OTP"));
        }
    }

    @GetMapping("/customer/me")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> getCustomerProfile(Authentication authentication) {
        CustomerAuthResponse response = customerAuthService.getProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Customer profile fetched successfully", response));
    }

    @PutMapping("/customer/me")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> updateCustomerProfile(
            @Valid @RequestBody CustomerProfileUpdateRequest request,
            Authentication authentication) {
        try {
            CustomerAuthResponse response = customerAuthService.updateProfile(authentication.getName(), request);
            return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", response));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/customer/change-password")
    public ResponseEntity<ApiResponse<String>> changeCustomerPassword(
            @Valid @RequestBody CustomerChangePasswordRequest request,
            Authentication authentication) {
        try {
            customerAuthService.changePassword(authentication.getName(), request);
            return ResponseEntity.ok(ApiResponse.success("Password updated successfully", null));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] parts = forwardedFor.split(",");
            if (parts.length > 0 && !parts[0].isBlank()) {
                return parts[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
