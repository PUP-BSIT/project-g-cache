package com.pomodify.backend.infrastructure.adapter.ai;

import org.junit.jupiter.api.*;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

/**
 * Unit test for model rotation logic - NO API calls, NO credits used.
 * Tests the canMakeRequest() rotation mechanism in isolation.
 */
@DisplayName("GemmaAiAdapter Rotation Logic (No API)")
@ExtendWith(GemmaAiAdapterRotationUnitTest.SummaryExtension.class)
class GemmaAiAdapterRotationUnitTest {

    private GemmaAiAdapter adapter;
    private static int passedTests = 0;
    private static int totalTests = 0;

    @BeforeEach
    void setUp() {
        adapter = new GemmaAiAdapter();
    }

    @Test
    @DisplayName("Should accept requests up to MAX_RPM_PER_MODEL (28)")
    void shouldAcceptRequestsUpToLimit() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        
        // First 28 requests should succeed for first model
        for (int i = 0; i < 28; i++) {
            boolean result = (boolean) canMakeRequest.invoke(adapter, "gemma-3-27b-it");
            assertThat(result).as("Request %d should be accepted", i + 1).isTrue();
        }
        
        // 29th request should be rejected (rate limited)
        boolean result = (boolean) canMakeRequest.invoke(adapter, "gemma-3-27b-it");
        assertThat(result).as("Request 29 should be rate limited").isFalse();
    }

    @Test
    @DisplayName("Should rotate to next model when first is exhausted")
    void shouldRotateToNextModel() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        
        // Exhaust first model (28 requests)
        for (int i = 0; i < 28; i++) {
            canMakeRequest.invoke(adapter, "gemma-3-27b-it");
        }
        
        // First model should now reject
        assertThat((boolean) canMakeRequest.invoke(adapter, "gemma-3-27b-it")).isFalse();
        
        // Second model should still accept
        assertThat((boolean) canMakeRequest.invoke(adapter, "gemma-3-12b-it")).isTrue();
    }

    @Test
    @DisplayName("Should handle all 4 models rotation (112 total capacity)")
    void shouldHandleFullRotation() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        String[] models = {"gemma-3-27b-it", "gemma-3-12b-it", "gemma-3-4b-it", "gemma-3-1b-it"};
        
        int totalAccepted = 0;
        
        // Try 120 requests across all models
        for (int i = 0; i < 120; i++) {
            for (String model : models) {
                if ((boolean) canMakeRequest.invoke(adapter, model)) {
                    totalAccepted++;
                    break; // Move to next request
                }
            }
        }
        
        // Should accept exactly 112 (28 * 4 models)
        assertThat(totalAccepted).isEqualTo(112);
        
        System.out.println("✓ Total capacity verified: " + totalAccepted + " requests across 4 models");
    }

    @Test
    @DisplayName("Should reset counter after 60 seconds")
    void shouldResetCounterAfterOneMinute() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        
        // Exhaust first model
        for (int i = 0; i < 28; i++) {
            canMakeRequest.invoke(adapter, "gemma-3-27b-it");
        }
        assertThat((boolean) canMakeRequest.invoke(adapter, "gemma-3-27b-it")).isFalse();
        
        // Simulate time passing (set reset time to 61 seconds ago)
        setModelResetTime("gemma-3-27b-it", System.currentTimeMillis() / 1000 - 61);
        
        // Should now accept again
        assertThat((boolean) canMakeRequest.invoke(adapter, "gemma-3-27b-it")).isTrue();
        
        System.out.println("✓ Counter reset after 60 seconds verified");
    }

    @Test
    @DisplayName("Should report correct model stats")
    void shouldReportModelStats() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        
        // Make some requests
        for (int i = 0; i < 10; i++) {
            canMakeRequest.invoke(adapter, "gemma-3-27b-it");
        }
        for (int i = 0; i < 5; i++) {
            canMakeRequest.invoke(adapter, "gemma-3-12b-it");
        }
        
        Map<String, Integer> stats = adapter.getModelStats();
        
        assertThat(stats.get("gemma-3-27b-it")).isEqualTo(10);
        assertThat(stats.get("gemma-3-12b-it")).isEqualTo(5);
        assertThat(stats.get("gemma-3-4b-it")).isEqualTo(0);
        assertThat(stats.get("gemma-3-1b-it")).isEqualTo(0);
        
        System.out.println("✓ Model stats: " + stats);
    }

    @Test
    @DisplayName("Should reset all counters")
    void shouldResetAllCounters() throws Exception {
        Method canMakeRequest = getCanMakeRequestMethod();
        
        // Make some requests
        for (int i = 0; i < 10; i++) {
            canMakeRequest.invoke(adapter, "gemma-3-27b-it");
        }
        
        assertThat(adapter.getModelStats().get("gemma-3-27b-it")).isEqualTo(10);
        
        // Reset all
        adapter.resetAllCounters();
        
        // All should be zero
        Map<String, Integer> stats = adapter.getModelStats();
        assertThat(stats.values()).allMatch(count -> count == 0);
        
        System.out.println("✓ All counters reset successfully");
    }

    // Helper methods to access private members via reflection
    private Method getCanMakeRequestMethod() throws Exception {
        Method method = GemmaAiAdapter.class.getDeclaredMethod("canMakeRequest", String.class);
        method.setAccessible(true);
        return method;
    }

    @SuppressWarnings("unchecked")
    private void setModelResetTime(String model, long epochSeconds) throws Exception {
        Field field = GemmaAiAdapter.class.getDeclaredField("modelResetTimes");
        field.setAccessible(true);
        Map<String, AtomicLong> resetTimes = (Map<String, AtomicLong>) field.get(adapter);
        resetTimes.get(model).set(epochSeconds);
    }

    // Test watcher to track results and print summary
    static class SummaryExtension implements TestWatcher {
        @Override
        public void testSuccessful(ExtensionContext context) {
            passedTests++;
            totalTests++;
        }

        @Override
        public void testFailed(ExtensionContext context, Throwable cause) {
            totalTests++;
        }
    }

    @AfterAll
    static void printSummary() {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("           AI MODEL ROTATION TEST SUMMARY");
        System.out.println("=".repeat(60));
        System.out.println("  Models:           gemma-3-27b-it, gemma-3-12b-it,");
        System.out.println("                    gemma-3-4b-it, gemma-3-1b-it");
        System.out.println("  RPM per model:    28 requests/minute");
        System.out.println("  Total capacity:   112 requests/minute (28 × 4)");
        System.out.println("  Counter reset:    Every 60 seconds");
        System.out.println("-".repeat(60));
        System.out.println("  Tests passed:     " + passedTests + "/" + totalTests);
        if (passedTests == totalTests) {
            System.out.println("  Status:           ✅ ALL TESTS PASSED");
            System.out.println("-".repeat(60));
            System.out.println("  ✓ Rotation logic verified - ready for production!");
        } else {
            System.out.println("  Status:           ❌ SOME TESTS FAILED");
        }
        System.out.println("=".repeat(60) + "\n");
    }
}
