package com.hotel.management.service;

import com.hotel.management.dto.BookingDTO;
import com.hotel.management.entity.Booking;
import com.hotel.management.entity.Room;
import com.hotel.management.repository.BookingOtpAuditEventRepository;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.repository.RoomRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private BookingConfirmationEmailService bookingConfirmationEmailService;

    @Mock
    private BookingOtpAuditEventRepository bookingOtpAuditEventRepository;

    @InjectMocks
    private BookingService bookingService;

    @Test
    void updateBookingRejectsInvalidTransition() {
        Booking booking = buildBooking(1L, "PENDING", "PENDING", null);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        BookingDTO request = BookingDTO.builder()
                .status("CHECKED_OUT")
                .paymentStatus("PAID")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> bookingService.updateBooking(1L, request));

        assertTrue(ex.getMessage().contains("Invalid booking status transition"));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void confirmBookingIsIdempotentForSamePaymentId() {
        Booking booking = buildBooking(2L, "CONFIRMED", "PAID", "pay_001");
        when(bookingRepository.findById(2L)).thenReturn(Optional.of(booking));

        BookingDTO result = bookingService.confirmBooking(2L, "pay_001");

        assertEquals("CONFIRMED", result.getStatus());
        assertEquals("pay_001", result.getPaymentId());
        verify(bookingRepository, never()).save(any(Booking.class));
        verify(bookingConfirmationEmailService, never()).sendBookingConfirmationEmail(any(Booking.class));
    }

    @Test
    void checkInBookingAllowsConfirmedOnly() {
        Booking booking = buildBooking(3L, "CONFIRMED", "PAID", "pay_002");
        booking.setGuestAccessId("7654321");
        booking.setCheckInOtp("123456");
        when(bookingRepository.findById(3L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingDTO result = bookingService.checkInBooking(3L, "7654321", "123456", "manager@hotel.com");

        assertEquals("CHECKED_IN", result.getStatus());
        assertNotNull(result.getCheckOutOtp());
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    private Booking buildBooking(Long id, String status, String paymentStatus, String paymentId) {
        Room room = Room.builder()
                .id(11L)
                .roomNumber("101")
                .type("DELUXE")
                .pricePerNight(BigDecimal.valueOf(2500))
                .capacity(2)
                .active(true)
                .build();

        return Booking.builder()
                .id(id)
                .room(room)
                .customerName("Test User")
                .customerPhone("9999999999")
                .customerEmail("test@example.com")
                .checkIn(LocalDate.now().plusDays(1))
                .checkOut(LocalDate.now().plusDays(2))
                .totalAmount(BigDecimal.valueOf(2500))
                .status(status)
                .paymentStatus(paymentStatus)
                .paymentId(paymentId)
                .build();
    }
}
