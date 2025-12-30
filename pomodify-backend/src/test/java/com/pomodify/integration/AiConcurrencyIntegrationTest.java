package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.PomodifyApiApplication;
import com.pomodify.backend.application.service.JwtService;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Concurrency/Load test for AI endpoints.
 * Tests that the system can handle 50 concurrent users making AI requests.
 */
@SpringBootTest(classes = PomodifyApiApplication.class)
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class AiConcurrencyIntegrationTest extends IntegrationTestBase {

    private static final int CONCURRENT_USERS = 50;
    private static final int TIMEOUT_SECONDS = 60;

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
    private String testRunId;

    @BeforeEach
    void setUp(TestInfo testInfo) {
        testRunId = UUID.randomUUID().toString().substring(0, 8);
        userTokens = new ArrayList<>();
        
        // Create 50 test users with JWT tokens using builder
        // Use unique emails per test run to avoid conflicts
        for (int i = 0; i < CONCURRENT_USERS; i++) {
            User user = User.builder()
                    .firstName("User" + i)
                    .lastName("Test")
                    .email(new Email("ai_" + testRunId + "_" + i + "@test.com"))
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .isEmailVerified(true)
                    .isActive(true)
                    .build();
            User savedUser = userRepository.save(user);
            String token = jwtService.generateAccessToken(savedUser);
            userTokens.add(token);
        }
    }

    @Test
    @DisplayName("50 concurrent users can request AI blueprint generation")
    void testConcurrentBlueprintGeneration() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(CONCURRENT_USERS);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Long> responseTimes = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        String[] topics = {
            "Java Programming", "Python Basics", "Web Development",
            "Machine Learning", "Data Science", "Mobile Apps",
            "Cloud Computing", "DevOps", "Cybersecurity", "Algorithms"
        };

        // Submit tasks for all concurrent users
        for (int i = 0; i < CONCURRENT_USERS; i++) {
            final int userIndex = i;
            final String topic = topics[i % topics.length];
            
            executor.submit(() -> {
                try {
                    // Wait for all threads to be ready
                    startLatch.await();
                    
                    long startTime = System.currentTimeMillis();
                    
                    String requestBody = objectMapper.writeValueAsString(
                            Map.of("topic", topic + " " + userIndex)
                    );

                    MvcResult result = mockMvc.perform(post("/ai/generate-preview")
                                    .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(requestBody))
                            .andReturn();

                    long responseTime = System.currentTimeMillis() - startTime;
                    responseTimes.add(responseTime);

                    int statusCode = result.getResponse().getStatus();
                    if (statusCode == 200) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                        errors.add("User " + userIndex + ": HTTP " + statusCode + 
                                " - " + result.getResponse().getContentAsString());
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                    errors.add("User " + userIndex + ": " + e.getMessage());
                } finally {
                    completionLatch.countDown();
                }
            });
        }

        // Start all threads simultaneously
        startLatch.countDown();
        
        // Wait for all requests to complete
        boolean completed = completionLatch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdown();

        // Calculate statistics
        List<Long> times = new ArrayList<>(responseTimes);
        double avgResponseTime = times.stream().mapToLong(Long::longValue).average().orElse(0);
        long maxResponseTime = times.stream().mapToLong(Long::longValue).max().orElse(0);
        long minResponseTime = times.stream().mapToLong(Long::longValue).min().orElse(0);

        // Log results
        System.out.println("\n========== AI CONCURRENCY TEST RESULTS ==========");
        System.out.println("Concurrent Users: " + CONCURRENT_USERS);
        System.out.println("Completed in time: " + completed);
        System.out.println("Successful requests: " + successCount.get());
        System.out.println("Failed requests: " + failureCount.get());
        System.out.println("Success rate: " + (successCount.get() * 100.0 / CONCURRENT_USERS) + "%");
        System.out.println("Avg response time: " + String.format("%.2f", avgResponseTime) + " ms");
        System.out.println("Min response time: " + minResponseTime + " ms");
        System.out.println("Max response time: " + maxResponseTime + " ms");
        
        if (!errors.isEmpty()) {
            System.out.println("\nErrors:");
            errors.forEach(e -> System.out.println("  - " + e));
        }
        System.out.println("==================================================\n");

        // Assertions
        assertThat(completed).as("All requests should complete within timeout").isTrue();
        assertThat(successCount.get()).as("At least 90% of requests should succeed")
                .isGreaterThanOrEqualTo((int) (CONCURRENT_USERS * 0.9));
    }

    @Test
    @DisplayName("50 concurrent users can confirm AI blueprints (creates activities)")
    void testConcurrentBlueprintConfirmation() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(CONCURRENT_USERS);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Long> responseTimes = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        // Submit tasks for all concurrent users
        for (int i = 0; i < CONCURRENT_USERS; i++) {
            final int userIndex = i;
            
            executor.submit(() -> {
                try {
                    startLatch.await();
                    
                    long startTime = System.currentTimeMillis();
                    
                    String requestBody = objectMapper.writeValueAsString(Map.of(
                            "activityTitle", "Activity " + userIndex,
                            "activityDescription", "Description for user " + userIndex,
                            "focusMinutes", 25,
                            "breakMinutes", 5,
                            "firstSessionNote", "Start with task " + userIndex
                    ));

                    MvcResult result = mockMvc.perform(post("/ai/confirm-plan")
                                    .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(requestBody))
                            .andReturn();

                    long responseTime = System.currentTimeMillis() - startTime;
                    responseTimes.add(responseTime);

                    int statusCode = result.getResponse().getStatus();
                    if (statusCode == 201) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                        errors.add("User " + userIndex + ": HTTP " + statusCode + 
                                " - " + result.getResponse().getContentAsString());
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                    errors.add("User " + userIndex + ": " + e.getMessage());
                } finally {
                    completionLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = completionLatch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdown();

        // Calculate statistics
        List<Long> times = new ArrayList<>(responseTimes);
        double avgResponseTime = times.stream().mapToLong(Long::longValue).average().orElse(0);
        long maxResponseTime = times.stream().mapToLong(Long::longValue).max().orElse(0);
        long minResponseTime = times.stream().mapToLong(Long::longValue).min().orElse(0);

        System.out.println("\n========== AI CONFIRM-PLAN CONCURRENCY TEST ==========");
        System.out.println("Concurrent Users: " + CONCURRENT_USERS);
        System.out.println("Completed in time: " + completed);
        System.out.println("Successful requests: " + successCount.get());
        System.out.println("Failed requests: " + failureCount.get());
        System.out.println("Success rate: " + (successCount.get() * 100.0 / CONCURRENT_USERS) + "%");
        System.out.println("Avg response time: " + String.format("%.2f", avgResponseTime) + " ms");
        System.out.println("Min response time: " + minResponseTime + " ms");
        System.out.println("Max response time: " + maxResponseTime + " ms");
        
        if (!errors.isEmpty()) {
            System.out.println("\nErrors:");
            errors.forEach(e -> System.out.println("  - " + e));
        }
        System.out.println("======================================================\n");

        assertThat(completed).as("All requests should complete within timeout").isTrue();
        assertThat(successCount.get()).as("At least 90% of requests should succeed")
                .isGreaterThanOrEqualTo((int) (CONCURRENT_USERS * 0.9));
    }

    @Test
    @DisplayName("50 concurrent users can start quick focus sessions")
    void testConcurrentQuickFocus() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(CONCURRENT_USERS);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Long> responseTimes = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < CONCURRENT_USERS; i++) {
            final int userIndex = i;
            
            executor.submit(() -> {
                try {
                    startLatch.await();
                    
                    long startTime = System.currentTimeMillis();

                    MvcResult result = mockMvc.perform(post("/ai/quick-focus")
                                    .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                    .contentType(MediaType.APPLICATION_JSON))
                            .andReturn();

                    long responseTime = System.currentTimeMillis() - startTime;
                    responseTimes.add(responseTime);

                    int statusCode = result.getResponse().getStatus();
                    if (statusCode == 201) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                        errors.add("User " + userIndex + ": HTTP " + statusCode + 
                                " - " + result.getResponse().getContentAsString());
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                    errors.add("User " + userIndex + ": " + e.getMessage());
                } finally {
                    completionLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = completionLatch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdown();

        List<Long> times = new ArrayList<>(responseTimes);
        double avgResponseTime = times.stream().mapToLong(Long::longValue).average().orElse(0);
        long maxResponseTime = times.stream().mapToLong(Long::longValue).max().orElse(0);
        long minResponseTime = times.stream().mapToLong(Long::longValue).min().orElse(0);

        System.out.println("\n========== QUICK FOCUS CONCURRENCY TEST ==========");
        System.out.println("Concurrent Users: " + CONCURRENT_USERS);
        System.out.println("Completed in time: " + completed);
        System.out.println("Successful requests: " + successCount.get());
        System.out.println("Failed requests: " + failureCount.get());
        System.out.println("Success rate: " + (successCount.get() * 100.0 / CONCURRENT_USERS) + "%");
        System.out.println("Avg response time: " + String.format("%.2f", avgResponseTime) + " ms");
        System.out.println("Min response time: " + minResponseTime + " ms");
        System.out.println("Max response time: " + maxResponseTime + " ms");
        
        if (!errors.isEmpty()) {
            System.out.println("\nErrors:");
            errors.forEach(e -> System.out.println("  - " + e));
        }
        System.out.println("===================================================\n");

        assertThat(completed).as("All requests should complete within timeout").isTrue();
        assertThat(successCount.get()).as("At least 90% of requests should succeed")
                .isGreaterThanOrEqualTo((int) (CONCURRENT_USERS * 0.9));
    }

    @Test
    @DisplayName("Mixed concurrent AI operations (blueprint + confirm + quick-focus)")
    void testMixedConcurrentAiOperations() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(CONCURRENT_USERS);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Long> responseTimes = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < CONCURRENT_USERS; i++) {
            final int userIndex = i;
            final int operationType = i % 3; // 0=blueprint, 1=confirm, 2=quick-focus
            
            executor.submit(() -> {
                try {
                    startLatch.await();
                    
                    long startTime = System.currentTimeMillis();
                    MvcResult result;

                    switch (operationType) {
                        case 0 -> {
                            // Generate blueprint
                            String requestBody = objectMapper.writeValueAsString(
                                    Map.of("topic", "Topic " + userIndex)
                            );
                            result = mockMvc.perform(post("/ai/generate-preview")
                                            .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(requestBody))
                                    .andReturn();
                        }
                        case 1 -> {
                            // Confirm plan
                            String requestBody = objectMapper.writeValueAsString(Map.of(
                                    "activityTitle", "Mixed Activity " + userIndex,
                                    "activityDescription", "Mixed test",
                                    "focusMinutes", 25,
                                    "breakMinutes", 5,
                                    "firstSessionNote", "Start"
                            ));
                            result = mockMvc.perform(post("/ai/confirm-plan")
                                            .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(requestBody))
                                    .andReturn();
                        }
                        default -> {
                            // Quick focus
                            result = mockMvc.perform(post("/ai/quick-focus")
                                            .header("Authorization", "Bearer " + userTokens.get(userIndex))
                                            .contentType(MediaType.APPLICATION_JSON))
                                    .andReturn();
                        }
                    }

                    long responseTime = System.currentTimeMillis() - startTime;
                    responseTimes.add(responseTime);

                    int statusCode = result.getResponse().getStatus();
                    if (statusCode == 200 || statusCode == 201) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                        errors.add("User " + userIndex + " (op=" + operationType + "): HTTP " + statusCode);
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                    errors.add("User " + userIndex + ": " + e.getMessage());
                } finally {
                    completionLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = completionLatch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdown();

        List<Long> times = new ArrayList<>(responseTimes);
        double avgResponseTime = times.stream().mapToLong(Long::longValue).average().orElse(0);
        long maxResponseTime = times.stream().mapToLong(Long::longValue).max().orElse(0);
        long minResponseTime = times.stream().mapToLong(Long::longValue).min().orElse(0);

        System.out.println("\n========== MIXED AI OPERATIONS CONCURRENCY TEST ==========");
        System.out.println("Concurrent Users: " + CONCURRENT_USERS);
        System.out.println("Operations: ~17 blueprint, ~17 confirm, ~16 quick-focus");
        System.out.println("Completed in time: " + completed);
        System.out.println("Successful requests: " + successCount.get());
        System.out.println("Failed requests: " + failureCount.get());
        System.out.println("Success rate: " + (successCount.get() * 100.0 / CONCURRENT_USERS) + "%");
        System.out.println("Avg response time: " + String.format("%.2f", avgResponseTime) + " ms");
        System.out.println("Min response time: " + minResponseTime + " ms");
        System.out.println("Max response time: " + maxResponseTime + " ms");
        
        if (!errors.isEmpty()) {
            System.out.println("\nErrors:");
            errors.forEach(e -> System.out.println("  - " + e));
        }
        System.out.println("==========================================================\n");

        assertThat(completed).as("All requests should complete within timeout").isTrue();
        assertThat(successCount.get()).as("At least 90% of requests should succeed")
                .isGreaterThanOrEqualTo((int) (CONCURRENT_USERS * 0.9));
    }
}
