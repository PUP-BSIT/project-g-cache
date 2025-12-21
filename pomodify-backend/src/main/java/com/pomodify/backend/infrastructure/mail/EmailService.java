package com.pomodify.backend.infrastructure.mail;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class EmailService {
    @Value("${app.site.base-url:https://pomodify.site}")
    private String baseUrl;
    @Value("${spring.mail.from:contact@pomodify.site}")
    private String fromAddress;
    private final JavaMailSender mailSender;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSimpleEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    public void sendVerificationEmail(String toEmail, String token) {
        sendVerificationEmail(toEmail, token, null);
    }

    public void sendVerificationEmail(String toEmail, String token, String overrideBaseUrl) {
        String urlBase = (overrideBaseUrl != null && !overrideBaseUrl.isBlank()) ? overrideBaseUrl : baseUrl;
        String verificationUrl = urlBase + "/verify?token=" + token;
        String subject = "Verify your Pomodify Account";
        String content = "Click here to verify: " + verificationUrl +
                         "\nLink expires in 24 hours.";
        sendSimpleEmail(toEmail, subject, content);
    }

    public void sendVerifyAndResetEmail(String toEmail, String token) {
        String verificationUrl = baseUrl + "/verify-and-reset?token=" + token;
        String subject = "Action Required: Verify Account to Reset Password";
        String content = "You requested a password reset, but your account is not verified. " +
                         "Click here to verify your account and reset your password: " + verificationUrl;
        sendSimpleEmail(toEmail, subject, content);
    }

    public void sendPasswordResetEmail(String toEmail) {
        String subject = "Reset your Password";
        String content = "Click here to reset your password: " + baseUrl + "/reset-password";
        sendSimpleEmail(toEmail, subject, content);
    }
}
