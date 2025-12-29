package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.ConfirmBlueprintCommand;
import com.pomodify.backend.application.command.GenerateBlueprintCommand;
import com.pomodify.backend.application.command.GenerateNextStepCommand;
import com.pomodify.backend.application.command.QuickFocusCommand;
import com.pomodify.backend.application.service.AiService;
import com.pomodify.backend.presentation.dto.item.BlueprintItem;
import com.pomodify.backend.presentation.dto.item.ConfirmBlueprintItem;
import com.pomodify.backend.presentation.dto.item.QuickFocusItem;
import com.pomodify.backend.presentation.dto.request.AiSuggestionRequest;
import com.pomodify.backend.presentation.dto.request.ConfirmBlueprintRequest;
import com.pomodify.backend.presentation.dto.request.GenerateBlueprintRequest;
import com.pomodify.backend.presentation.dto.response.AiSuggestionResponse;
import com.pomodify.backend.presentation.dto.response.BlueprintResponse;
import com.pomodify.backend.presentation.dto.response.ConfirmBlueprintResponse;
import com.pomodify.backend.presentation.dto.response.QuickFocusResponse;
import com.pomodify.backend.presentation.mapper.AiMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "AI-powered suggestions and Smart-Action System")
@Slf4j
public class AiController {

    private final AiService aiService;

    /* ==================================================================================
     * HELPER METHODS
     * ================================================================================== */

    private Long getUserId(Jwt jwt) {
        // Fallback for dev/testing if JWT is missing, ideally handle via Security Context
        if (jwt == null) return 1L; 
        
        Object claim = jwt.getClaim("user");
        if (claim instanceof Integer i) return i.longValue();
        if (claim instanceof Long l) return l;
        if (claim instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException ignored) {}
        }
        return 1L;
    }

    /* ==================================================================================
     * EXISTING: SUGGEST NEXT STEP
     * ================================================================================== */

    @PostMapping("/suggest")
    @Operation(summary = "Suggest next step for an activity")
    public ResponseEntity<AiSuggestionResponse> suggestNextStep(
            @RequestBody AiSuggestionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = getUserId(jwt);
        log.info("Generating AI suggestion for activityId={}, userId={}", request.getActivityId(), userId);

        var command = new GenerateNextStepCommand(userId, request.getActivityId(), request.getCurrentTodos());
        var result = aiService.generateNextStep(command);

        log.info("AI suggestion generated successfully");
        return ResponseEntity.ok(new AiSuggestionResponse(
                result.getSuggestedNote(),
                result.getMotivationLevel(),
                result.isFallback()
        ));
    }

    /* ==================================================================================
     * SMART-ACTION: SYNCHRONOUS PREVIEW (Standard)
     * ================================================================================== */

    @PostMapping("/generate-preview")
    @Operation(summary = "Generate AI activity blueprint preview (Synchronous)")
    public ResponseEntity<BlueprintResponse> generatePreview(
            @RequestBody @Valid GenerateBlueprintRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = getUserId(jwt);
        log.info("[Sync] Generating blueprint preview for topic='{}', userId={}", request.topic(), userId);

        var command = GenerateBlueprintCommand.builder()
                .topic(request.topic())
                .build();

        var result = aiService.generateBlueprint(command);
        BlueprintItem item = AiMapper.toBlueprintItem(result);

        String message = result.isFallback() 
                ? "Blueprint generated (fallback template)" 
                : "Blueprint generated successfully";

        return ResponseEntity.ok(AiMapper.toBlueprintResponse(item, message));
    }

    /* ==================================================================================
     * SMART-ACTION: ASYNCHRONOUS PREVIEW (Polling)
     * ================================================================================== */

    @PostMapping("/generate-preview-async")
    @Operation(summary = "Start async AI activity blueprint generation (Returns requestId)")
    public ResponseEntity<Map<String, String>> generatePreviewAsync(
            @RequestBody @Valid GenerateBlueprintRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = getUserId(jwt);
        log.info("[Async] Starting job for topic='{}', userId={}", request.topic(), userId);

        var command = GenerateBlueprintCommand.builder()
                .topic(request.topic())
                .build();

        // Service starts thread/completable future and returns a UUID string
        String requestId = aiService.generateBlueprintAsync(command);
        
        // Return 202 ACCEPTED to indicate processing has started
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Collections.singletonMap("requestId", requestId));
    }

    @GetMapping("/generate-preview-async/{requestId}")
    @Operation(summary = "Poll for async AI activity blueprint result by requestId")
    public ResponseEntity<BlueprintResponse> getPreviewAsyncResult(@PathVariable String requestId) {
        var result = aiService.getBlueprintResult(requestId);

        // If result is null, it means logic is still processing
        if (result == null) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).build(); 
        }

        BlueprintItem item = AiMapper.toBlueprintItem(result);
        String message = result.isFallback()
                ? "Blueprint generated (fallback template)"
                : "Blueprint generated successfully";
        
        return ResponseEntity.ok(AiMapper.toBlueprintResponse(item, message));
    }

    /* ==================================================================================
     * SMART-ACTION: CONFIRMATION & CREATION
     * ================================================================================== */

    @PostMapping("/confirm-plan")
    @Operation(summary = "Confirm and save AI-generated blueprint (creates Activity + Session)")
    public ResponseEntity<ConfirmBlueprintResponse> confirmPlan(
            @RequestBody @Valid ConfirmBlueprintRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = getUserId(jwt);
        log.info("Confirming blueprint for userId={}, title='{}'", userId, request.activityTitle());

        var command = ConfirmBlueprintCommand.builder()
                .userId(userId)
                .activityTitle(request.activityTitle())
                .activityDescription(request.activityDescription())
                .focusMinutes(request.focusMinutes())
                .breakMinutes(request.breakMinutes())
                .firstSessionNote(request.firstSessionNote())
                .categoryId(request.categoryId())
                .build();

        var result = aiService.confirmBlueprint(command);
        ConfirmBlueprintItem item = AiMapper.toConfirmBlueprintItem(result);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AiMapper.toConfirmBlueprintResponse(item, "Activity created successfully"));
    }

    /* ==================================================================================
     * SMART-ACTION: QUICK FOCUS
     * ================================================================================== */

    @PostMapping("/quick-focus")
    @Operation(summary = "Start a Quick Focus session instantly (25m/5m)")
    public ResponseEntity<QuickFocusResponse> quickFocus(@AuthenticationPrincipal Jwt jwt) {
        Long userId = getUserId(jwt);
        log.info("Starting quick focus for userId={}", userId);

        var command = QuickFocusCommand.builder()
                .userId(userId)
                .build();

        var result = aiService.quickFocus(command);
        QuickFocusItem item = AiMapper.toQuickFocusItem(result);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AiMapper.toQuickFocusResponse(item, "Quick focus session created"));
    }
}