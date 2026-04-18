package com.hotel.management.service;

import com.hotel.management.dto.RazorpayOrderDTO;
import com.hotel.management.dto.PaymentVerificationDTO;
import com.hotel.management.dto.BookingDTO;
import com.hotel.management.entity.Customer;
import com.hotel.management.entity.Payment;
import com.hotel.management.entity.Booking;
import com.hotel.management.exception.ResourceNotFoundException;
import com.hotel.management.repository.PaymentRepository;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.UUID;

@Service
public class PaymentService {
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${payment.mock-signature-enabled:false}")
    private boolean mockSignatureEnabled;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private BookingService bookingService;

    private Customer findCustomerByRequester(String requesterEmail) {
        if (requesterEmail == null || requesterEmail.isBlank()) {
            return null;
        }
        return customerRepository.findByEmail(requesterEmail.trim().toLowerCase()).orElse(null);
    }

    private void enforceCustomerOwnership(Booking booking, String requesterEmail) {
        Customer requester = findCustomerByRequester(requesterEmail);
        if (requester == null) {
            return;
        }

        String ownerEmail = booking.getCustomerEmail() == null
                ? ""
                : booking.getCustomerEmail().trim().toLowerCase();
        String requesterNormalized = requester.getEmail().trim().toLowerCase();

        if (!ownerEmail.equals(requesterNormalized)) {
            throw new IllegalArgumentException("You can only pay for your own booking");
        }
    }

    public RazorpayOrderDTO createOrder(Long bookingId, String requesterEmail) {
        logger.info("Creating Razorpay order for booking: {}", bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        enforceCustomerOwnership(booking, requesterEmail);

        if (!"PENDING".equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalArgumentException("Order can only be created for pending bookings");
        }

        Payment existingPayment = paymentRepository.findByBookingId(bookingId).orElse(null);
        if (existingPayment != null) {
            if ("SUCCESS".equalsIgnoreCase(existingPayment.getStatus())) {
                throw new IllegalArgumentException("Booking is already paid");
            }

            if ("PENDING".equalsIgnoreCase(existingPayment.getStatus())
                    && existingPayment.getRazorpayOrderId() != null
                    && !existingPayment.getRazorpayOrderId().isBlank()) {
                logger.info("Returning existing pending order for booking: {}", bookingId);
                return buildOrderResponse(existingPayment, booking);
            }
        }

        Long amountInRupees = booking.getTotalAmount().longValue();
        if (amountInRupees <= 0L) {
            throw new IllegalArgumentException("Booking amount must be greater than 0");
        }

        // In production, call Razorpay API to create order
        // For demo, we'll create a mock order
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        String receipt = "booking_" + bookingId;

        Payment payment = existingPayment != null ? existingPayment : Payment.builder()
            .booking(booking)
            .build();

        payment.setTransactionId(orderId);
        payment.setStatus("PENDING");
        payment.setRazorpayOrderId(orderId);
        payment.setRazorpayPaymentId(null);
        payment.setRazorpaySignature(null);

        paymentRepository.save(payment);
        logger.info("Order created: {}", orderId);

        return RazorpayOrderDTO.builder()
            .orderId(orderId)
            .amount(amountInRupees * 100)
            .currency("INR")
            .receipt(receipt)
            .keyId(razorpayKeyId)
            .build();
    }

    public boolean verifyPayment(PaymentVerificationDTO verificationDTO, String requesterEmail) {
        logger.info("Verifying payment for booking: {}", verificationDTO.getBookingId());

        try {
            Payment payment = paymentRepository.findByRazorpayOrderId(
                    verificationDTO.getRazorpayOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

            if (!payment.getBooking().getId().equals(verificationDTO.getBookingId())) {
                logger.error("Payment booking mismatch. paymentBookingId={}, requestBookingId={}",
                        payment.getBooking().getId(), verificationDTO.getBookingId());
                return false;
            }

            enforceCustomerOwnership(payment.getBooking(), requesterEmail);

            if ("SUCCESS".equalsIgnoreCase(payment.getStatus())
                    && verificationDTO.getRazorpayPaymentId() != null
                    && verificationDTO.getRazorpayPaymentId().equals(payment.getRazorpayPaymentId())) {
                logger.info("Payment already verified for booking: {}", verificationDTO.getBookingId());
                return true;
            }

            String signature = verificationDTO.getRazorpaySignature();
            boolean mockSignature = signature != null
                    && signature.startsWith("mock_sig_")
                    && mockSignatureEnabled;

            if (!mockSignature) {
                String message = verificationDTO.getRazorpayOrderId() + "|" +
                        verificationDTO.getRazorpayPaymentId();
                String expectedSignature = generateHMAC(message, razorpayKeySecret);

                if (!expectedSignature.equals(signature)) {
                    logger.error("Payment signature verification failed");
                    payment.setStatus("FAILED");
                    paymentRepository.save(payment);
                    return false;
                }
            }

            payment.setRazorpayPaymentId(verificationDTO.getRazorpayPaymentId());
            payment.setRazorpaySignature(verificationDTO.getRazorpaySignature());
            payment.setStatus("SUCCESS");

            paymentRepository.save(payment);
            
            logger.info("Payment verified successfully for booking: {}", 
                    verificationDTO.getBookingId());
            return true;
        } catch (Exception e) {
            logger.error("Error verifying payment: {}", e.getMessage());
            return false;
        }
    }

    @Transactional
    public BookingDTO verifyPaymentAndConfirmBooking(PaymentVerificationDTO verificationDTO, String requesterEmail) {
        boolean verified = verifyPayment(verificationDTO, requesterEmail);
        if (!verified) {
            return null;
        }

        return bookingService.confirmBooking(
                verificationDTO.getBookingId(),
                verificationDTO.getRazorpayPaymentId()
        );
    }

    private RazorpayOrderDTO buildOrderResponse(Payment payment, Booking booking) {
        return RazorpayOrderDTO.builder()
                .orderId(payment.getRazorpayOrderId())
                .amount(booking.getTotalAmount().longValue() * 100)
                .currency("INR")
                .receipt("booking_" + booking.getId())
            .keyId(razorpayKeyId)
                .build();
    }

    private String generateHMAC(String message, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        mac.init(keySpec);
        byte[] hmacBytes = mac.doFinal(message.getBytes());
        StringBuilder hex = new StringBuilder();
        for (byte b : hmacBytes) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    public Payment getPaymentByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
    }
}
