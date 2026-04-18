package com.hotel.management.service;

import com.hotel.management.entity.Booking;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;

@Service
public class BookingConfirmationEmailService {
    private static final Logger logger = LoggerFactory.getLogger(BookingConfirmationEmailService.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DecimalFormat AMOUNT_FORMAT = new DecimalFormat("#,##0.00");

    private final JavaMailSender mailSender;

    @Value("${booking.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${booking.mail.subject:Vital Stays booking confirmation}")
    private String subject;

    public BookingConfirmationEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean sendBookingConfirmationEmail(Booking booking) {
        String to = booking.getCustomerEmail();
        if (to == null || to.isBlank()) {
            logger.warn("Skipping booking confirmation email: customer email missing for booking {}", booking.getId());
            return false;
        }

        if (fromEmail == null || fromEmail.isBlank() || fromEmail.contains("your_email")) {
            logger.warn("Skipping booking confirmation email: mail sender not configured (booking {})", booking.getId());
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Enable multipart mode for HTML + plain text
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(buildPlainTextBody(booking), buildHtmlBody(booking));

            // Attach cover image as inline (cid:coverImage)
            java.io.File coverFile = new java.io.File("frontend/img/cover.jpg");
            if (coverFile.exists()) {
                helper.addInline("coverImage", coverFile);
            } else {
                logger.warn("Cover image not found at {}. Email will be sent without banner.", coverFile.getAbsolutePath());
            }

            mailSender.send(message);
            logger.info("Booking confirmation email sent for booking {} to {}", booking.getId(), to);
            return true;
        } catch (MessagingException ex) {
            logger.error("Failed to build booking confirmation email for booking {}", booking.getId(), ex);
            return false;
        } catch (Exception ex) {
            logger.error("Failed to send booking confirmation email for booking {}", booking.getId(), ex);
            return false;
        }
    }

    private String buildPlainTextBody(Booking booking) {
        String roomNumber = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "N/A";
        String roomType = booking.getRoom() != null ? booking.getRoom().getType() : "Room";

        return String.format(
                "Hello %s,%n%n" +
                "Your booking has been confirmed at Vital Stays.%n%n" +
                "Booking ID: %d%n" +
                "Room: %s (%s)%n" +
                "Check-in: %s%n" +
                "Check-out: %s%n" +
                "Total Amount: INR %s%n" +
                "Payment ID: %s%n%n" +
                "Thank you for choosing Vital Stays.",
                safe(booking.getCustomerName(), "Guest"),
                booking.getId(),
                roomNumber,
                roomType,
                booking.getCheckIn() != null ? booking.getCheckIn().format(DATE_FORMAT) : "N/A",
                booking.getCheckOut() != null ? booking.getCheckOut().format(DATE_FORMAT) : "N/A",
                                formatAmount(booking.getTotalAmount()),
                safe(booking.getPaymentId(), "N/A")
        );
    }

        private String buildHtmlBody(Booking booking) {
                String guestName = escapeHtml(safe(booking.getCustomerName(), "Guest"));
                String bookingId = String.valueOf(booking.getId());
                String roomNumber = escapeHtml(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "N/A");
                String roomType = escapeHtml(booking.getRoom() != null ? booking.getRoom().getType() : "Room");
                String checkIn = booking.getCheckIn() != null ? booking.getCheckIn().format(DATE_FORMAT) : "N/A";
                String checkOut = booking.getCheckOut() != null ? booking.getCheckOut().format(DATE_FORMAT) : "N/A";
                String amount = formatAmount(booking.getTotalAmount());
                String paymentId = escapeHtml(safe(booking.getPaymentId(), "N/A"));

        return String.format(
                """
                <!doctype html>
                <html lang=\"en\">
                <head>
                    <meta charset=\"UTF-8\">
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                    <title>Booking Confirmation</title>
                    <link href=\"https://fonts.googleapis.com/css?family=Poppins:400,600,700&display=swap\" rel=\"stylesheet\">
                </head>
                <body style=\"margin:0;padding:0;background:#f4f6fb;font-family:'Poppins',Segoe UI,Arial,sans-serif;color:#0f172a;\">
                    <table role=\"presentation\" width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f6fb;padding:28px 12px;\">
                        <tr>
                            <td align=\"center\">
                                <table role=\"presentation\" width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;width:100%%;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(225,29,72,0.10);\">
                                    <tr>
                                        <td style=\"padding:0;\">
                                            <img src=\"cid:coverImage\" alt=\"Vital Stays\" style=\"width:100%%;height:120px;object-fit:cover;display:block;\">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:24px 32px 10px 32px;\">
                                            <h2 style=\"margin:0 0 8px 0;font-size:24px;font-weight:700;color:#e11d48;letter-spacing:0.01em;\">Booking Confirmed!</h2>
                                            <p style=\"margin:0 0 18px 0;font-size:16px;color:#334155;\">Hello %s,<br>Your booking at <b>Vital Stays</b> is <span style=\"color:#10b981;font-weight:600;\">confirmed</span>. We look forward to hosting you!</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:0 32px 24px 32px;\">
                                            <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;box-shadow:0 2px 8px rgba(0,0,0,0.03);\">
                                                <tr>
                                                    <td style=\"padding:16px 20px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;\">
                                                        <span style=\"font-size:13px;color:#be123c;font-weight:600;\">Booking ID</span><br>
                                                        <span style=\"font-size:17px;font-weight:700;letter-spacing:0.02em;\">#%s</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:16px 20px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;\">
                                                        <span style=\"font-size:13px;color:#be123c;font-weight:600;\">Room</span><br>
                                                        <span style=\"font-size:16px;font-weight:600;\">%s</span> <span style=\"font-size:13px;color:#64748b;\">(%s)</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:16px 20px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;\">
                                                        <span style=\"font-size:13px;color:#be123c;font-weight:600;\">Check-in / Check-out</span><br>
                                                        <span style=\"font-size:15px;\">%s</span> <span style=\"color:#64748b;\">to</span> <span style=\"font-size:15px;\">%s</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:16px 20px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;\">
                                                        <span style=\"font-size:13px;color:#be123c;font-weight:600;\">Total Amount</span><br>
                                                        <span style=\"font-size:16px;font-weight:700;\">INR %s</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:16px 20px;font-size:15px;color:#334155;\">
                                                        <span style=\"font-size:13px;color:#be123c;font-weight:600;\">Payment ID</span><br>
                                                        <span style=\"font-size:15px;\">%s</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:0 32px 24px 32px;text-align:center;\">
                                            <a href=\"mailto:support@vitalstays.com\" style=\"display:inline-block;margin-top:18px;padding:12px 32px;background:#e11d48;color:#fff;border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 2px 8px rgba(225,29,72,0.10);transition:background 0.2s;\">Contact Support</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:18px 32px 18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;\">
                                            <p style=\"margin:0;font-size:13px;color:#64748b;\">This is an automated confirmation from <b>Vital Stays</b>.<br>Thank you for choosing us!</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """,
                guestName,
                escapeHtml(bookingId),
                roomNumber,
                roomType,
                escapeHtml(checkIn),
                escapeHtml(checkOut),
                escapeHtml(amount),
                paymentId
        );
        }

        private String formatAmount(BigDecimal value) {
                BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
                return AMOUNT_FORMAT.format(normalized);
        }

        private String escapeHtml(String value) {
                if (value == null) {
                        return "";
                }

                return value
                                .replace("&", "&amp;")
                                .replace("<", "&lt;")
                                .replace(">", "&gt;")
                                .replace("\"", "&quot;")
                                .replace("'", "&#39;");
        }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
