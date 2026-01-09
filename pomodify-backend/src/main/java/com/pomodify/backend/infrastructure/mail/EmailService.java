package com.pomodify.backend.infrastructure.mail;

import com.pomodify.backend.application.port.EmailPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import lombok.extern.slf4j.Slf4j;

/**
 * Infrastructure adapter implementing EmailPort.
 * Handles actual email sending via JavaMailSender.
 */
@Service
@Slf4j
public class EmailService implements EmailPort {
    @Value("${app.site.base-url:https://pomodify.site}")
    private String baseUrl;
    @Value("${spring.mail.from:contact@pomodify.site}")
    private String fromAddress;
    private final JavaMailSender mailSender;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendSimpleEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    public void sendVerificationEmail(String toEmail, String token) {
        sendVerificationEmail(toEmail, token, null, false);
    }

    public void sendVerificationEmail(String toEmail, String token, String overrideBaseUrl) {
        sendVerificationEmail(toEmail, token, overrideBaseUrl, false);
    }

    @Override
    @Async
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
            // Fallback to simple email if HTML fails
            sendSimpleEmail(to, subject, htmlContent.replaceAll("<[^>]*>", ""));
        }
    }

    @Override
    public void sendVerificationEmail(String toEmail, String token, String overrideBaseUrl, boolean isResend) {
        String urlBase = (overrideBaseUrl != null && !overrideBaseUrl.isBlank()) ? overrideBaseUrl : baseUrl;
        String verificationUrl = urlBase + "/verify?token=" + token;
        
        String subject;
        String title;
        String message;
        String buttonText = "Verify Account Now";
        String footerMessage = "If you did not request this, you can safely ignore this email. This link is valid for 24 hours.";

        if (isResend) {
            subject = "Reactivate Your Pomodify Account";
            title = "Reactivate Your Account";
            message = "Your account was locked because you were not able to verify it within the prescribed time. Verify it to reactivate your account.";
        } else {
            subject = "Verify your Pomodify Account";
            title = "Welcome to Pomodify!";
            message = "Thank you for signing up. Please verify your email address to get started.";
        }

        String htmlContent = generateHtmlContent(title, message, buttonText, verificationUrl, footerMessage);
        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    public void sendVerifyAndResetEmail(String toEmail, String token) {
        String verificationUrl = baseUrl + "/verify-and-reset?token=" + token;
        String subject = "Action Required: Verify Account to Reset Password";
        String title = "Verify Account to Reset Password";
        String message = "You requested a password reset, but your account is not verified. Please verify your account to proceed with the password reset.";
        String buttonText = "Verify & Reset Password";
        String footerMessage = "If you did not request this, please ignore this email.";

        String htmlContent = generateHtmlContent(title, message, buttonText, verificationUrl, footerMessage);
        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String token, String overrideBaseUrl) {
        String urlBase = (overrideBaseUrl != null && !overrideBaseUrl.isBlank()) ? overrideBaseUrl : baseUrl;
        // Ensure we don't double slash if baseUrl ends with /
        if (urlBase.endsWith("/")) {
            urlBase = urlBase.substring(0, urlBase.length() - 1);
        }
        
        String resetUrl = urlBase + "/reset-password?token=" + token;
        String subject = "Reset your Pomodify Password";
        String title = "Reset Your Password";
        String message = "You have requested to reset your password. Click the button below to reset it.";
        String buttonText = "Reset Password";
        String footerMessage = "This link will expire in 15 minutes. If you did not request this, please ignore this email.";

        String htmlContent = generateHtmlContent(title, message, buttonText, resetUrl, footerMessage);
        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail) {
        String resetUrl = baseUrl + "/reset-password";
        String subject = "Reset your Password";
        String title = "Reset Your Password";
        String message = "Click the button below to reset your password.";
        String buttonText = "Reset Password";
        String footerMessage = "If you did not request this, please ignore this email.";

        String htmlContent = generateHtmlContent(title, message, buttonText, resetUrl, footerMessage);
        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    public void sendContactEmail(String senderName, String senderEmail, String reason, String messageContent) {
        String toEmail = "contact@pomodify.site";
        String subject = String.format("[Pomodify Contact] %s - %s", reason, senderName);
        
        log.info("Preparing contact email - From: {}, To: {}, Subject: {}", senderEmail, toEmail, subject);
        log.info("Using SMTP from address: {}", fromAddress);
        
        String htmlContent = generateContactHtmlContent(senderName, senderEmail, reason, messageContent);
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setReplyTo(senderEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            log.info("Sending contact email via SMTP...");
            mailSender.send(message);
            log.info("Contact email sent successfully from {} to {}", senderEmail, toEmail);
        } catch (MessagingException e) {
            log.error("MessagingException sending contact email from {}: {} - Full stack:", senderEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send contact email: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error sending contact email from {}: {} - Full stack:", senderEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send contact email: " + e.getMessage(), e);
        }
    }

    private String generateContactHtmlContent(String senderName, String senderEmail, String reason, String messageContent) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4da1a9;">New Contact Form Submission</h2>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p><strong>From:</strong> %s</p>
                        <p><strong>Email:</strong> <a href="mailto:%s">%s</a></p>
                        <p><strong>Reason:</strong> %s</p>
                    </div>
                    <h3 style="color: #24425A;">Message:</h3>
                    <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 4px;">
                        <p style="white-space: pre-wrap;">%s</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">This message was sent via the Pomodify Contact Form.</p>
                </div>
            </body>
            </html>
            """, senderName, senderEmail, senderEmail, reason, messageContent);
    }

    private String generateHtmlContent(String title, String message, String buttonText, String link, String footerMessage) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4da1a9;">%s</h2>
                    <p>%s</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background-color: #4da1a9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">%s</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">%s</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">Pomodify Team</p>
                </div>
            </body>
            </html>
            """, title, message, link, buttonText, footerMessage);
    }
}
