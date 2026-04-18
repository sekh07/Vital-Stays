package com.hotel.management.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomDTO {
    private Long id;

    @NotBlank(message = "Room number is required")
    @Size(max = 100, message = "Room number must be <= 100 characters")
    private String roomNumber;

    @NotBlank(message = "Room type is required")
    private String type;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private Double pricePerNight;

    @Size(max = 2000, message = "Description must be <= 2000 characters")
    private String description;

    @NotNull(message = "Capacity is required")
    @Positive(message = "Capacity must be positive")
    private Integer capacity;

    private Boolean active;
}
