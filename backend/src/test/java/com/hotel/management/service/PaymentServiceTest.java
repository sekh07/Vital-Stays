package com.hotel.management.service;

import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.PaymentVerificationDTO;
import com.hotel.management.dto.RazorpayOrderDTO;
import com.hotel.management.entity.Booking;
import com.hotel.management.entity.Payment;
import com.hotel.management.entity.Room;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private org.springframework.core.env.Environment environment;

    @Spy
    @InjectMocks
    private PaymentService paymentService;

    @Test
    void createOrderReusesExistingPendingOrder() {
        Booking booking = buildBooking(1L, "PENDING");
        Payment existing = Payment.builder()
                .id(10L)
                .booking(booking)
                .status("PENDING")
                .transactionId("txn_existing")
                .razorpayOrderId("order_existing")
                .build();

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(1L)).thenReturn(Optional.of(existing));

        RazorpayOrderDTO result = paymentService.createOrder(1L, null);

        assertEquals("order_existing", result.getOrderId());
        assertEquals(250000L, result.getAmount());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void verifyPaymentAndConfirmBookingCallsConfirmWhenVerified() {
        PaymentVerificationDTO dto = PaymentVerificationDTO.builder()
                .bookingId(2L)
                .razorpayOrderId("order_1")
                .razorpayPaymentId("pay_1")
                .razorpaySignature("sig_1")
                .build();

        doReturn(true).when(paymentService).verifyPayment(dto, "user@example.com");
        BookingDTO confirmed = BookingDTO.builder().id(2L).status("CONFIRMED").build();
        when(bookingService.confirmBooking(2L, "pay_1")).thenReturn(confirmed);

        BookingDTO verified = paymentService.verifyPaymentAndConfirmBooking(dto, "user@example.com");

        assertNotNull(verified);
        assertEquals("CONFIRMED", verified.getStatus());
        verify(bookingService, times(1)).confirmBooking(2L, "pay_1");
    }

    @Test
    void verifyPaymentAndConfirmBookingSkipsConfirmWhenNotVerified() {
        PaymentVerificationDTO dto = PaymentVerificationDTO.builder()
                .bookingId(3L)
                .razorpayOrderId("order_2")
                .razorpayPaymentId("pay_2")
                .razorpaySignature("sig_2")
                .build();

        doReturn(false).when(paymentService).verifyPayment(dto, "user@example.com");

        BookingDTO verified = paymentService.verifyPaymentAndConfirmBooking(dto, "user@example.com");

        assertNull(verified);
        verify(bookingService, never()).confirmBooking(anyLong(), anyString());
    }

    private Booking buildBooking(Long id, String status) {
        Room room = Room.builder()
                .id(21L)
                .roomNumber("201")
                .type("SUITE")
                .pricePerNight(BigDecimal.valueOf(5000))
                .capacity(2)
                .active(true)
                .build();

        return Booking.builder()
                .id(id)
                .room(room)
                .customerName("Payment User")
                .customerPhone("9999999999")
                .customerEmail("payment@example.com")
                .checkIn(LocalDate.now().plusDays(1))
                .checkOut(LocalDate.now().plusDays(3))
                .totalAmount(BigDecimal.valueOf(2500))
                .status(status)
                .paymentStatus("PENDING")
                .build();
    }
}
