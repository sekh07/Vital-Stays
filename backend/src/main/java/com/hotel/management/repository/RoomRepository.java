package com.hotel.management.repository;

import com.hotel.management.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomNumber(String roomNumber);
    List<Room> findByActive(Boolean active);
    long countByActiveTrue();
    boolean existsByRoomNumber(String roomNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);

        @Query("SELECT r FROM Room r WHERE r.active = true " +
            "AND (:guests IS NULL OR r.capacity >= :guests) " +
            "AND (:location IS NULL OR :location = '' " +
            "     OR LOWER(r.type) LIKE CONCAT('%', LOWER(:location), '%') " +
            "     OR LOWER(COALESCE(r.description, '')) LIKE CONCAT('%', LOWER(:location), '%') " +
            "     OR LOWER(r.roomNumber) LIKE CONCAT('%', LOWER(:location), '%'))")
        List<Room> findAvailableRoomsByFilters(
            @Param("guests") Integer guests,
            @Param("location") String location
        );

        @Query("SELECT r FROM Room r WHERE r.active = true " +
            "AND (:guests IS NULL OR r.capacity >= :guests) " +
            "AND (:location IS NULL OR :location = '' " +
            "     OR LOWER(r.type) LIKE CONCAT('%', LOWER(:location), '%') " +
            "     OR LOWER(COALESCE(r.description, '')) LIKE CONCAT('%', LOWER(:location), '%') " +
            "     OR LOWER(r.roomNumber) LIKE CONCAT('%', LOWER(:location), '%')) " +
            "AND NOT EXISTS (" +
            "    SELECT b.id FROM Booking b WHERE b.room = r AND b.status <> 'CANCELLED' " +
            "    AND b.checkIn < :checkOut AND b.checkOut > :checkIn)")
        List<Room> findAvailableRoomsBetweenDates(
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("guests") Integer guests,
            @Param("location") String location
        );
}
