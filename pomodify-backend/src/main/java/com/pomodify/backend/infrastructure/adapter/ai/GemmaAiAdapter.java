package com.pomodify.backend.infrastructure.adapter.ai;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import com.pomodify.backend.application.port.out.AiGenerationPort;
import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.domain.model.ai.AiActivityBlueprint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@ConditionalOnProperty(name = "ai.enabled", havingValue = "true", matchIfMissing = false)
public class GemmaAiAdapter implements AiGenerationPort {
    private static final Logger logger = LoggerFactory.getLogger(GemmaAiAdapter.class);
    private static final String[] MODELS = {"gemma-3-27b-it", "gemma-3-12b-it", "gemma-3-4b-it", "gemma-3-1b-it"};
    private static final int MAX_RPM_PER_MODEL = 28; // Spec says 28 RPM
    private final Map<String, AtomicInteger> modelRequestCounts = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> modelResetTimes = new ConcurrentHashMap<>();
    private Client client;

    public GemmaAiAdapter() {
        for (String model : MODELS) {
            modelRequestCounts.put(model, new AtomicInteger(0));
            modelResetTimes.put(model, new AtomicLong(Instant.now().getEpochSecond()));
        }
    }

    private synchronized Client getClient() {
        if (client == null) {
            // Check system property first (for tests), then environment variable
            String apiKey = System.getProperty("GOOGLE_API_KEY");
            if (apiKey == null || apiKey.isEmpty()) {
                apiKey = System.getenv("GOOGLE_API_KEY");
            }
            if (apiKey == null || apiKey.isEmpty()) {
                throw new RuntimeException("GOOGLE_API_KEY not set. Set via -DGOOGLE_API_KEY=key or environment variable.");
            }
            // Set as env var for the Google client library
            logger.info("Initializing Google GenAI Client");
            client = new Client();
        }
        return client;
    }

    @Override
    public AiSuggestionResult predictNextStep(String activityTitle, List<String> pastNotes, List<String> currentTodos) {
        logger.info("[GemmaAiAdapter] predictNextStep for: {}", activityTitle);
        String prompt = buildPrompt(activityTitle, pastNotes, currentTodos);
        for (String model : MODELS) {
            if (canMakeRequest(model)) {
                try {
                    logger.info("[GemmaAiAdapter] Trying model: {}", model);
                    return callGeminiApi(model, prompt);
                } catch (Exception e) {
                    logger.warn("[GemmaAiAdapter] Model {} failed: {}", model, e.getMessage());
                }
            }
        }
        throw new RuntimeException("All AI models exhausted or rate limited.");
    }

    @Override
    public AiActivityBlueprint generateBlueprint(String topic) {
        logger.info("[GemmaAiAdapter] generateBlueprint for topic: {}", topic);
        String prompt = buildBlueprintPrompt(topic);
        
        for (String model : MODELS) {
            if (canMakeRequest(model)) {
                try {
                    logger.info("[GemmaAiAdapter] Trying model {} for blueprint", model);
                    return callGeminiApiForBlueprint(model, prompt);
                } catch (Exception e) {
                    logger.warn("[GemmaAiAdapter] Model {} failed for blueprint: {}", model, e.getMessage());
                }
            }
        }
        
        // All models exhausted - return fallback
        logger.warn("[GemmaAiAdapter] All models exhausted, returning fallback blueprint");
        return AiActivityBlueprint.createFallback(topic);
    }

    private AiActivityBlueprint callGeminiApiForBlueprint(String model, String prompt) {
        Client c = getClient();
        GenerateContentResponse response = c.models.generateContent(model, prompt, null);
        String rawOutput = response.text();
        logger.info("[GemmaAiAdapter] Blueprint response from {}: {}", model, rawOutput);
        return parseBlueprintResponse(rawOutput);
    }

    private String buildBlueprintPrompt(String topic) {
        return """
            You are a productivity expert.
            Task: Create a study plan blueprint for the topic: '%s'.
            Return a RAW JSON object with:
            1. "activityTitle": Catchy name (e.g. 'Python Mastery').
            2. "activityDescription": Short goal summary.
            3. "focusMinutes": Integer (25 or 50) based on complexity.
            4. "breakMinutes": Integer (5 or 10).
            5. "firstSessionNote": A concrete first action starting with "Next:".
            Constraint: JSON only. No markdown.
            """.formatted(topic);
    }

