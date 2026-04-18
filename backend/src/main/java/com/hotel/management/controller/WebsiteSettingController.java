package com.hotel.management.controller;

import com.hotel.management.dto.ApiResponse;
import com.hotel.management.dto.WebsiteSettingsUpdateRequest;
import com.hotel.management.service.WebsiteSettingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/settings")
public class WebsiteSettingController {
    private final WebsiteSettingService websiteSettingService;

    public WebsiteSettingController(WebsiteSettingService websiteSettingService) {
        this.websiteSettingService = websiteSettingService;
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPublicSettings() {
        return ResponseEntity.ok(ApiResponse.success(
                "Website settings fetched successfully",
                websiteSettingService.getPublicSettings()
        ));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> getAllSettings() {
        return ResponseEntity.ok(ApiResponse.success(
                "Website settings fetched successfully",
                websiteSettingService.getAllSettings()
        ));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> updateSettings(
            @Valid @RequestBody WebsiteSettingsUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Website settings updated successfully",
                websiteSettingService.updateSettings(request)
        ));
    }
}
