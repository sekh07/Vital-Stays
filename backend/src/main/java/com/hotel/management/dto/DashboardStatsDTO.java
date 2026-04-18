package com.hotel.management.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private Double totalRevenue;
    private Long totalBookings;
    private Long occupiedRooms;
    private Long availableRooms;
    private Double occupancyRate;
}
