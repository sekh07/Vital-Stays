package com.hotel.management.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebsiteSettingsUpdateRequest {
    @NotNull(message = "settings map is required")
    private Map<String, String> settings;
}
