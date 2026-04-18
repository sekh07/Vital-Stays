package com.hotel.management.repository;

import com.hotel.management.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByRoomId(Long roomId);
    List<Booking> findByStatus(String status);
    
    @Query("SELECT b FROM Booking b WHERE b.room.id = :roomId AND " +
           "((b.checkIn < :checkOut AND b.checkOut > :checkIn) AND b.status != 'CANCELLED')")
    List<Booking> findConflictingBookings(
            @Param("roomId") Long roomId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut
    );

    List<Booking> findByCustomerPhone(String phone);
    List<Booking> findByCustomerEmail(String email);
   List<Booking> findByCustomerEmailOrderByCreatedAtDesc(String email);
   boolean existsByGuestAccessId(String guestAccessId);
       Optional<Booking> findByGuestAccessId(String guestAccessId);
    
    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.status = 'CHECKED_OUT'")
       BigDecimal getTotalRevenue();

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status IN ('CHECKED_IN', 'CONFIRMED') AND " +
           "b.checkIn <= CURDATE() AND b.checkOut >= CURDATE()")
    Long getOccupiedRoomsCount();
}
