package com.pomodify.backend.infrastructure.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${fcm.service-account:}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() {
        try {
            if (FirebaseApp.getApps() != null && !FirebaseApp.getApps().isEmpty()) {
                log.info("FirebaseApp already initialized");
                return;
            }
            if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
                log.warn("FCM service account path is not set. Push notifications will be disabled.");
                return;
            }
            try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("FirebaseApp initialized with service account at {}", serviceAccountPath);
            }
        } catch (IOException e) {
            log.error("Failed to initialize Firebase: {}", e.getMessage());
            // Don't re-throw - allow app to start without Firebase if credentials are invalid
            log.warn("Push notifications will be disabled due to Firebase initialization error.");
        }
    }
}