    private AiActivityBlueprint parseBlueprintResponse(String rawOutput) {
        if (rawOutput == null || rawOutput.trim().isEmpty()) {
            throw new RuntimeException("Empty response from Gemini API");
        }
        
        // Strip markdown code blocks
        String cleaned = rawOutput
                .replaceAll("(?i)^\\s*```json", "")
                .replaceAll("^\\s*```", "")
                .replaceAll("```\\s*$", "")
                .trim();

        // Parse JSON fields using regex
        String activityTitle = extractJsonString(cleaned, "activityTitle");
        String activityDescription = extractJsonString(cleaned, "activityDescription");
        int focusMinutes = extractJsonInt(cleaned, "focusMinutes", 25);
        int breakMinutes = extractJsonInt(cleaned, "breakMinutes", 5);
        String firstSessionNote = extractJsonString(cleaned, "firstSessionNote");

        // Validate required fields
        if (activityTitle == null || activityTitle.isBlank()) {
            throw new RuntimeException("Missing activityTitle in AI response");
        }

        return new AiActivityBlueprint(
                activityTitle,
                activityDescription != null ? activityDescription : "",
                focusMinutes,
                breakMinutes,
                firstSessionNote != null ? firstSessionNote : "Next: Get started"
        );
    }

    private String extractJsonString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).replace("\\n", "\n") : null;
    }

    private int extractJsonInt(String json, String key, int defaultValue) {
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private AiSuggestionResult callGeminiApi(String model, String prompt) {
        Client c = getClient();
        GenerateContentResponse response = c.models.generateContent(model, prompt, null);
        String rawOutput = response.text();
        logger.info("[GemmaAiAdapter] Response from {}: {}", model, rawOutput);
        return parseGeminiResponse(rawOutput);
    }

    private synchronized boolean canMakeRequest(String model) {
        long now = Instant.now().getEpochSecond();
        AtomicLong resetTime = modelResetTimes.get(model);
        AtomicInteger requestCount = modelRequestCounts.get(model);
        if (now - resetTime.get() >= 60) {
            logger.info("[Rotation] Model {} counter reset (was {}/{})", model, requestCount.get(), MAX_RPM_PER_MODEL);
            requestCount.set(0);
            resetTime.set(now);
        }
        if (requestCount.get() < MAX_RPM_PER_MODEL) {
            int count = requestCount.incrementAndGet();
            logger.info("[Rotation] Model {} accepted request ({}/{})", model, count, MAX_RPM_PER_MODEL);
            return true;
        }
        logger.info("[Rotation] Model {} rate limited ({}/{}), rotating to next model", model, requestCount.get(), MAX_RPM_PER_MODEL);
        return false;
    }

    /**
     * Returns current request counts for all models (for testing/debugging).
     */
    public Map<String, Integer> getModelStats() {
        Map<String, Integer> stats = new ConcurrentHashMap<>();
        for (String model : MODELS) {
            stats.put(model, modelRequestCounts.get(model).get());
        }
        return stats;
    }

    /**
     * Resets all model counters (for testing).
     */
    public synchronized void resetAllCounters() {
        long now = Instant.now().getEpochSecond();
        for (String model : MODELS) {
            modelRequestCounts.get(model).set(0);
            modelResetTimes.get(model).set(now);
        }
        logger.info("[Rotation] All model counters reset");
    }

    private String buildPrompt(String activityTitle, List<String> pastNotes, List<String> currentTodos) {
        StringBuilder notes = new StringBuilder();
        if (pastNotes != null) {
            for (int i = 0; i < pastNotes.size(); i++) {
                String note = pastNotes.get(i);
                if (note != null && !note.trim().isEmpty()) {
                    notes.append("- Session ").append(i + 1).append(": ").append(note.trim()).append("\n");
                }
            }
        }
        String notesText = notes.length() > 0 ? notes.toString() : "No previous notes.";
        StringBuilder todos = new StringBuilder();
        if (currentTodos != null && !currentTodos.isEmpty()) {
            todos.append("\n\nCurrent Todos (DO NOT repeat these):\n");
            for (String todo : currentTodos) {
                if (todo != null && !todo.trim().isEmpty()) {
                    todos.append("- ").append(todo.trim()).append("\n");
                }
            }
        }
        return "You are a productivity assistant for '" + activityTitle + "'. " +
               "Generate 3 NEW actionable todo items. Do NOT repeat current todos. " +
               "Return RAW JSON: {\"suggested_note\": \"item1\\nitem2\\nitem3\", \"motivation_level\": \"Med\"}\n\n" +
               "Previous Notes:\n" + notesText + todos.toString();
    }

    private AiSuggestionResult parseGeminiResponse(String rawOutput) {
        if (rawOutput == null || rawOutput.trim().isEmpty()) {
            throw new RuntimeException("Empty response from Gemini API");
        }
        String cleaned = rawOutput.replaceAll("(?i)^\\s*```json", "").replaceAll("^\\s*```", "").replaceAll("```\\s*$", "").trim();
        Pattern notePattern = Pattern.compile("\"suggested_note\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Pattern levelPattern = Pattern.compile("\"motivation_level\"\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Matcher noteMatcher = notePattern.matcher(cleaned);
        Matcher levelMatcher = levelPattern.matcher(cleaned);
        String suggestedNote = noteMatcher.find() ? noteMatcher.group(1).replace("\\n", "\n") : cleaned;
        String motivationLevel = levelMatcher.find() ? levelMatcher.group(1) : "Med";
        return new AiSuggestionResult(suggestedNote, motivationLevel, false);
    }
}
