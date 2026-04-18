package com.hotel.management.controller;

import com.hotel.management.dto.ApiResponse;
import com.hotel.management.dto.SupportContactRequest;
import com.hotel.management.service.SupportContactService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/support")
public class SupportController {
    private static final Logger logger = LoggerFactory.getLogger(SupportController.class);

    private final SupportContactService supportContactService;

    public SupportController(SupportContactService supportContactService) {
        this.supportContactService = supportContactService;
    }

    @PostMapping("/contact")
    public ResponseEntity<ApiResponse<String>> submitContactMessage(@Valid @RequestBody SupportContactRequest request) {
        logger.info("Support contact message received from {}", request.getEmail());
        supportContactService.sendSupportMessage(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Support message sent successfully", null));
    }
}