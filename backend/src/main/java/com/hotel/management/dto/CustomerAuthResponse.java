package com.hotel.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerAuthResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String profileImageUrl;
    private String token;
    private Long expiresIn;
}
