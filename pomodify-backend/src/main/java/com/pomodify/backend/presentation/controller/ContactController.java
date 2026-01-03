package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.infrastructure.mail.EmailService;
import com.pomodify.backend.presentation.dto.request.contact.ContactRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
@Slf4j
public class ContactController {

    private final EmailService emailService;

    @PostMapping
    public ResponseEntity<Map<String, String>> submitContactForm(@Valid @RequestBody ContactRequest request) {
        try {
            log.info("Received contact form submission from: {}", request.getEmail());
            
            emailService.sendContactEmail(
                request.getName(),
                request.getEmail(),
                request.getReason(),
                request.getMessage()
            );
            
            log.info("Contact email sent successfully for: {}", request.getEmail());
            return ResponseEntity.ok(Map.of("message", "Your message has been sent successfully. We'll get back to you soon!"));
        } catch (Exception e) {
            log.error("Failed to send contact email from {}: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to send your message. Please try again later or email us directly at contact@pomodify.site"));
        }
    }
}
