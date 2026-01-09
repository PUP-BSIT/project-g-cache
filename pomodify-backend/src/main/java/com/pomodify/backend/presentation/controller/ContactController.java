package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.port.EmailPort;
import com.pomodify.backend.presentation.dto.request.contact.ContactRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/contact")
@RequiredArgsConstructor
@Slf4j
public class ContactController {

    private final EmailPort emailPort;

    @PostMapping
    public ResponseEntity<Map<String, String>> submitContactForm(@Valid @RequestBody ContactRequest request) {
        log.info("=== CONTACT FORM SUBMISSION START ===");
        log.info("Received contact form submission from: {} ({})", request.getName(), request.getEmail());
        log.info("Contact form details - Reason: {}, Message length: {}", request.getReason(), 
            request.getMessage() != null ? request.getMessage().length() : 0);
        
        try {
            emailPort.sendContactEmail(
                request.getName(),
                request.getEmail(),
                request.getReason(),
                request.getMessage()
            );
            
            log.info("Contact email sent successfully for: {}", request.getEmail());
            log.info("=== CONTACT FORM SUBMISSION SUCCESS ===");
            return ResponseEntity.ok(Map.of("message", "Your message has been sent successfully. We'll get back to you soon!"));
        } catch (Exception e) {
            log.error("=== CONTACT FORM SUBMISSION FAILED ===");
            log.error("Failed to send contact email from {}: {} - {}", request.getEmail(), e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to send your message. Please try again later or email us directly at contact@v2.pomodify.site"));
        }
    }
}
