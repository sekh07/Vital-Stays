package com.hotel.management.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportContactRequest {
    @NotBlank(message = "Name is required")
    @Size(max = 120, message = "Name must be <= 120 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = 255, message = "Email must be <= 255 characters")
    private String email;

    @NotBlank(message = "Subject is required")
    @Size(max = 160, message = "Subject must be <= 160 characters")
    private String subject;

    @NotBlank(message = "Message is required")
    @Size(max = 4000, message = "Message must be <= 4000 characters")
    private String message;
}