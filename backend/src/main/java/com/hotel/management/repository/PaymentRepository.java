package com.hotel.management.repository;

import com.hotel.management.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String orderId);
    Optional<Payment> findByRazorpayPaymentId(String paymentId);
    Optional<Payment> findByBookingId(Long bookingId);
}
