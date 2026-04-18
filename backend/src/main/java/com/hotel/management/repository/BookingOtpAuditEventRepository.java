package com.hotel.management.repository;

import com.hotel.management.entity.BookingOtpAuditEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingOtpAuditEventRepository extends JpaRepository<BookingOtpAuditEvent, Long> {
    List<BookingOtpAuditEvent> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
