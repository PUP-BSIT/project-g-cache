package com.pomodify.backend.application.port;

/**
 * Port (interface) for email operations.
 * This allows the application layer to send emails without depending on infrastructure.
 */
public interface EmailPort {
    
    void sendVerificationEmail(String toEmail, String token, String baseUrl);
    
    void sendVerificationEmail(String toEmail, String token, String baseUrl, boolean isResend);
    
    void sendPasswordResetEmail(String toEmail, String token, String baseUrl);
    
    void sendPasswordResetEmail(String toEmail);
    
    void sendVerifyAndResetEmail(String toEmail, String token);
    
    void sendContactEmail(String senderName, String senderEmail, String reason, String messageContent);
    
    void sendSimpleEmail(String to, String subject, String text);
    
    void sendHtmlEmail(String to, String subject, String htmlContent);
}
