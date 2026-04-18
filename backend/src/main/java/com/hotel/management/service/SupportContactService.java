package com.hotel.management.service;

import com.hotel.management.dto.SupportContactRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SupportContactService {
    private static final Logger logger = LoggerFactory.getLogger(SupportContactService.class);

    private final JavaMailSender mailSender;

    @Value("${support.mail.to:support@vitalstays.com}")
    private String supportMailTo;

    @Value("${support.mail.from:${spring.mail.username:}}")
    private String supportMailFrom;

    @Value("${support.mail.subject-prefix:[Vital Stays Support]}")
    private String subjectPrefix;

    public SupportContactService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSupportMessage(SupportContactRequest request) {
        String to = normalize(supportMailTo);
        String from = normalize(supportMailFrom);

        if (to.isBlank()) {
            throw new IllegalStateException("Support inbox is not configured. Set SUPPORT_MAIL_TO.");
        }

        if (from.isBlank() || from.contains("your_email@gmail.com")) {
            throw new IllegalStateException("Mail sender is not configured. Set MAIL_USERNAME/SUPPORT_MAIL_FROM.");
        }

        String name = normalize(request.getName());
        String email = normalize(request.getEmail());
        String subject = normalize(request.getSubject());
        String message = normalize(request.getMessage());

        String emailSubject = subjectPrefix + " " + subject;
        String body = "New support message received\n\n"
                + "Name: " + name + "\n"
                + "Email: " + email + "\n"
                + "Submitted At: " + LocalDateTime.now() + "\n\n"
                + "Message:\n" + message + "\n";

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(from);
            mail.setTo(to);
            mail.setReplyTo(email);
            mail.setSubject(emailSubject);
            mail.setText(body);
            mailSender.send(mail);
            logger.info("Support message sent from {} to {}", email, to);
        } catch (MailException ex) {
            logger.error("Failed to send support message from {}", email, ex);
            throw new IllegalStateException("Failed to send support message. Please try again later.");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}