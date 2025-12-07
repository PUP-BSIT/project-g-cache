package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.session.*;
import com.pomodify.backend.application.service.SessionService;
import com.pomodify.backend.presentation.dto.item.SessionItem;
import com.pomodify.backend.presentation.dto.note.SessionNoteDto;
import com.pomodify.backend.presentation.dto.note.SessionTodoItemDto;
import com.pomodify.backend.presentation.dto.request.session.SessionRequest;
import com.pomodify.backend.presentation.dto.request.session.UpdateSessionRequest;
import com.pomodify.backend.presentation.dto.response.SessionResponse;
import com.pomodify.backend.presentation.mapper.SessionMapper;
import com.pomodify.backend.presentation.mapper.SessionNoteMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/activities/{activityId}/sessions")
@Tag(name = "Sessions", description = "Manage pomodoro sessions for an activity")
public class SessionController {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
            this.sessionService = sessionService;
    }

    // ───── CRUD Operations ─────

    @PostMapping
    @Operation(
        summary = "Create a new session",
        description = "Creates a pomodoro or freestyle session for the given activity, with optional long-break configuration.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Session created",
                content = @Content(schema = @Schema(implementation = SessionResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error")
        }
    )
    public ResponseEntity<SessionResponse> createSession(@PathVariable Long activityId,
                                    @RequestBody @Valid SessionRequest request,
                                    @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
    Long userId = requireUserId(jwt);
    CreateSessionCommand command = CreateSessionCommand.builder()
            .user(userId)
            .activityId(activityId)
            .sessionType(request.sessionType())
            .focusTimeInMinutes(request.focusTimeInMinutes())
            .breakTimeInMinutes(request.breakTimeInMinutes())
        .cycles(request.cycles())
        .enableLongBreak(request.enableLongBreak())
        .longBreakTimeInMinutes(request.longBreakTimeInMinutes())
        .longBreakIntervalInMinutes(request.longBreakIntervalInMinutes())
            .note(null)
            .build();
    SessionItem item = SessionMapper.toItem(sessionService.create(command));
    return ResponseEntity.status(HttpStatus.CREATED).body(SessionMapper.toResponse(item, "Session created successfully"));
    }

    @GetMapping
    @Operation(summary = "List sessions", description = "Returns all sessions for an activity, optionally filtered by status.")
        public ResponseEntity<SessionResponse> getAllSessions(@AuthenticationPrincipal Jwt jwt,
                                                            @PathVariable Long activityId,
                                                            @RequestParam(required = false) String status) {
        Long userId = requireUserId(jwt);
        List<SessionItem> items = SessionMapper.toItems(
                sessionService.getAll(GetSessionsCommand.builder()
                        .user(userId)
                        .activityId(activityId)
                        .status(status)
                        .build())
        );
        return ResponseEntity.ok(SessionMapper.toResponse(items, "Sessions retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get session", description = "Returns a single session by id for the given activity.")
    public ResponseEntity<SessionResponse> getSession(@AuthenticationPrincipal Jwt jwt,
                                @PathVariable Long activityId,
                                @PathVariable Long id) {
        Long userId = requireUserId(jwt);
            SessionItem item = SessionMapper.toItem(sessionService.get(GetSessionCommand.builder().user(userId).sessionId(id).build()));
            return ResponseEntity.ok(SessionMapper.toResponse(item, "Session retrieved successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete session", description = "Soft-deletes a session for the given activity.")
    public ResponseEntity<SessionResponse> deleteSession(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable Long activityId,
                                    @PathVariable Long id) {
        Long userId = requireUserId(jwt);
            sessionService.delete(DeleteSessionCommand.builder().user(userId).sessionId(id).build());
            return ResponseEntity.ok(new SessionResponse("Session deleted successfully", List.of(),0,0,0));
    }

    // ───── Lifecycle Operations ─────

    @PostMapping("/{id}/start")
    @Operation(summary = "Start session", description = "Starts a session and moves it into IN_PROGRESS state.")
    public ResponseEntity<SessionResponse> startSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.start(StartSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session started successfully"));
    }

    @PostMapping("/{id}/pause")
    @Operation(summary = "Pause session", description = "Pauses a running session and accumulates elapsed time.")
    public ResponseEntity<SessionResponse> pauseSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id,
                                                        @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.pause(PauseSessionCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session paused successfully"));
    }

    @PostMapping("/{id}/resume")
    @Operation(summary = "Resume session", description = "Resumes a paused session, continuing from accumulated elapsed time.")
    public ResponseEntity<SessionResponse> resumeSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.resume(ResumeSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session resumed successfully"));
    }

    @PostMapping("/{id}/stop")
    @Operation(summary = "Smart stop session", description = "Stops the current phase timer. If no cycles were completed and phase is FOCUS, returns to NOT_STARTED; otherwise PAUSED.")
    public ResponseEntity<SessionResponse> stopSession(@AuthenticationPrincipal Jwt jwt,
                                                    @PathVariable Long activityId,
                                                    @PathVariable Long id,
                                                    @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.stop(StopSessionCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session stopped successfully"));
    }
    
    @PostMapping("/{id}/skip")
    @Operation(summary = "Skip phase (freestyle)", description = "Skips to the next phase for FREESTYLE sessions. When skipping a BREAK, increments cyclesCompleted.")
    public ResponseEntity<SessionResponse> skipPhase(@AuthenticationPrincipal Jwt jwt,
                                                    @PathVariable Long activityId,
                                                    @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.skipPhase(SkipPhaseCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Phase skipped successfully"));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update session settings", description = "PATCH endpoint to update focus/break durations, cycles and long-break configuration.")
    public ResponseEntity<SessionResponse> updateSession(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable Long activityId,
                                                        @PathVariable Long id,
                                                        @RequestBody @Valid UpdateSessionRequest request) {
        Long userId = requireUserId(jwt);
        UpdateSessionCommand cmd = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(id)
                .sessionType(request.sessionType())
                .focusTimeInMinutes(request.focusTimeInMinutes())
                .breakTimeInMinutes(request.breakTimeInMinutes())
            .cycles(request.cycles())
            .enableLongBreak(request.enableLongBreak())
            .longBreakTimeInMinutes(request.longBreakTimeInMinutes())
            .longBreakIntervalInMinutes(request.longBreakIntervalInMinutes())
                .build();
        SessionItem item = SessionMapper.toItem(sessionService.updateSession(cmd));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Session updated successfully"));
    }

    @PostMapping("/{id}/complete-phase")
    @Operation(summary = "Complete current phase", description = "Marks the current phase as complete, transitions to the next phase (short or long break, or focus), and may complete the session.")
    public ResponseEntity<SessionResponse> completePhase(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable Long activityId,
                                    @PathVariable Long id,
                                                                                                                @RequestParam(required = false) String note) {
        Long userId = requireUserId(jwt);
            SessionItem item = SessionMapper.toItem(sessionService.completePhase(CompletePhaseCommand.builder().user(userId).sessionId(id).note(note).build()));
            notifyPhaseChange(id, item);
            String msg = "COMPLETED".equals(item.status()) ? "Session completed successfully" : "Phase completed: " + item.currentPhase();
            return ResponseEntity.ok(SessionMapper.toResponse(item, msg));
    }

    @GetMapping("/{id}/note")
    @Operation(summary = "Get session note", description = "Returns the note and checklist items for a session.")
    public ResponseEntity<SessionNoteDto> getNote(@AuthenticationPrincipal Jwt jwt,
                                                  @PathVariable Long activityId,
                                                  @PathVariable Long id) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.get(GetSessionCommand.builder().user(userId).sessionId(id).build()));
        return ResponseEntity.ok(item.note());
    }

    @PutMapping("/{id}/note")
    @Operation(summary = "Update session note", description = "Updates the note and checklist items attached to a session.")
    public ResponseEntity<SessionResponse> updateNote(@AuthenticationPrincipal Jwt jwt,
                                                      @PathVariable Long activityId,
                                                      @PathVariable Long id,
                                                      @RequestBody SessionNoteDto note) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.updateNote(UpdateSessionNoteCommand.builder().user(userId).sessionId(id).note(note).build()));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Note updated successfully"));
    }

    @PatchMapping("/{id}/note/items/{itemId}/toggle")
    @Operation(summary = "Toggle checklist item done", description = "Toggles the done state of a single checklist item.")
    public ResponseEntity<SessionResponse> toggleTodoItem(@AuthenticationPrincipal Jwt jwt,
                                                          @PathVariable Long activityId,
                                                          @PathVariable Long id,
                                                          @PathVariable Long itemId) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.toggleTodoItem(userId, id, itemId));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Checklist item toggled"));
    }

    @PatchMapping("/{id}/note/items/{itemId}")
    @Operation(summary = "Partially update checklist item", description = "Updates text, done, or orderIndex of a single checklist item.")
    public ResponseEntity<SessionResponse> patchTodoItem(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable Long activityId,
                                                         @PathVariable Long id,
                                                         @PathVariable Long itemId,
                                                         @RequestBody SessionTodoItemDto patch) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.patchTodoItem(userId, id, itemId, patch));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Checklist item updated"));
    }

    @DeleteMapping("/{id}/note/items/{itemId}")
    @Operation(summary = "Delete checklist item", description = "Removes a single checklist item from the note.")
    public ResponseEntity<SessionResponse> deleteTodoItem(@AuthenticationPrincipal Jwt jwt,
                                                          @PathVariable Long activityId,
                                                          @PathVariable Long id,
                                                          @PathVariable Long itemId) {
        Long userId = requireUserId(jwt);
        SessionItem item = SessionMapper.toItem(sessionService.deleteTodoItem(userId, id, itemId));
        return ResponseEntity.ok(SessionMapper.toResponse(item, "Checklist item deleted"));
    }

    // ───── Server-Sent Events (SSE) ─────

    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToSessionEvents(@PathVariable Long activityId,
                                            @PathVariable Long id) {
        log.info("Client subscribing to events for session: {}", id);

        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(id, emitter);

        emitter.onCompletion(() -> {
            log.info("SSE completed for session: {}", id);
            emitters.remove(id);
        });

        emitter.onTimeout(() -> {
            log.warn("SSE timeout for session: {}", id);
            emitters.remove(id);
        });

        emitter.onError((ex) -> {
            log.error("SSE error for session: {}", id, ex);
            emitters.remove(id);
        });

        // Send initial connection confirmation
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connected to session " + id + " events"));
        } catch (IOException e) {
            log.error("Error sending initial SSE event", e);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    private Long requireUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication token");
        }
        Object claim = jwt.getClaim("user");
        if (claim instanceof Integer i) {
            return i.longValue();
        }
        if (claim instanceof Long l) {
            return l;
        }
        if (claim instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException ignored) { }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token: missing user claim");
    }

    private void notifyPhaseChange(Long sessionId, SessionItem session) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter != null) {
            try {
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("sessionId", session.id());
                eventData.put("currentPhase", session.currentPhase());
                eventData.put("cyclesCompleted", session.cyclesCompleted());
                eventData.put("totalCycles", session.cycles());
                eventData.put("status", session.status());
                eventData.put("timestamp", LocalDateTime.now());

                emitter.send(SseEmitter.event()
                        .name("phase-change")
                        .data(eventData));

                log.info("SSE notification sent for session: {}", sessionId);
            } catch (IOException e) {
                log.error("Error sending SSE notification", e);
                emitter.completeWithError(e);
                emitters.remove(sessionId);
            }
        }
    }       
}