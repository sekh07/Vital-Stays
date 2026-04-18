package com.hotel.management.service;

import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.DashboardStatsDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;

@Service
public class AnalyticsService {
    private static final Logger logger = LoggerFactory.getLogger(AnalyticsService.class);

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RoomRepository roomRepository;

    public DashboardStatsDTO getDashboardStats() {
        logger.info("Fetching dashboard statistics");
        
        BigDecimal totalRevenueValue = bookingRepository.getTotalRevenue() != null ?
                bookingRepository.getTotalRevenue() : BigDecimal.ZERO;
        
        Long totalBookings = bookingRepository.count();
        
        Long occupiedRooms = bookingRepository.getOccupiedRoomsCount() != null ? 
                bookingRepository.getOccupiedRoomsCount() : 0L;
        
        Long totalRooms = roomRepository.countByActiveTrue();
        Long availableRooms = Math.max(0L, totalRooms - occupiedRooms);
        
        Double occupancyRate = totalRooms > 0 ? 
                (occupiedRooms.doubleValue() / totalRooms.doubleValue()) * 100 : 0.0;

        logger.info("Dashboard stats - Revenue: {}, Bookings: {}, Occupied: {}, Available: {}", 
                totalRevenueValue, totalBookings, occupiedRooms, availableRooms);
        
        return DashboardStatsDTO.builder()
                .totalRevenue(totalRevenueValue.doubleValue())
                .totalBookings(totalBookings)
                .occupiedRooms(occupiedRooms)
                .availableRooms(availableRooms)
                .occupancyRate(occupancyRate)
                .build();
    }
}
