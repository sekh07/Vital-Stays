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
                </head>
                <body style=\"margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;\">
                    <table role=\"presentation\" width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f6fb;padding:28px 12px;\">
                        <tr>
                            <td align=\"center\">
                                <table role=\"presentation\" width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;width:100%%;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;\">
                                    <tr>
                                        <td style=\"padding:18px 24px;background:linear-gradient(140deg,#be123c 0%%,#e11d48 100%%);color:#ffffff;\">
                                            <h1 style=\"margin:0;font-size:22px;line-height:1.2;font-weight:800;\">Vital Stays</h1>
                                            <p style=\"margin:8px 0 0;font-size:13px;opacity:0.9;\">Booking Confirmation</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:22px 24px 8px;\">
                                            <p style=\"margin:0 0 10px;font-size:16px;\">Hello %s,</p>
                                            <p style=\"margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;\">
                                                Your booking has been <strong style=\"color:#166534;\">confirmed</strong>. We look forward to hosting you at Vital Stays.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:8px 24px 6px;\">
                                            <table role=\"presentation\" width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;\">
                                                <tr>
                                                    <td style=\"padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;\">
                                                        <strong style=\"display:block;color:#0f172a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;\">Booking ID</strong>
                                                        #%s
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;\">
                                                        <strong style=\"display:block;color:#0f172a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;\">Room</strong>
                                                        %s (%s)
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;\">
                                                        <strong style=\"display:block;color:#0f172a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;\">Check-in / Check-out</strong>
                                                        %s to %s
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;\">
                                                        <strong style=\"display:block;color:#0f172a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;\">Total Amount</strong>
                                                        INR %s
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style=\"padding:14px 16px;font-size:14px;color:#334155;\">
                                                        <strong style=\"display:block;color:#0f172a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;\">Payment ID</strong>
                                                        %s
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:18px 24px 22px;\">
                                            <p style=\"margin:0;font-size:14px;color:#475569;line-height:1.6;\">
                                                Thank you for choosing Vital Stays. If you need assistance, simply reply to this email.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;\">
                                            <p style=\"margin:0;font-size:12px;color:#64748b;\">
                                                This is an automated confirmation from Vital Stays.
                                            </p>
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
