package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.ConfirmBlueprintCommand;
import com.pomodify.backend.application.command.GenerateBlueprintCommand;
import com.pomodify.backend.application.command.GenerateNextStepCommand;
import com.pomodify.backend.application.command.QuickFocusCommand;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.port.out.AiGenerationPort;
import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.application.result.BlueprintResult;
import com.pomodify.backend.application.result.ConfirmBlueprintResult;
import com.pomodify.backend.application.result.QuickFocusResult;
import com.pomodify.backend.domain.enums.SessionType;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.SessionNote;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.model.ai.AiActivityBlueprint;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.AsyncResult;


import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiService {
    private static final String QUICK_FOCUS_TITLE = "Quick Focus";
    private static final String QUICK_FOCUS_DESCRIPTION = "A quick focus session for immediate productivity";
    private static final int DEFAULT_FOCUS_MINUTES = 25;
    private static final int DEFAULT_BREAK_MINUTES = 5;
    private static final int DEFAULT_CYCLES = 4;
    private static final Logger logger = LoggerFactory.getLogger(AiService.class);

    // In-memory store for async results (for demo; use Redis or DB for production)
    private static final ConcurrentHashMap<String, BlueprintResult> blueprintResults = new ConcurrentHashMap<>();

    /**
     * Initiates async AI blueprint generation and returns a requestId immediately.
     */
    public String generateBlueprintAsync(GenerateBlueprintCommand command) {
        String requestId = UUID.randomUUID().toString();
        // Start async processing
        generateBlueprintAsyncInternal(command, requestId);
        return requestId;
    }

    @Async
    public Future<Void> generateBlueprintAsyncInternal(GenerateBlueprintCommand command, String requestId) {
        BlueprintResult result = generateBlueprint(command); // uses cache
        blueprintResults.put(requestId, result);
        return AsyncResult.forValue(null);
    }

    /**
     * Poll for blueprint result by requestId.
     */
    public BlueprintResult getBlueprintResult(String requestId) {
        return blueprintResults.get(requestId);
    }

    private final PomodoroSessionRepository sessionRepository;
    private final ActivityRepository activityRepository;
    private final AiGenerationPort aiGenerationPort;
    private final UserHelper userHelper;
    private final DomainHelper domainHelper;

    /* -------------------- EXISTING: GENERATE NEXT STEP -------------------- */
    @Transactional
    public AiSuggestionResult generateNextStep(GenerateNextStepCommand command) {
        logger.info("[AiService] generateNextStep called - activityId={}, userId={}",
                command.getActivityId(), command.getUserId());

        Activity activity = activityRepository.findByIdAndUserId(command.getActivityId(), command.getUserId())
                .orElseThrow(() -> new RuntimeException("Activity not found or not owned by user"));
        logger.info("[AiService] Activity found: {}", activity.getTitle());

        List<String> pastNotes = sessionRepository.findRecentNotesByActivityId(command.getActivityId(), 3);
        logger.info("[AiService] Found {} past notes", pastNotes != null ? pastNotes.size() : 0);

        AiSuggestionResult result = aiGenerationPort.predictNextStep(
                activity.getTitle(),
                pastNotes,
                command.getCurrentTodos()
        );

        logger.info("[AiService] AI generation complete - result: {}", result.getSuggestedNote());
        return result;
    }

    /* -------------------- SMART-ACTION: GENERATE BLUEPRINT -------------------- */
    @org.springframework.cache.annotation.Cacheable(value = "aiBlueprints", key = "#command.topic()")
    public BlueprintResult generateBlueprint(GenerateBlueprintCommand command) {
        String topic = sanitizeTopic(command.topic());
        logger.info("[AiService] generateBlueprint for topic: {}", topic);

        try {
            AiActivityBlueprint blueprint = aiGenerationPort.generateBlueprint(topic);
            AiActivityBlueprint clamped = blueprint.withClampedValues();

            logger.info("[AiService] Blueprint generated: {}", clamped.activityTitle());
            return BlueprintResult.builder()
                    .activityTitle(clamped.activityTitle())
                    .activityDescription(clamped.activityDescription())
                    .focusMinutes(clamped.focusMinutes())
                    .breakMinutes(clamped.breakMinutes())
                    .firstSessionNote(clamped.firstSessionNote())
                    .isFallback(false)
                    .build();

        } catch (Exception e) {
            logger.warn("[AiService] AI generation failed, using fallback: {}", e.getMessage());
            AiActivityBlueprint fallback = AiActivityBlueprint.createFallback(topic);
            return BlueprintResult.builder()
                    .activityTitle(fallback.activityTitle())
                    .activityDescription(fallback.activityDescription())
                    .focusMinutes(fallback.focusMinutes())
                    .breakMinutes(fallback.breakMinutes())
                    .firstSessionNote(fallback.firstSessionNote())
                    .isFallback(true)
                    .build();
        }
    }

    /* -------------------- SMART-ACTION: CONFIRM BLUEPRINT -------------------- */
    @Transactional
    @CacheEvict(value = "activities", allEntries = true)
    public ConfirmBlueprintResult confirmBlueprint(ConfirmBlueprintCommand command) {
        logger.info("[AiService] confirmBlueprint for user: {}", command.userId());

        int focusMinutes = clamp(command.focusMinutes(), 5, 120);
        int breakMinutes = clamp(command.breakMinutes(), 2, 30);

        User user = userHelper.getUserOrThrow(command.userId());

        Category category = command.categoryId() != null
                ? domainHelper.getCategoryOrNull(command.categoryId(), command.userId())
                : null;

        Activity activity = user.createActivity(
                command.activityTitle().trim(),
                command.activityDescription() != null ? command.activityDescription().trim() : null,
                category
        );
        Activity savedActivity = activityRepository.save(activity);
        logger.info("[AiService] Activity created with ID: {}", savedActivity.getId());

        PomodoroSession session = savedActivity.createSession(
                SessionType.CLASSIC,
                Duration.ofMinutes(focusMinutes),
                Duration.ofMinutes(breakMinutes),
                DEFAULT_CYCLES,
                null,
                null,
                null
        );
        PomodoroSession savedSession = sessionRepository.save(session);
        logger.info("[AiService] Session created with ID: {}", savedSession.getId());

        if (command.firstSessionNote() != null && !command.firstSessionNote().isBlank()) {
            SessionNote note = SessionNote.builder()
                    .session(savedSession)
                    .content(command.firstSessionNote().trim())
                    .build();
            savedSession.setNote(note);
            sessionRepository.save(savedSession);
            logger.info("[AiService] Session note added");
        }

        return ConfirmBlueprintResult.builder()
                .activityId(savedActivity.getId())
                .sessionId(savedSession.getId())
                .build();
    }

    /* -------------------- SMART-ACTION: QUICK FOCUS -------------------- */
    @Transactional
    @CacheEvict(value = "activities", allEntries = true)
    public QuickFocusResult quickFocus(QuickFocusCommand command) {
        logger.info("[AiService] quickFocus for user: {}", command.userId());

        User user = userHelper.getUserOrThrow(command.userId());
        Activity activity = findOrCreateQuickFocusActivity(user);

        PomodoroSession session = activity.createSession(
                SessionType.CLASSIC,
                Duration.ofMinutes(DEFAULT_FOCUS_MINUTES),
                Duration.ofMinutes(DEFAULT_BREAK_MINUTES),
                DEFAULT_CYCLES,
                null,
                null,
                null
        );

        PomodoroSession savedSession = sessionRepository.save(session);
        logger.info("[AiService] Quick focus session created: activityId={}, sessionId={}",
                activity.getId(), savedSession.getId());

        return QuickFocusResult.builder()
                .activityId(activity.getId())
                .sessionId(savedSession.getId())
                .build();
    }

    /* -------------------- HELPERS -------------------- */
    private String sanitizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return "General";
        }
        String trimmed = topic.trim();
        return trimmed.length() > 50 ? trimmed.substring(0, 50) : trimmed;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }

    private Activity findOrCreateQuickFocusActivity(User user) {
        var existingActivities = activityRepository.findAllDynamic(
                user.getId(), false, null,
                PageRequest.of(0, 100)
        );

        for (Activity activity : existingActivities) {
            if (QUICK_FOCUS_TITLE.equals(activity.getTitle())) {
                logger.info("[AiService] Reusing existing Quick Focus activity: {}", activity.getId());
                return activity;
            }
        }

        Activity newActivity = user.createActivity(QUICK_FOCUS_TITLE, QUICK_FOCUS_DESCRIPTION, null);
        Activity savedActivity = activityRepository.save(newActivity);
        logger.info("[AiService] Created new Quick Focus activity: {}", savedActivity.getId());

        return savedActivity;
    }
}
