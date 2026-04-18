package com.hotel.management.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.PaymentVerificationDTO;
import com.hotel.management.dto.RazorpayOrderDTO;
import com.hotel.management.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
class PaymentControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService;

    @Test
    void createOrderReturnsCreatedResponse() throws Exception {
        RazorpayOrderDTO order = RazorpayOrderDTO.builder()
                .orderId("order_abc")
                .amount(250000L)
                .currency("INR")
                .receipt("booking_9")
                .build();

        when(paymentService.createOrder(9L, "pay@example.com")).thenReturn(order);

        mockMvc.perform(post("/payments/create-order")
                        .param("bookingId", "9")
                        .principal(new UsernamePasswordAuthenticationToken("pay@example.com", "n/a")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Order created successfully"))
                .andExpect(jsonPath("$.data.orderId").value("order_abc"));

        verify(paymentService).createOrder(9L, "pay@example.com");
    }

    @Test
    void verifyPaymentReturnsOkWhenVerified() throws Exception {
        PaymentVerificationDTO dto = PaymentVerificationDTO.builder()
                .bookingId(9L)
                .razorpayOrderId("order_abc")
                .razorpayPaymentId("pay_abc")
                .razorpaySignature("sig_abc")
                .build();

        BookingDTO confirmed = BookingDTO.builder()
                .id(9L)
                .confirmationEmailSent(true)
                .build();

        when(paymentService.verifyPaymentAndConfirmBooking(eq(dto), eq("pay@example.com"))).thenReturn(confirmed);

        mockMvc.perform(post("/payments/verify")
                        .principal(new UsernamePasswordAuthenticationToken("pay@example.com", "n/a"))
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Payment verified successfully. Booking confirmation email sent."));

        verify(paymentService).verifyPaymentAndConfirmBooking(eq(dto), eq("pay@example.com"));
    }

    @Test
    void verifyPaymentReturnsUnauthorizedWhenVerificationFails() throws Exception {
        PaymentVerificationDTO dto = PaymentVerificationDTO.builder()
                .bookingId(11L)
                .razorpayOrderId("order_fail")
                .razorpayPaymentId("pay_fail")
                .razorpaySignature("sig_fail")
                .build();

        when(paymentService.verifyPaymentAndConfirmBooking(eq(dto), eq("pay@example.com"))).thenReturn(null);

        mockMvc.perform(post("/payments/verify")
                        .principal(new UsernamePasswordAuthenticationToken("pay@example.com", "n/a"))
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
    }
}
