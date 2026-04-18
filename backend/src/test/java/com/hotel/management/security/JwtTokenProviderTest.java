package com.hotel.management.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    @Test
    void generateValidateAndReadClaims() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", "this-is-a-test-jwt-secret-key-with-at-least-sixty-four-bytes-length");
        ReflectionTestUtils.setField(provider, "jwtExpiration", 60000L);

        String token = provider.generateToken("user@example.com", "ROLE_CUSTOMER");

        assertNotNull(token);
        assertTrue(provider.validateToken(token));
        assertEquals("user@example.com", provider.getEmailFromToken(token));
        assertEquals("ROLE_CUSTOMER", provider.getRoleFromToken(token));
    }

    @Test
    void validateTokenReturnsFalseForMalformedToken() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", "this-is-a-test-jwt-secret-key-with-at-least-sixty-four-bytes-length");
        ReflectionTestUtils.setField(provider, "jwtExpiration", 60000L);

        assertFalse(provider.validateToken("not-a-jwt-token"));
    }
}
