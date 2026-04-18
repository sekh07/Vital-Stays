package com.hotel.management.controller;

import com.hotel.management.dto.DashboardStatsDTO;
import com.hotel.management.dto.ApiResponse;
import com.hotel.management.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {
    private static final Logger logger = LoggerFactory.getLogger(AnalyticsController.class);

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats() {
        logger.info("Fetching dashboard statistics");
        try {
            DashboardStatsDTO stats = analyticsService.getDashboardStats();
            return ResponseEntity.ok(ApiResponse.success("Dashboard stats fetched", stats));
        } catch (Exception e) {
            logger.error("Error fetching dashboard stats: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Error fetching statistics"));
        }
    }
}
