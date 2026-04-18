package com.hotel.management.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080}")
    private String corsAllowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                    .requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/register").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/signup/send-otp").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/signup/verify-otp").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/customer/signup").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/customer/login").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/customer/google").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/customer/forgot-password/send-otp").permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/customer/forgot-password/reset").permitAll()
                    .requestMatchers(HttpMethod.POST, "/support/contact").permitAll()
                    .requestMatchers(HttpMethod.GET, "/auth/customer/me").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/auth/customer/me").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.POST, "/auth/customer/change-password").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.GET, "/rooms/available").permitAll()
                    .requestMatchers(HttpMethod.GET, "/settings/public").permitAll()
                    .requestMatchers(HttpMethod.POST, "/bookings/create").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/bookings/*/cancel").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings/me").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.POST, "/payments/create-order").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers(HttpMethod.POST, "/payments/verify").hasAnyRole("CUSTOMER", "ADMIN")
                    .requestMatchers("/analytics/**").hasRole("ADMIN")
                    .requestMatchers("/customers/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/settings").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/settings").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/rooms").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/rooms").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/rooms/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/rooms/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings/room/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings/status/confirmed").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/bookings/otp-audit").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/bookings/verify-otp").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/bookings/*/confirm").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/bookings/*/checkin").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/bookings/*/checkout").hasRole("ADMIN")
                    .requestMatchers("/webhook/**").permitAll()
                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());

        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
