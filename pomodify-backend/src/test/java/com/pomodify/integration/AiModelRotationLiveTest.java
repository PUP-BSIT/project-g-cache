package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.PomodifyApiApplication;
import com.pomodify.backend.application.service.JwtService;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.MethodOrderer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(classes = PomodifyApiApplication.class)
@AutoConfigureMockMvc
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AiModelRotationLiveTest {

    private static final int CONCURRENT_USERS = 10;
    private static final int TIMEOUT_SECONDS = 180;
    private static final String JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("pomodifydb_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("jwt.secret", () -> JWT_SECRET);
        registry.add("jwt.access-token-expiration", () -> "900000");
        registry.add("jwt.refresh-token-expiration", () -> "2592000000");
        registry.add("fcm.service-account", () -> "");
        registry.add("spring.mail.host", () -> "");
        registry.add("spring.mail.port", () -> "0");
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-id");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-secret");
        registry.add("ai.enabled", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private List<String> userTokens;

    @BeforeEach
    void setUp() {

        String runId = UUID.randomUUID().toString().substring(0, 8);
        userTokens = new ArrayList<>();
        
        for (int i = 0; i < CONCURRENT_USERS; i++) {
            User user = User.builder()
                    .firstName("User" + i)
                    .lastName("Test")
                    .email(new Email("live_" + runId + "_" + i + "@test.com"))
                    .passwordHash(passwordEncoder.encode("Pass123!"))
                    .isEmailVerified(true)
                    .isActive(true)
                    .build();
            userTokens.add(jwtService.generateAccessToken(userRepository.save(user)));
        }
    }

    @Test
    @Order(1)
    @DisplayName("LIVE: Model rotation test")
    void testModelRotation() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(CONCURRENT_USERS);
        
        AtomicInteger success = new AtomicInteger(0);
        AtomicInteger failed = new AtomicInteger(0);
        AtomicInteger rateLimited = new AtomicInteger(0);
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        String[] topics = {"Java", "Python", "React", "Docker", "AWS"};

        System.out.println("\n=== LIVE AI ROTATION TEST ===\n");

        for (int i = 0; i < CONCURRENT_USERS; i++) {
            int idx = i;
            executor.submit(() -> {
                try {
                    start.await();
                    Thread.sleep(idx * 100L);
                    
                    String body = objectMapper.writeValueAsString(Map.of("topic", topics[idx % 5]));
                    MvcResult res = mockMvc.perform(post("/ai/generate-preview")
                            .header("Authorization", "Bearer " + userTokens.get(idx))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body)).andReturn();

                    int code = res.getResponse().getStatus();
                    if (code == 200) {
                        success.incrementAndGet();
                        System.out.println("User" + idx + " OK");
                    } else if (code == 429) {
                        rateLimited.incrementAndGet();
                        System.out.println("User" + idx + " RATE LIMITED");
                    } else {
                        failed.incrementAndGet();
                        errors.add("User" + idx + ": " + code);
                    }
                } catch (Exception e) {
                    failed.incrementAndGet();
                    errors.add("User" + idx + ": " + e.getMessage());
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        boolean completed = done.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdown();

        System.out.println("\n=== RESULTS ===");
        System.out.println("Success: " + success.get());
        System.out.println("Rate Limited: " + rateLimited.get());
        System.out.println("Failed: " + failed.get());
        errors.forEach(e -> System.out.println("  " + e));

        assertThat(completed).isTrue();
        assertThat(success.get() + rateLimited.get()).isGreaterThanOrEqualTo(CONCURRENT_USERS / 2);
    }
}
