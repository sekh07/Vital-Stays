package com.hotel.management.service;

import com.hotel.management.dto.BookingDTO;
import com.hotel.management.dto.BookingOtpAuditEventDTO;
import com.hotel.management.entity.Booking;
import com.hotel.management.entity.BookingOtpAuditEvent;
import com.hotel.management.entity.Customer;
import com.hotel.management.entity.Room;
import com.hotel.management.exception.BookingConflictException;
import com.hotel.management.exception.ResourceNotFoundException;
import com.hotel.management.repository.BookingOtpAuditEventRepository;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.CustomerRepository;
import com.hotel.management.repository.RoomRepository;
import com.hotel.management.dto.RoomDTO;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.security.SecureRandom;

@Service
public class BookingService {
    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);
        private static final int OTP_LENGTH = 6;
        private static final int ACCESS_ID_LENGTH = 7;
        private static final int MAX_ACCESS_ID_ATTEMPTS = 20;
        private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RoomRepository roomRepository;

        // Needed to convert Room to RoomDTO for BookingDTO.room
        @Autowired
        @Lazy
        private RoomService roomService;
        @Autowired
        private CustomerRepository customerRepository;

        @Autowired
        private BookingConfirmationEmailService bookingConfirmationEmailService;

        @Autowired
        private BookingOtpAuditEventRepository bookingOtpAuditEventRepository;

        private Customer findCustomerByRequester(String requesterEmail) {
                if (requesterEmail == null || requesterEmail.isBlank()) {
                        return null;
                }
                return customerRepository.findByEmail(requesterEmail.trim().toLowerCase()).orElse(null);
        }

        @Transactional(isolation = Isolation.SERIALIZABLE)
        public BookingDTO createBooking(BookingDTO bookingDTO, String requesterEmail) {
        logger.info("Creating booking for room: {}, customer: {}", 
                bookingDTO.getRoomId(), bookingDTO.getCustomerName());

                Customer requesterCustomer = findCustomerByRequester(requesterEmail);
                if (requesterCustomer != null) {
                        bookingDTO.setCustomerEmail(requesterCustomer.getEmail());
                        bookingDTO.setCustomerName(requesterCustomer.getName());
                        bookingDTO.setCustomerPhone(requesterCustomer.getPhone());
                }

                Room room = roomRepository.findByIdForUpdate(bookingDTO.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        // Check for date overlap with existing bookings
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                bookingDTO.getRoomId(),
                bookingDTO.getCheckIn(),
                bookingDTO.getCheckOut()
        );

        if (!conflicts.isEmpty()) {
            logger.warn("Booking conflict detected for room: {}", bookingDTO.getRoomId());
            throw new BookingConflictException("Room is not available for the selected dates");
        }

        // Calculate total amount
        long days = ChronoUnit.DAYS.between(bookingDTO.getCheckIn(), bookingDTO.getCheckOut());
        if (days <= 0) {
            throw new IllegalArgumentException("Check-out date must be after check-in date");
        }

        BigDecimal totalAmount = room.getPricePerNight()
                .multiply(BigDecimal.valueOf(days));

        Booking booking = Booking.builder()
                .room(room)
                .customerName(bookingDTO.getCustomerName())
                .customerPhone(bookingDTO.getCustomerPhone())
                .customerEmail(bookingDTO.getCustomerEmail())
                .checkIn(bookingDTO.getCheckIn())
                .checkOut(bookingDTO.getCheckOut())
                .totalAmount(totalAmount)
                .status("PENDING")
                .paymentStatus("PENDING")
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        logger.info("Booking created successfully: {}", savedBooking.getId());

        return mapToDTO(savedBooking);
    }

    public BookingDTO updateBooking(Long id, BookingDTO bookingDTO) {
        logger.info("Updating booking: {}", id);
        
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

                String targetStatus = normalizeStatus(bookingDTO.getStatus());
                if (targetStatus != null) {
                        validateStatusTransition(booking.getStatus(), targetStatus);
                        booking.setStatus(targetStatus);
                }

                String targetPaymentStatus = normalizePaymentStatus(bookingDTO.getPaymentStatus());
                if (targetPaymentStatus != null) {
                        booking.setPaymentStatus(targetPaymentStatus);
                }

        Booking updatedBooking = bookingRepository.save(booking);
        logger.info("Booking updated: {}", id);

        return mapToDTO(updatedBooking);
    }

        @Transactional
        public BookingDTO confirmBooking(Long id, String paymentId) {
        logger.info("Confirming booking: {} with payment: {}", id, paymentId);
        
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

                if ("CANCELLED".equals(booking.getStatus())) {
                        throw new IllegalArgumentException("Cancelled booking cannot be confirmed");
                }

                if ("CHECKED_OUT".equals(booking.getStatus())) {
                        throw new IllegalArgumentException("Checked-out booking cannot be confirmed");
                }

                if ("CONFIRMED".equals(booking.getStatus())) {
                        if (paymentId != null && paymentId.equals(booking.getPaymentId())) {
                                return mapToDTO(booking);
                        }

                        throw new IllegalArgumentException("Booking is already confirmed");
                }

                validateStatusTransition(booking.getStatus(), "CONFIRMED");

        booking.setStatus("CONFIRMED");
        booking.setPaymentStatus("PAID");
        booking.setPaymentId(paymentId);
        if (booking.getGuestAccessId() == null || booking.getGuestAccessId().isBlank()) {
                booking.setGuestAccessId(generateUniqueGuestAccessId());
        }
        booking.setCheckInOtp(generateFixedLengthCode(OTP_LENGTH));
        booking.setCheckOutOtp(null);

        Booking confirmedBooking = bookingRepository.save(booking);
                boolean emailSent = bookingConfirmationEmailService.sendBookingConfirmationEmail(confirmedBooking);
        logger.info("Booking confirmed: {}", id);

        BookingDTO confirmedDto = mapToDTO(confirmedBooking);
                confirmedDto.setConfirmationEmailSent(emailSent);
        return confirmedDto;
    }

        public BookingDTO checkoutBooking(Long id, String guestAccessId, String otp, String actorEmail) {
        logger.info("Checking out booking: {}", id);
        
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

                try {
                        validateGuestAccess(booking, guestAccessId);
                        validateOtp(booking.getCheckOutOtp(), otp, "check-out");
                } catch (RuntimeException ex) {
                        logManagerOtpAudit("CHECKOUT", actorEmail, booking.getId(), guestAccessId, false, ex.getMessage());
                        throw ex;
                }

                if (!"CHECKED_IN".equals(booking.getStatus())) {
                        logManagerOtpAudit("CHECKOUT", actorEmail, booking.getId(), guestAccessId, false,
                                "Booking status is not CHECKED_IN");
                        throw new IllegalArgumentException("Only checked-in bookings can be checked out");
                }

        validateStatusTransition(booking.getStatus(), "CHECKED_OUT");

        booking.setStatus("CHECKED_OUT");
        booking.setCheckOutOtp(null);

        Booking checkedOutBooking = bookingRepository.save(booking);
        logManagerOtpAudit("CHECKOUT", actorEmail, checkedOutBooking.getId(), guestAccessId, true,
                "Checkout completed");
        logger.info("Booking checked out: {}", id);

        return mapToDTO(checkedOutBooking);
    }

        public BookingDTO checkInBooking(Long id, String guestAccessId, String otp, String actorEmail) {
                logger.info("Checking in booking: {}", id);

                Booking booking = bookingRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

                try {
                        validateGuestAccess(booking, guestAccessId);
                        validateOtp(booking.getCheckInOtp(), otp, "check-in");
                } catch (RuntimeException ex) {
                        logManagerOtpAudit("CHECKIN", actorEmail, booking.getId(), guestAccessId, false, ex.getMessage());
                        throw ex;
                }

                if (!"CONFIRMED".equals(booking.getStatus())) {
                        logManagerOtpAudit("CHECKIN", actorEmail, booking.getId(), guestAccessId, false,
                                "Booking status is not CONFIRMED");
                        throw new IllegalArgumentException("Only confirmed bookings can be checked in");
                }

                validateStatusTransition(booking.getStatus(), "CHECKED_IN");

                booking.setStatus("CHECKED_IN");
                booking.setCheckInOtp(null);
                booking.setCheckOutOtp(generateFixedLengthCode(OTP_LENGTH));

                Booking checkedInBooking = bookingRepository.save(booking);
                logManagerOtpAudit("CHECKIN", actorEmail, checkedInBooking.getId(), guestAccessId, true,
                        "Check-in completed");
                logger.info("Booking checked in: {}", id);

                return mapToDTO(checkedInBooking);
        }

        public BookingDTO cancelBooking(Long id, String requesterEmail) {
                logger.info("Cancelling booking: {}", id);

                Booking booking = bookingRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

                Customer requesterCustomer = findCustomerByRequester(requesterEmail);
                if (requesterCustomer != null) {
                        String ownerEmail = booking.getCustomerEmail() == null
                                ? ""
                                : booking.getCustomerEmail().trim().toLowerCase();
                        String requesterNormalized = requesterCustomer.getEmail().trim().toLowerCase();
                        if (!ownerEmail.equals(requesterNormalized)) {
                                throw new IllegalArgumentException("You can cancel only your own bookings");
                        }
                }

                if ("CHECKED_OUT".equals(booking.getStatus())) {
                        throw new IllegalArgumentException("Checked-out booking cannot be cancelled");
                }

                validateStatusTransition(booking.getStatus(), "CANCELLED");

                booking.setStatus("CANCELLED");
                booking.setPaymentStatus("FAILED");

                Booking cancelledBooking = bookingRepository.save(booking);
                logger.info("Booking cancelled: {}", id);

                return mapToDTO(cancelledBooking);
        }

    public BookingDTO getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        return mapToDTO(booking);
    }

    public List<BookingDTO> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<BookingDTO> getBookingsByRoomId(Long roomId) {
        return bookingRepository.findByRoomId(roomId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

        public List<BookingDTO> getBookingsByCustomerEmail(String customerEmail) {
                return bookingRepository.findByCustomerEmailOrderByCreatedAtDesc(customerEmail).stream()
                                .map(this::mapToDTO)
                                .collect(Collectors.toList());
        }

    public List<BookingDTO> getConfirmedBookings() {
        return bookingRepository.findByStatus("CONFIRMED").stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

        public List<BookingOtpAuditEventDTO> getRecentOtpAuditEvents(int limit) {
                int safeLimit = Math.max(1, Math.min(limit, 100));
                return bookingOtpAuditEventRepository
                        .findAllByOrderByOccurredAtDesc(PageRequest.of(0, safeLimit))
                        .stream()
                        .map((event) -> BookingOtpAuditEventDTO.builder()
                                .timestamp(event.getOccurredAt())
                                .operation(event.getOperation())
                                .actor(event.getActor())
                                .bookingId(event.getBookingIdRef())
                                .guestIdMask(event.getGuestIdMask())
                                .success(Boolean.TRUE.equals(event.getSuccess()))
                                .detail(event.getDetail())
                                .build())
                        .collect(Collectors.toList());
        }

    public BookingDTO verifyBookingForOperation(String guestAccessId, String otp, String operation, String actorEmail) {
        if (guestAccessId == null || guestAccessId.isBlank()) {
                logManagerOtpAudit("VERIFY", actorEmail, null, guestAccessId, false, "Guest ID is blank");
                throw new IllegalArgumentException("Guest ID is required");
        }

        if (otp == null || otp.isBlank()) {
                logManagerOtpAudit("VERIFY", actorEmail, null, guestAccessId, false, "OTP is blank");
                throw new IllegalArgumentException("OTP is required");
        }

        String normalizedOperation = String.valueOf(operation).trim().toUpperCase(Locale.ROOT);
        String normalizedGuestAccessId = String.valueOf(guestAccessId).trim();

        Booking booking = bookingRepository.findByGuestAccessId(normalizedGuestAccessId)
                .orElseThrow(() -> new ResourceNotFoundException("No booking found for this guest ID"));

        if ("CHECKIN".equals(normalizedOperation)) {
                if (!"CONFIRMED".equals(booking.getStatus())) {
                        logManagerOtpAudit("VERIFY-CHECKIN", actorEmail, booking.getId(), guestAccessId, false,
                                "Booking status is not CONFIRMED");
                        throw new IllegalArgumentException("Only confirmed bookings are eligible for check-in");
                }
                validateOtp(booking.getCheckInOtp(), otp, "check-in");
                logManagerOtpAudit("VERIFY-CHECKIN", actorEmail, booking.getId(), guestAccessId, true,
                        "Verification successful");
                return mapToDTO(booking);
        }

        if ("CHECKOUT".equals(normalizedOperation)) {
                if (!"CHECKED_IN".equals(booking.getStatus())) {
                        logManagerOtpAudit("VERIFY-CHECKOUT", actorEmail, booking.getId(), guestAccessId, false,
                                "Booking status is not CHECKED_IN");
                        throw new IllegalArgumentException("Only checked-in bookings are eligible for check-out");
                }
                validateOtp(booking.getCheckOutOtp(), otp, "check-out");
                logManagerOtpAudit("VERIFY-CHECKOUT", actorEmail, booking.getId(), guestAccessId, true,
                        "Verification successful");
                return mapToDTO(booking);
        }

        logManagerOtpAudit("VERIFY", actorEmail, booking.getId(), guestAccessId, false,
                "Operation is invalid");
        throw new IllegalArgumentException("Operation must be CHECKIN or CHECKOUT");
    }

        private BookingDTO mapToDTO(Booking booking) {
                RoomDTO roomDTO = null;
                if (booking.getRoom() != null) {
                        roomDTO = roomService.mapToDTO(booking.getRoom());
                }
                return BookingDTO.builder()
                                .id(booking.getId())
                                .roomId(booking.getRoom() != null ? booking.getRoom().getId() : null)
                                .roomNumber(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : null)
                                .room(roomDTO)
                                .customerName(booking.getCustomerName())
                                .customerPhone(booking.getCustomerPhone())
                                .customerEmail(booking.getCustomerEmail())
                                .checkIn(booking.getCheckIn())
                                .checkOut(booking.getCheckOut())
                                .totalAmount(booking.getTotalAmount() != null ? booking.getTotalAmount().doubleValue() : null)
                                .status(booking.getStatus())
                                .paymentId(booking.getPaymentId())
                                .paymentStatus(booking.getPaymentStatus())
                                .guestAccessId(booking.getGuestAccessId())
                                .checkInOtp(booking.getCheckInOtp())
                                .checkOutOtp(booking.getCheckOutOtp())
                                .createdAt(booking.getCreatedAt())
                                .build();
        }

        private String generateUniqueGuestAccessId() {
                for (int attempt = 0; attempt < MAX_ACCESS_ID_ATTEMPTS; attempt++) {
                        String candidate = generateFixedLengthCode(ACCESS_ID_LENGTH);
                        if (!bookingRepository.existsByGuestAccessId(candidate)) {
                                return candidate;
                        }
                }

                throw new IllegalStateException("Unable to generate unique guest access ID. Please retry.");
        }

        private String generateFixedLengthCode(int length) {
                int bound = (int) Math.pow(10, length);
                int min = (int) Math.pow(10, length - 1);
                int number = RANDOM.nextInt(bound - min) + min;
                return String.format("%0" + length + "d", number);
        }

        private void validateGuestAccess(Booking booking, String guestAccessId) {
                if (guestAccessId == null || guestAccessId.isBlank()) {
                        throw new IllegalArgumentException("Guest ID is required for this action");
                }

                String expected = booking.getGuestAccessId() == null ? "" : booking.getGuestAccessId().trim();
                String actual = guestAccessId.trim();
                if (!actual.matches("\\d{7}")) {
                        throw new IllegalArgumentException("Guest ID must be exactly 7 digits");
                }
                if (!expected.equals(actual)) {
                        throw new IllegalArgumentException("Invalid guest ID for this booking");
                }
        }

        private void validateOtp(String expectedOtp, String otp, String flow) {
                if (otp == null || otp.isBlank()) {
                        throw new IllegalArgumentException("OTP is required for " + flow + " verification");
                }

                String expected = expectedOtp == null ? "" : expectedOtp.trim();
                String actual = otp.trim();
                if (!actual.matches("\\d{6}")) {
                        throw new IllegalArgumentException("OTP must be exactly 6 digits for " + flow + " verification");
                }
                if (expected.isEmpty() || !expected.equals(actual)) {
                        throw new IllegalArgumentException("Invalid OTP for " + flow + " verification");
                }
        }

        private String normalizeStatus(String value) {
                if (value == null || value.isBlank()) {
                        return null;
                }

                String normalized = value.trim().toUpperCase();
                Set<String> validStatuses = Set.of("PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED");
                if (!validStatuses.contains(normalized)) {
                        throw new IllegalArgumentException("Invalid booking status: " + value);
                }

                return normalized;
        }

        private String normalizePaymentStatus(String value) {
                if (value == null || value.isBlank()) {
                        return null;
                }

                String normalized = value.trim().toUpperCase();
                Set<String> validPaymentStatuses = Set.of("PENDING", "PAID", "FAILED");
                if (!validPaymentStatuses.contains(normalized)) {
                        throw new IllegalArgumentException("Invalid payment status: " + value);
                }

                return normalized;
        }

        private void logManagerOtpAudit(
                String operation,
                String actorEmail,
                Long bookingId,
                String guestAccessId,
                boolean success,
                String detail
        ) {
                String actor = actorEmail == null || actorEmail.isBlank() ? "unknown" : actorEmail.trim().toLowerCase();
                String bookingRef = bookingId == null ? "n/a" : String.valueOf(bookingId);
                String guestRef;
                if (guestAccessId == null || guestAccessId.isBlank()) {
                        guestRef = "n/a";
                } else {
                        String raw = guestAccessId.trim();
                        guestRef = raw.length() > 2 ? "*****" + raw.substring(raw.length() - 2) : "**";
                }

                if (success) {
                        logger.info("AUDIT_MANAGER_OTP operation={} actor={} bookingId={} guestIdMask={} success=true detail={}",
                                operation, actor, bookingRef, guestRef, detail);
                } else {
                        logger.warn("AUDIT_MANAGER_OTP operation={} actor={} bookingId={} guestIdMask={} success=false detail={}",
                                operation, actor, bookingRef, guestRef, detail);
                }

                try {
                        bookingOtpAuditEventRepository.save(
                                BookingOtpAuditEvent.builder()
                                        .occurredAt(LocalDateTime.now())
                                        .operation(operation)
                                        .actor(actor)
                                        .bookingIdRef(bookingRef)
                                        .guestIdMask(guestRef)
                                        .success(success)
                                        .detail(detail)
                                        .build()
                        );
                } catch (RuntimeException ex) {
                        logger.error("Failed to persist OTP audit event: {}", ex.getMessage());
                }
        }

        private void validateStatusTransition(String currentStatus, String targetStatus) {
                String current = normalizeStatus(currentStatus);
                String target = normalizeStatus(targetStatus);

                if (current.equals(target)) {
                        return;
                }

                boolean allowed = switch (current) {
                        case "PENDING" -> Set.of("CONFIRMED", "CANCELLED").contains(target);
                        case "CONFIRMED" -> Set.of("CHECKED_IN", "CANCELLED").contains(target);
                        case "CHECKED_IN" -> Set.of("CHECKED_OUT").contains(target);
                        case "CHECKED_OUT", "CANCELLED" -> false;
                        default -> false;
                };

                if (!allowed) {
                        throw new IllegalArgumentException("Invalid booking status transition: " + current + " -> " + target);
                }
        }
}
