package com.hotel.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerAdminResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private Boolean verified;
    private Boolean active;
    private LocalDateTime createdAt;
}
