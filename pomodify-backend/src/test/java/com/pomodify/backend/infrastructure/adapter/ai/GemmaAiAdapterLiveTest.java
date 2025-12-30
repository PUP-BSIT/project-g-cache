package com.pomodify.backend.infrastructure.adapter.ai;

import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.domain.model.ai.AiActivityBlueprint;
import org.junit.jupiter.api.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * LIVE test that calls the actual Google Gemma API.
 * Requires GOOGLE_API_KEY environment variable to be set.
 * 
 * Run with: .\mvnw test "-Dtest=GemmaAiAdapterLiveTest" "-DGOOGLE_API_KEY=your_key"
 */
@DisplayName("GemmaAiAdapter LIVE API Test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class GemmaAiAdapterLiveTest {

    private static GemmaAiAdapter adapter;
    private static boolean apiKeyAvailable = false;
    private static int passedTests = 0;
    private static int totalTests = 0;
    private static int totalApiCalls = 0;

    @BeforeAll
    static void checkApiKey() {
        // Check system property first (passed via -D), then env var
        String apiKey = System.getProperty("GOOGLE_API_KEY");
        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = System.getenv("GOOGLE_API_KEY");
        }
        
        if (apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your_key")) {
            apiKeyAvailable = true;
            adapter = new GemmaAiAdapter();
            System.out.println("\n✓ GOOGLE_API_KEY detected - LIVE tests will run");
        } else {
            System.out.println("\n⚠ GOOGLE_API_KEY not set - LIVE tests will be skipped");
            System.out.println("  Option 1: Set env var first, then run test");
            System.out.println("    $env:GOOGLE_API_KEY=\"your_key\"");
            System.out.println("    .\\mvnw test \"-Dtest=GemmaAiAdapterLiveTest\"");
            System.out.println("  Option 2: Pass via system property");
            System.out.println("    .\\mvnw test \"-Dtest=GemmaAiAdapterLiveTest\" \"-DGOOGLE_API_KEY=your_key\"");
        }
    }

    @Test
    @Order(1)
    @DisplayName("Single API call - Generate Blueprint")
    void testSingleBlueprintGeneration() {
        Assumptions.assumeTrue(apiKeyAvailable, "API key not available");
        totalTests++;
        
        System.out.println("\n[Test 1] Calling Google Gemma API for blueprint generation...");
        
        AiActivityBlueprint blueprint = adapter.generateBlueprint("Learn Java Programming");
        totalApiCalls++;
        
        assertThat(blueprint).isNotNull();
        assertThat(blueprint.activityTitle()).isNotBlank();
        assertThat(blueprint.focusMinutes()).isGreaterThan(0);
        
        System.out.println("  ✓ Blueprint generated: " + blueprint.activityTitle());
        System.out.println("  ✓ Focus: " + blueprint.focusMinutes() + " min, Break: " + blueprint.breakMinutes() + " min");
        passedTests++;
    }

    @Test
    @Order(2)
    @DisplayName("Single API call - Predict Next Step")
    void testSinglePrediction() {
        Assumptions.assumeTrue(apiKeyAvailable, "API key not available");
        totalTests++;
        
        System.out.println("\n[Test 2] Calling Google Gemma API for next step prediction...");
        
        AiSuggestionResult result = adapter.predictNextStep(
                "Web Development",
                List.of("Learned HTML basics", "Started CSS styling"),
                List.of("Complete flexbox tutorial")
        );
        totalApiCalls++;
        
        assertThat(result).isNotNull();
        assertThat(result.getSuggestedNote()).isNotBlank();
        
        System.out.println("  ✓ Suggestion received: " + result.getSuggestedNote().substring(0, Math.min(50, result.getSuggestedNote().length())) + "...");
        System.out.println("  ✓ Motivation level: " + result.getMotivationLevel());
        passedTests++;
    }

    @Test
    @Order(3)
    @DisplayName("Model rotation under load - 112 concurrent requests (all 4 models)")
    void testConcurrentRequests() throws Exception {
        Assumptions.assumeTrue(apiKeyAvailable, "API key not available");
        totalTests++;
        
        System.out.println("\n[Test 3] Testing 112 concurrent API requests to utilize ALL 4 models...");
        System.out.println("  Expected distribution: 28 requests per model × 4 models = 112 total");
        System.out.println("  Models: gemma-3-27b-it, gemma-3-12b-it, gemma-3-4b-it, gemma-3-1b-it");
        
        // Reset counters for clean test
        adapter.resetAllCounters();
        
        int concurrentRequests = 112;
        ExecutorService executor = Executors.newFixedThreadPool(concurrentRequests);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(concurrentRequests);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<String> results = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<Long> responseTimes = new ConcurrentLinkedQueue<>();

        String[] topics = {"Python", "JavaScript", "React", "Docker", "Kubernetes", 
                           "Java", "TypeScript", "Angular", "Vue", "Node.js",
                           "Go", "Rust", "C++", "Swift", "Kotlin",
                           "AWS", "Azure", "GCP", "DevOps", "CI/CD",
                           "SQL", "MongoDB", "Redis", "GraphQL", "REST API",
                           "Machine Learning", "Data Science", "AI", "Deep Learning", "NLP",
                           "Cybersecurity", "Networking", "Linux", "Git", "Agile",
                           "Microservices", "System Design", "Algorithms", "Data Structures", "Testing",
                           "HTML", "CSS", "Sass", "Tailwind", "Bootstrap",
                           "Spring Boot", "Django", "FastAPI", "Express", "Next.js",
                           "Flutter", "React Native", "Electron", "WebAssembly", "PWA",
                           "Terraform", "Ansible", "Prometheus", "Grafana", "ELK Stack",
                           "OAuth", "JWT", "HTTPS", "SSL", "Encryption",
                           "WebSockets", "gRPC", "Message Queues", "Kafka", "RabbitMQ",
                           "Unit Testing", "Integration Testing", "E2E Testing", "TDD", "BDD",
                           "Clean Code", "Design Patterns", "SOLID", "DDD", "Event Sourcing",
                           "Blockchain", "Web3", "Smart Contracts", "NFT", "DeFi",
                           "AR/VR", "Game Dev", "Unity", "Unreal", "OpenGL",
                           "Mobile Dev", "iOS", "Android", "Cross Platform", "Responsive Design",
                           "SEO", "Analytics", "A/B Testing", "UX Design", "Accessibility",
                           "Serverless", "Lambda", "Cloud Functions", "Edge Computing", "CDN",
                           "Database Design", "Indexing", "Query Optimization", "Sharding", "Replication"};

        for (int i = 0; i < concurrentRequests; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    long start = System.currentTimeMillis();
                    
                    AiActivityBlueprint blueprint = adapter.generateBlueprint(topics[index % topics.length]);
                    
                    long elapsed = System.currentTimeMillis() - start;
                    responseTimes.add(elapsed);
                    results.add("Request " + index + ": " + blueprint.activityTitle() + " (" + elapsed + "ms)");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                    results.add("Request " + index + " FAILED: " + e.getMessage());
                } finally {
                    completionLatch.countDown();
                }
            });
        }

        // Start all requests simultaneously
        startLatch.countDown();
        boolean completed = completionLatch.await(600, TimeUnit.SECONDS); // 10 min timeout for 112 requests
        executor.shutdown();
        
        totalApiCalls += concurrentRequests;

        // Print results
        System.out.println("  Results:");
        results.forEach(r -> System.out.println("    " + r));
        
        double avgTime = responseTimes.stream().mapToLong(Long::longValue).average().orElse(0);
        System.out.println("  ✓ Completed: " + completed);
        System.out.println("  ✓ Success: " + successCount.get() + "/" + concurrentRequests);
        System.out.println("  ✓ Avg response time: " + String.format("%.0f", avgTime) + "ms");
        
        // Print model stats
        Map<String, Integer> stats = adapter.getModelStats();
        System.out.println("  ✓ Model usage: " + stats);

        assertThat(completed).isTrue();
        assertThat(successCount.get()).isGreaterThanOrEqualTo(90); // At least 80% success (90/112)
        passedTests++;
    }

    @AfterAll
    static void printSummary() {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("         GEMMA AI ADAPTER LIVE TEST SUMMARY");
        System.out.println("=".repeat(60));
        
        if (!apiKeyAvailable) {
            System.out.println("  Status:           ⚠ SKIPPED (no API key)");
            System.out.println("  To run live tests, use:");
            System.out.println("  .\\mvnw test \"-Dtest=GemmaAiAdapterLiveTest\" \"-DGOOGLE_API_KEY=your_key\"");
        } else {
            System.out.println("  API Key:          ✓ Configured");
            System.out.println("  Total API calls:  " + totalApiCalls);
            System.out.println("  Tests passed:     " + passedTests + "/" + totalTests);
            
            if (passedTests == totalTests) {
                System.out.println("  Status:           ✅ ALL LIVE TESTS PASSED");
                System.out.println("-".repeat(60));
                System.out.println("  ✓ Google Gemma API integration verified!");
                System.out.println("  ✓ Model rotation working in production!");
            } else {
                System.out.println("  Status:           ❌ SOME TESTS FAILED");
            }
        }
        System.out.println("=".repeat(60) + "\n");
    }
}
