package com.hotel.management.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerProfileUpdateRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @Size(max = 2_000_000, message = "Profile image payload is too large")
    private String profileImageUrl;

    @Pattern(regexp = "^$|^[0-9]{10,15}$", message = "Phone must be 10 to 15 digits")
    private String phone;
}
