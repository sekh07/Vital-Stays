package com.hotel.management.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.management.dto.BookingDTO;
import com.hotel.management.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookingController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookingControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookingService bookingService;

    @Test
    void createBookingReturnsCreatedResponse() throws Exception {
        BookingDTO request = BookingDTO.builder()
                .roomId(1L)
                .customerName("John Doe")
                .customerPhone("9999999999")
                .customerEmail("john@example.com")
                .checkIn(LocalDate.now().plusDays(1))
                .checkOut(LocalDate.now().plusDays(2))
                .totalAmount(2500.0)
                .build();

        BookingDTO response = BookingDTO.builder()
                .id(101L)
                .roomId(1L)
                .customerName("John Doe")
                .status("PENDING")
                .paymentStatus("PENDING")
                .build();

        when(bookingService.createBooking(eq(request), eq("john@example.com"))).thenReturn(response);

        mockMvc.perform(post("/bookings/create")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", "n/a"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Booking created successfully"))
                .andExpect(jsonPath("$.data.id").value(101))
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        verify(bookingService).createBooking(eq(request), eq("john@example.com"));
    }

    @Test
    void cancelBookingReturnsOkResponse() throws Exception {
        BookingDTO cancelled = BookingDTO.builder()
                .id(102L)
                .status("CANCELLED")
                .paymentStatus("FAILED")
                .build();

        when(bookingService.cancelBooking(102L, "john@example.com")).thenReturn(cancelled);

        mockMvc.perform(put("/bookings/102/cancel")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", "n/a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Booking cancelled"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        verify(bookingService).cancelBooking(102L, "john@example.com");
    }

    @Test
    void getAllBookingsReturnsList() throws Exception {
        BookingDTO first = BookingDTO.builder().id(1L).status("PENDING").build();
        BookingDTO second = BookingDTO.builder().id(2L).status("CONFIRMED").build();
        when(bookingService.getAllBookings()).thenReturn(List.of(first, second));

        mockMvc.perform(get("/bookings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[1].status").value("CONFIRMED"));
    }
}
